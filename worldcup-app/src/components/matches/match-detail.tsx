'use client'
import { useState, useEffect } from 'react'
import {
  getFixture, getTeam, getPredictions, getResult,
  getLockedPrediction, getPoolRecommendation, saveLockPrediction, getConfig,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import { computeHybrid } from '@/lib/models'
import { formatDate, formatTime, pct, MODEL_LABELS, MODEL_TEXT_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, Lock, Edit3 } from 'lucide-react'
import Link from 'next/link'
import { ScoreStepper } from '@/components/ui/score-stepper'

type ModelKey = 'A' | 'B' | 'C' | 'hybrid'
type ActionMode = 'idle' | 'customise'

const BERLIN_TZ = 'Europe/Berlin'

function berlinLabel(utc: string) {
  const d = new Date(utc)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: BERLIN_TZ,
  }) + ' · ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ,
  }) + ' CEST'
}

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function topScoreline(hl: number, al: number): { h: number; a: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (p > best.p) best = { h, a, p }
    }
  return { h: best.h, a: best.a }
}

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (predH === actH && predA === actA) return 4
  const predGD = predH - predA, actGD = actH - actA
  const predW = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW  = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && predGD === actGD) return 2
  if (predW === actW) return 1
  return 0
}

function sourceLabel(s: string | undefined): string {
  if (s === 'pool_recommendation') return 'Pool recommendation'
  if (s === 'custom') return 'Custom override'
  if (s === 'calibrated') return 'Calibrated pick'
  return 'Model pick'
}

function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-14 text-right font-semibold text-blue-600">{pct(home)}</span>
        <div className="h-2 flex-1 flex rounded-full overflow-hidden bg-zinc-100">
          <div className="h-full bg-blue-500" style={{ width: `${home * 100}%` }} />
          <div className="h-full bg-zinc-300" style={{ width: `${draw * 100}%` }} />
          <div className="h-full bg-red-400" style={{ width: `${away * 100}%` }} />
        </div>
        <span className="w-14 font-semibold text-red-500">{pct(away)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="w-14 text-right">Home</span>
        <div className="flex-1 text-center">{pct(draw)} Draw</div>
        <span className="w-14">Away</span>
      </div>
    </div>
  )
}

