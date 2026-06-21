'use client'
import { useState } from 'react'
import {
  getLockedPrediction, saveLockPrediction, getPoolRecommendation, getPredictions,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import type { SeedFixture, SeedTeam, SeedPrediction } from '@/lib/seed-data'
import { CheckCircle, ChevronDown, ChevronUp, Lock, Edit3 } from 'lucide-react'
import { ScoreStepper } from '@/components/ui/score-stepper'
import { MODEL_TEXT_COLORS } from '@/lib/utils'

interface Props {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}

type Mode = 'idle' | 'customise'

const MODELS = ['A', 'B', 'C'] as const

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

const BERLIN_TZ = 'Europe/Berlin'
function berlinDateLabel(utc: string) {
  return new Date(utc).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ,
  }) + ' CEST'
}

function sourceLabel(src?: string) {
  if (src === 'pool_recommendation') return 'Pool pick'
  if (src === 'custom') return 'Custom'
  if (src === 'backfilled') return 'Backfilled'
  return 'Model pick'
}

export function FixturePredictionPanel({ fixture, home, away }: Props) {
  const poolRec    = getPoolRecommendation(fixture.id)
  const existingLP = getLockedPrediction(fixture.id)
  const allPreds   = getPredictions().filter(p => p.fixture_id === fixture.id)
  const predsByModel: Record<string, SeedPrediction | undefined> = Object.fromEntries(
    MODELS.map(m => [m, allPreds.find(p => p.model === m)])
  )

  const [locked, setLocked]         = useState<LockedPrediction | undefined>(existingLP)
  const [mode, setMode]             = useState<Mode>('idle')
  const [homeGoals, setHomeGoals]   = useState(poolRec?.recommended_home ?? 0)
  const [awayGoals, setAwayGoals]   = useState(poolRec?.recommended_away ?? 0)
  const [reason, setReason]         = useState('')
  const [reasonError, setReasonError] = useState(false)
  const [showModels, setShowModels] = useState(false)

  function lockPick(pick: Omit<LockedPrediction, 'locked_at'>) {
    saveLockPrediction(pick)
    setLocked({ ...pick, locked_at: new Date().toISOString() })
    setMode('idle')
  }

  function useRecommendation() {
    if (!poolRec) return
    const recPred = allPreds.find(p => p.model === poolRec.recommended_model) ?? allPreds[0]
    lockPick({
      fixture_id:      fixture.id,
      model:           poolRec.recommended_model,
      home_goals:      poolRec.recommended_home,
      away_goals:      poolRec.recommended_away,
      home_win_prob:   recPred?.home_win_prob ?? 0,
      draw_prob:       recPred?.draw_prob ?? 0,
      away_win_prob:   recPred?.away_win_prob ?? 0,
      pick_source:     'pool_recommendation',
      override_reason: 'Suggested pool pick based on pool-scoring optimisation.',
      pool_rec_home:   poolRec.recommended_home,
      pool_rec_away:   poolRec.recommended_away,
    })
  }

  function useModel(model: typeof MODELS[number]) {
    const pred = predsByModel[model]
    if (!pred) return
    const sl = topScoreline(pred.home_goals, pred.away_goals)
    lockPick({
      fixture_id:    fixture.id,
      model,
      home_goals:    sl.h,
      away_goals:    sl.a,
      home_win_prob: pred.home_win_prob ?? 0,
      draw_prob:     pred.draw_prob ?? 0,
      away_win_prob: pred.away_win_prob ?? 0,
      pick_source:   'raw',
      pool_rec_home: poolRec?.recommended_home,
      pool_rec_away: poolRec?.recommended_away,
    })
  }

  function lockCustom() {
    if (!reason.trim()) { setReasonError(true); return }
    const refPred = poolRec
      ? allPreds.find(p => p.model === poolRec.recommended_model) ?? allPreds[0]
      : allPreds[0]
    lockPick({
      fixture_id:      fixture.id,
      model:           poolRec?.recommended_model ?? refPred?.model ?? 'A',
      home_goals:      homeGoals,
      away_goals:      awayGoals,
      home_win_prob:   refPred?.home_win_prob ?? 0,
      draw_prob:       refPred?.draw_prob ?? 0,
      away_win_prob:   refPred?.away_win_prob ?? 0,
      pick_source:     'custom',
      override_reason: reason.trim(),
      pool_rec_home:   poolRec?.recommended_home,
      pool_rec_away:   poolRec?.recommended_away,
    })
  }

  // ── Locked state ──────────────────────────────────────────────────────────
  if (locked && mode === 'idle') {
    const rH = Math.round(locked.home_goals)
    const rA = Math.round(locked.away_goals)
    return (
      <div className="border-t border-zinc-100 bg-green-50 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <CheckCircle className="h-3 w-3" /> Locked
            </span>
            <span className="text-base font-black text-zinc-900 tabular-nums">{rH}–{rA}</span>
            <span className="text-xs text-zinc-500">{sourceLabel(locked.pick_source)}</span>
            {locked.model && <span className="text-xs text-zinc-400">· Mdl {locked.model}</span>}
          </div>
          <button
            onClick={() => {
              setHomeGoals(rH)
              setAwayGoals(rA)
              setReason(locked.override_reason ?? '')
              setMode('customise')
            }}
            className="shrink-0 flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-3 w-3" /> Change Pick
          </button>
        </div>
        {locked.pool_rec_home !== undefined && locked.home_goals !== locked.pool_rec_home && (
          <p className="text-xs text-zinc-400">Pool rec was {locked.pool_rec_home}–{locked.pool_rec_away}</p>
        )}
        {locked.override_reason && locked.pick_source === 'custom' && (
          <p className="text-xs text-zinc-400 italic">"{locked.override_reason}"</p>
        )}
      </div>
    )
  }

  // ── Idle / Customise state ────────────────────────────────────────────────
  return (
    <div className="border-t border-zinc-100 bg-white px-4 py-4 space-y-4">

      <p className="text-[10px] text-zinc-400">{berlinDateLabel(fixture.kickoff_utc)}</p>

      {/* Pool recommendation */}
      {poolRec ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Pool Recommendation · Model {poolRec.recommended_model}
          </p>
          <p className="text-2xl font-black text-blue-900 tabular-nums leading-none">
            {poolRec.recommended_home}–{poolRec.recommended_away}
          </p>
          {poolRec.recommendation_reason && (
            <p className="text-[10px] text-blue-500 mt-1">{poolRec.recommendation_reason}</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
          <p className="text-xs text-zinc-400">No pool recommendation — enter a custom score.</p>
        </div>
      )}

      {/* Action buttons: idle mode */}
      {mode === 'idle' && (
        <div className="flex flex-col gap-2">
          {poolRec && (
            <button
              onClick={useRecommendation}
              className="w-full flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" /> Use Pool Recommendation
            </button>
          )}
          {MODELS.map(m => {
            const pred = predsByModel[m]
            if (!pred) return null
            const sl = topScoreline(pred.home_goals, pred.away_goals)
            return (
              <button
                key={m}
                onClick={() => useModel(m)}
                className={`w-full flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors`}
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Use Model {m}</span>
                  <span className={`text-[10px] font-normal ${MODEL_TEXT_COLORS[m] ?? 'text-zinc-400'}`}>
                    ({MODEL_TEXT_COLORS[m] ? `Mdl ${m}` : m})
                  </span>
                </span>
                <span className="tabular-nums text-zinc-900">{sl.h}–{sl.a}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMode('customise')}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" /> Customise
          </button>
        </div>
      )}

      {/* Customise form */}
      {mode === 'customise' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <ScoreStepper
              label={`${home?.code ?? 'Home'} goals`}
              value={homeGoals}
              onChange={setHomeGoals}
            />
            <div className="text-zinc-300 text-xl pt-7 shrink-0">–</div>
            <ScoreStepper
              label={`${away?.code ?? 'Away'} goals`}
              value={awayGoals}
              onChange={setAwayGoals}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Reason for this pick <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setReasonError(false) }}
              placeholder="e.g. Backing the draw based on recent form"
              rows={2}
              className={`w-full resize-none rounded-md border px-3 py-2 text-sm text-zinc-800 focus:outline-none ${
                reasonError ? 'border-red-400 bg-red-50' : 'border-zinc-300 focus:border-blue-400'
              }`}
            />
            {reasonError && (
              <p className="text-xs text-red-500 mt-0.5">A reason is required to lock a custom pick.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={lockCustom}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" /> Lock Pick
            </button>
            <button
              onClick={() => { setMode('idle'); setReasonError(false) }}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ▼ Model predictions collapsible */}
      <div className="border-t border-zinc-100 pt-3">
        <button
          onClick={() => setShowModels(v => !v)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {showModels ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Model Predictions
        </button>
        {showModels && (
          <div className="mt-2 space-y-1">
            {MODELS.map(m => {
              const pred = predsByModel[m]
              if (!pred) return <p key={m} className="text-xs text-zinc-300">Model {m}: n/a</p>
              const sl = topScoreline(pred.home_goals, pred.away_goals)
              return (
                <div key={m} className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${MODEL_TEXT_COLORS[m] ?? 'text-zinc-500'}`}>Model {m}</span>
                  <span className="text-xs font-bold text-zinc-800 tabular-nums">{sl.h}–{sl.a}</span>
                  <span className="text-[10px] text-zinc-400">{pred.home_goals.toFixed(1)}–{pred.away_goals.toFixed(1)} xG</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