export function MatchDetail({ fixtureId }: { fixtureId: string }) {
  const [mounted, setMounted]             = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelKey>('A')
  const [mode, setMode]                   = useState<ActionMode>('idle')
  const [lockedPick, setLockedPick]       = useState<LockedPrediction | undefined>(undefined)
  const [customH, setCustomH]             = useState(0)
  const [customA, setCustomA]             = useState(0)
  const [reason, setReason]               = useState('')
  const [reasonError, setReasonError]     = useState(false)

  useEffect(() => {
    const config = getConfig()
    const active = config.active_model as ModelKey
    setSelectedModel(active === 'hybrid' ? 'hybrid' : active)
    setLockedPick(getLockedPrediction(fixtureId))
    setMounted(true)
  }, [fixtureId])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixture = getFixture(fixtureId)
  if (!fixture) return <div className="p-4 text-sm text-zinc-400">Match not found.</div>

  const home    = getTeam(fixture.home_team_id)
  const away    = getTeam(fixture.away_team_id)
  const result  = getResult(fixtureId)
  const poolRec = getPoolRecommendation(fixtureId)
  const preds   = getPredictions()
  const config  = getConfig()

  const getModelPred = (m: ModelKey) =>
    m === 'hybrid'
      ? computeHybrid(preds as any, fixtureId, { a: config.weight_a, b: config.weight_b, c: config.weight_c })
      : preds.find(p => p.fixture_id === fixtureId && p.model === m) ?? null

  const selectedPred = getModelPred(selectedModel)

  function lock(h: number, a: number, source: LockedPrediction['pick_source'], r?: string) {
    const basePred = selectedPred ?? preds.find(p => p.fixture_id === fixtureId)
    const pick: Omit<LockedPrediction, 'locked_at'> = {
      fixture_id:      fixtureId,
      model:           selectedModel,
      home_goals:      h,
      away_goals:      a,
      home_win_prob:   basePred?.home_win_prob ?? 0,
      draw_prob:       basePred?.draw_prob ?? 0,
      away_win_prob:   basePred?.away_win_prob ?? 0,
      pick_source:     source,
      override_reason: r,
      pool_rec_home:   poolRec?.recommended_home,
      pool_rec_away:   poolRec?.recommended_away,
    }
    saveLockPrediction(pick)
    setLockedPick({ ...pick, locked_at: new Date().toISOString() })
    setMode('idle')
  }

  function startCustomise(prefillH: number, prefillA: number) {
    setCustomH(prefillH)
    setCustomA(prefillA)
    setReason('')
    setReasonError(false)
    setMode('customise')
  }

  const isPlayed = !!result

  // ── Lock status banner ───────────────────────────────────────────────────
  let lockBanner: React.ReactNode = null
  if (isPlayed && result) {
    const myPts = lockedPick
      ? poolScore(lockedPick.home_goals, lockedPick.away_goals, result.home_goals, result.away_goals)
      : null
    lockBanner = (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="success">Final</Badge>
          <span className="text-xl font-black text-zinc-900">{result.home_goals}–{result.away_goals}</span>
        </div>
        {lockedPick ? (
          <p className="text-xs text-zinc-500">
            My pick: <span className="font-medium text-zinc-700">{lockedPick.home_goals}–{lockedPick.away_goals}</span>
            {myPts !== null && (
              <span className={`ml-2 font-semibold ${myPts >= 4 ? 'text-green-600' : myPts >= 2 ? 'text-blue-600' : myPts === 1 ? 'text-zinc-600' : 'text-red-500'}`}>
                · {myPts} pt{myPts !== 1 ? 's' : ''}
                {myPts === 4 ? ' · Exact!' : myPts === 2 ? ' · Correct winner + GD' : myPts === 1 ? ' · Correct winner' : ' · Wrong'}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">No pick submitted for this match.</p>
        )}
      </div>
    )
  } else if (lockedPick && mode === 'idle') {
    lockBanner = (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <CheckCircle className="h-4 w-4" /> Locked ✓
          </span>
          <span className="text-2xl font-black text-zinc-900 tabular-nums">
            {lockedPick.home_goals}–{lockedPick.away_goals}
          </span>
        </div>
        <div className="text-xs text-zinc-500 space-y-0.5">
          <p>{sourceLabel(lockedPick.pick_source)}</p>
          {lockedPick.override_reason &&
            lockedPick.pick_source !== 'pool_recommendation' && (
            <p>Reason: {lockedPick.override_reason}</p>
          )}
          {lockedPick.pool_rec_home !== undefined &&
            (lockedPick.home_goals !== lockedPick.pool_rec_home || lockedPick.away_goals !== lockedPick.pool_rec_away) && (
            <p className="text-zinc-400">Pool rec was {lockedPick.pool_rec_home}–{lockedPick.pool_rec_away}</p>
          )}
        </div>
        <button
          onClick={() => startCustomise(lockedPick.home_goals, lockedPick.away_goals)}
          className="text-xs text-blue-600 underline"
        >
          Change pick →
        </button>
      </div>
    )
  } else if (!lockedPick && mode === 'idle') {
    lockBanner = (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-700">Needs Pick</p>
        <p className="text-xs text-amber-600 mt-0.5">Choose an action below to lock your prediction for this match.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link href="/matches" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to matches
      </Link>

      {/* Match header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-3xl">{home?.flag_url}</span>
              <span className="text-sm font-bold text-zinc-900 text-center">{home?.name}</span>
              <span className="text-xs text-zinc-400">{home?.code}</span>
            </div>
            <div className="text-center shrink-0">
              <div className="text-sm font-bold text-zinc-400">VS</div>
              <div className="text-xs text-zinc-400 mt-1">{berlinLabel(fixture.kickoff_utc)}</div>
              {fixture.group && (
                <div className="mt-1 text-xs text-zinc-400">Group {fixture.group} · MD{fixture.matchday}</div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-3xl">{away?.flag_url}</span>
              <span className="text-sm font-bold text-zinc-900 text-center">{away?.name}</span>
              <span className="text-xs text-zinc-400">{away?.code}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lock status */}
      {lockBanner}

      {/* Pool recommendation */}
      {poolRec && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            Pool recommendation · Model {poolRec.recommended_model}
          </p>
          <p className="text-3xl font-black text-blue-900 tabular-nums leading-none">
            {poolRec.recommended_home}–{poolRec.recommended_away}
          </p>
          <p className="text-xs text-blue-500 mt-1">{poolRec.recommendation_reason}</p>
        </div>
      )}

      {/* Model selector + prediction */}
      {!isPlayed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Model Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model selector pills */}
            <div className="flex gap-1.5 flex-wrap">
              {(['A', 'B', 'C', 'hybrid'] as ModelKey[]).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedModel === m
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {MODEL_LABELS[m] ?? 'Hybrid'}
                </button>
              ))}
            </div>

            {/* Selected model detail */}
            {selectedPred ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${MODEL_TEXT_COLORS[selectedModel] ?? 'text-zinc-600'}`}>
                    {MODEL_LABELS[selectedModel] ?? 'Hybrid'} prediction
                  </span>
                  <span className="text-xl font-bold text-zinc-900 tabular-nums">
                    {topScoreline(selectedPred.home_goals, selectedPred.away_goals).h}–{topScoreline(selectedPred.home_goals, selectedPred.away_goals).a}
                  </span>
                </div>
                <ProbBar home={selectedPred.home_win_prob} draw={selectedPred.draw_prob} away={selectedPred.away_win_prob} />
                <p className="text-xs text-zinc-400">
                  Expected goals: {selectedPred.home_goals.toFixed(2)} – {selectedPred.away_goals.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No prediction available for this model.</p>
            )}

            {/* All models quick reference */}
            <details>
              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                All models at a glance
              </summary>
              <div className="mt-2 space-y-1.5">
                {(['A', 'B', 'C', 'hybrid'] as ModelKey[]).map(m => {
                  const p = getModelPred(m)
                  if (!p) return null
                  const sl = topScoreline(p.home_goals, p.away_goals)
                  return (
                    <div key={m} className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
                      <span className={`font-semibold w-14 ${MODEL_TEXT_COLORS[m] ?? 'text-zinc-600'}`}>
                        {MODEL_LABELS[m] ?? 'Hybrid'}
                      </span>
                      <span className="font-mono font-bold text-zinc-800 tabular-nums">{sl.h}–{sl.a}</span>
                      <span className="text-zinc-400 flex-1">
                        H {pct(p.home_win_prob)} · D {pct(p.draw_prob)} · A {pct(p.away_win_prob)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isPlayed && mode === 'idle' && (
        <div className="space-y-2">
          {poolRec && (
            <button
              onClick={() => lock(poolRec.recommended_home, poolRec.recommended_away, 'pool_recommendation',
                'Suggested pool pick based on pool-scoring optimisation.')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Lock className="h-4 w-4" /> Use Pool Recommendation ({poolRec.recommended_home}–{poolRec.recommended_away})
            </button>
          )}
          {selectedPred && (() => {
            const sl = topScoreline(selectedPred.home_goals, selectedPred.away_goals)
            return (
              <button
                onClick={() => lock(sl.h, sl.a, 'raw')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Lock className="h-4 w-4" /> Use {MODEL_LABELS[selectedModel] ?? 'Selected Model'} ({sl.h}–{sl.a})
              </button>
            )
          })()}
          <button
            onClick={() => {
              const sl = selectedPred ? topScoreline(selectedPred.home_goals, selectedPred.away_goals) : { h: 0, a: 0 }
              startCustomise(sl.h, sl.a)
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-4 w-4" /> Customise
          </button>
        </div>
      )}

      {/* Customise form */}
      {!isPlayed && mode === 'customise' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Custom Pick</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <ScoreStepper
                label={`${home?.code ?? 'Home'} goals`}
                value={customH}
                onChange={setCustomH}
              />
              <div className="text-zinc-300 text-xl pt-7 shrink-0">–</div>
              <ScoreStepper
                label={`${away?.code ?? 'Away'} goals`}
                value={customA}
                onChange={setCustomA}
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Reason for this pick <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => { setReason(e.target.value); setReasonError(false) }}
                placeholder="e.g. Backing the upset based on recent form"
                rows={2}
                className={`w-full resize-none rounded-md border px-3 py-2 text-sm text-zinc-800 focus:outline-none ${
                  reasonError ? 'border-red-400 bg-red-50' : 'border-zinc-300 focus:border-blue-400'
                }`}
              />
              {reasonError && <p className="text-xs text-red-500 mt-0.5">A reason is required to lock a custom pick.</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!reason.trim()) { setReasonError(true); return }
                  lock(customH, customA, 'custom', reason.trim())
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" /> Lock Pick
              </button>
              <button
                onClick={() => { setMode('idle'); setReasonError(false) }}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
