'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getFixtures, getTeams, getResult, saveResult, deleteResult,
  getPredictions, getLockedPrediction, saveLockPrediction, deleteLockedPrediction,
  getHumanPrediction, saveHumanPrediction, computeCalibration,
} from '@/lib/store'
import { engineScore } from '@/lib/models'
import { formatDate, formatTime, goalsDisplay } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Trash2, CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react'
import type { SeedFixture } from '@/lib/seed-data'
import type { ModelKey } from '@/lib/types'
import { SyncErrorBanner } from '@/components/ui/sync-error-banner'

const MODEL_OPTIONS: { value: ModelKey; label: string }[] = [
  { value: 'A', label: 'Poisson' },
  { value: 'B', label: 'ML' },
  { value: 'C', label: 'Live Intelligence' },
  { value: 'D', label: 'Human' },
  { value: 'hybrid', label: 'Hybrid' },
]

function ConfirmDialog({
  homeTeam, awayTeam, homeGoals, awayGoals,
  onConfirm, onCancel,
}: {
  homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Confirm result</p>
            <p className="text-xs text-zinc-500 mt-1">
              Save <span className="font-semibold">{homeTeam} {homeGoals} – {awayGoals} {awayTeam}</span>?
              This will lock the prediction for analysis. The model cannot be changed after saving.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={onConfirm}>Yes, save result</Button>
        </div>
      </div>
    </div>
  )
}

function ScoreStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, value - 1))}
        className="h-7 w-7 rounded border border-zinc-300 text-sm font-bold text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200">−</button>
      <span className="w-6 text-center text-sm font-bold tabular-nums text-zinc-900">{value}</span>
      <button onClick={() => onChange(Math.min(20, value + 1))}
        className="h-7 w-7 rounded border border-zinc-300 text-sm font-bold text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200">+</button>
    </div>
  )
}

type PickSource = 'raw' | 'calibrated' | 'custom'

function PickSheet({ homeTeam, awayTeam, rawHome, rawAway, calHome, calAway, onConfirm, onCancel }: {
  homeTeam: string; awayTeam: string
  rawHome: number; rawAway: number
  calHome: number | null; calAway: number | null
  onConfirm: (homeGoals: number, awayGoals: number, source: PickSource, comment: string) => void
  onCancel: () => void
}) {
  const [pick, setPick] = useState<PickSource>(calHome !== null ? 'calibrated' : 'raw')
  const [customHome, setCustomHome] = useState(Math.round(rawHome))
  const [customAway, setCustomAway] = useState(Math.round(rawAway))
  const [comment, setComment] = useState('')

  const options: { value: PickSource; label: string; sub: string; home: number; away: number; available: boolean }[] = [
    { value: 'raw', label: 'Raw prediction', sub: 'Direct model output', home: rawHome, away: rawAway, available: true },
    { value: 'calibrated', label: 'Calibrated', sub: 'Adjusted from past results', home: calHome ?? 0, away: calAway ?? 0, available: calHome !== null },
    { value: 'custom', label: 'Custom', sub: 'Your own scoreline', home: customHome, away: customAway, available: true },
  ]

  const selected = options.find(o => o.value === pick)!

  function handleConfirm() {
    const h = pick === 'custom' ? customHome : Math.round(selected.home)
    const a = pick === 'custom' ? customAway : Math.round(selected.away)
    onConfirm(h, a, pick, comment)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-zinc-900 mb-1">Choose your scoreline</p>
        <p className="text-xs text-zinc-500 mb-4">{homeTeam} vs {awayTeam}</p>
        <div className="space-y-2 mb-3">
          {options.filter(o => o.available).map(opt => (
            <label key={opt.value} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${pick === opt.value ? 'border-blue-400 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
              <div className="flex items-center gap-2.5">
                <input type="radio" name="pick" value={opt.value} checked={pick === opt.value} onChange={() => setPick(opt.value)} className="accent-blue-500" />
                <div>
                  <div className="text-xs font-medium text-zinc-700">{opt.label}</div>
                  <div className="text-xs text-zinc-400">{opt.sub}</div>
                </div>
              </div>
              {opt.value === 'custom' && pick === 'custom' ? (
                <div className="flex items-center gap-1.5">
                  <ScoreStepper value={customHome} onChange={setCustomHome} />
                  <span className="text-zinc-400 text-sm">–</span>
                  <ScoreStepper value={customAway} onChange={setCustomAway} />
                </div>
              ) : (
                <span className="font-mono font-bold text-zinc-800 text-sm">
                  {Math.round(opt.home)} – {Math.round(opt.away)}
                  <span className="ml-1 text-xs font-normal text-zinc-400">({opt.home.toFixed(1)}–{opt.away.toFixed(1)})</span>
                </span>
              )}
            </label>
          ))}
        </div>
        {pick === 'custom' && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Why are you going with a different score?"
            rows={2}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none resize-none mb-3"
          />
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Cancel</button>
          <button onClick={handleConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Lock this pick</button>
        </div>
      </div>
    </div>
  )
}

// ─── ResultRow reads persistence state directly from localStorage every render ─
// No React state for "saved" or "locked" — these are derived from localStorage
// so they can never get out of sync after navigation.
function ResultRow({
  fixture,
  homeTeam,
  awayTeam,
  onResultChange,
}: {
  fixture: SeedFixture
  homeTeam: { name: string; code: string; flag_url: string } | undefined
  awayTeam: { name: string; code: string; flag_url: string } | undefined
  onResultChange: () => void   // tells parent to re-render so counts update
}) {
  const predictions = getPredictions()

  // ── Derive persistent state directly from localStorage every render ──────
  const existing   = getResult(fixture.id)           // ActualResult | undefined
  const locked     = getLockedPrediction(fixture.id) // LockedPrediction | undefined
  const humanExist = getHumanPrediction(fixture.id)  // HumanPrediction | undefined

  const isSaved  = !!existing
  const isLocked = !!locked || isSaved  // once saved, always treat as locked

  // ── Local UI-only state (inputs, dialogs) ────────────────────────────────
  const [selectedModel, setSelectedModel] = useState<ModelKey>(
    (locked?.model as ModelKey) ?? 'A'
  )
  const [homeActual, setHomeActual] = useState(existing?.home_goals ?? 0)
  const [awayActual, setAwayActual] = useState(existing?.away_goals ?? 0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPickSheet, setShowPickSheet] = useState(false)

  // Engine-native score: average of all models, or specific model if selected
  const modelPred = predictions.find(p => p.fixture_id === fixture.id && p.model === selectedModel)
  const engineAvg = engineScore(predictions, fixture.id)
  const livePred = modelPred ?? (engineAvg ? {
    home_goals: engineAvg.home, away_goals: engineAvg.away,
    home_win_prob: 0.33, draw_prob: 0.33, away_win_prob: 0.33,
  } : null)
  const displayPred = locked ?? livePred

  const calibration = computeCalibration()
  const modelCal = calibration.find(c => c.model === (locked?.model ?? selectedModel))
  const calPred = modelCal && modelCal.matchCount >= 3 && displayPred ? {
    home_goals: Math.round(displayPred.home_goals * modelCal.homeScale * 10) / 10,
    away_goals: Math.round(displayPred.away_goals * modelCal.awayScale * 10) / 10,
  } : null

  const handleLock = useCallback(() => {
    if (!livePred) return
    setShowPickSheet(true)
  }, [livePred])

  const handlePickConfirm = useCallback((homeGoals: number, awayGoals: number, source: PickSource, comment: string) => {
    if (!livePred) return
    saveLockPrediction({
      fixture_id: fixture.id,
      model: selectedModel,
      home_goals: homeGoals,
      away_goals: awayGoals,
      home_win_prob: livePred.home_win_prob,
      draw_prob: livePred.draw_prob,
      away_win_prob: livePred.away_win_prob,
      pick_source: source,
    })
    if (source === 'custom') {
      saveHumanPrediction({ fixture_id: fixture.id, home_goals: homeGoals, away_goals: awayGoals, comment })
    }
    setShowPickSheet(false)
    onResultChange()
  }, [fixture.id, selectedModel, livePred, onResultChange])

  const handleUnlock = () => {
    deleteLockedPrediction(fixture.id)
    onResultChange()
  }

  const commitSave = useCallback(() => {
    // Auto-lock if not already locked
    if (!locked && livePred) {
      saveLockPrediction({
        fixture_id: fixture.id,
        model: selectedModel,
        home_goals: livePred.home_goals,
        away_goals: livePred.away_goals,
        home_win_prob: livePred.home_win_prob,
        draw_prob: livePred.draw_prob,
        away_win_prob: livePred.away_win_prob,
        pick_source: 'raw',
      })
    }

    saveResult({ fixture_id: fixture.id, home_goals: homeActual, away_goals: awayActual })
    setShowConfirm(false)
    onResultChange()
  }, [homeActual, awayActual, locked, livePred, selectedModel, fixture.id, onResultChange])

  const handleDeleteResult = () => {
    if (!window.confirm('Delete this result? The prediction lock will also be removed.')) return
    deleteResult(fixture.id)
    deleteLockedPrediction(fixture.id)
    setHomeActual(0)
    setAwayActual(0)
    onResultChange()
  }

  const ENGINE_LABELS: Record<string, string> = {
    A: 'Poisson', B: 'ML', C: 'Live', D: 'Human', hybrid: 'Hybrid',
  }
  const ENGINE_COLORS: Record<string, string> = {
    A: 'bg-blue-500', B: 'bg-purple-500', C: 'bg-green-500', D: 'bg-indigo-500', hybrid: 'bg-orange-500',
  }
  const activeModel = (locked?.model ?? selectedModel) as ModelKey
  const modelColor  = ENGINE_COLORS[activeModel] ?? 'bg-zinc-500'

  // Outcome helpers
  const outcome = (hg: number, ag: number) => hg > ag ? 'H' : ag > hg ? 'A' : 'D'

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          homeTeam={homeTeam?.name ?? ''}
          awayTeam={awayTeam?.name ?? ''}
          homeGoals={homeActual}
          awayGoals={awayActual}
          onConfirm={commitSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {showPickSheet && livePred && (
        <PickSheet
          homeTeam={homeTeam?.name ?? ''}
          awayTeam={awayTeam?.name ?? ''}
          rawHome={livePred.home_goals}
          rawAway={livePred.away_goals}
          calHome={calPred?.home_goals ?? null}
          calAway={calPred?.away_goals ?? null}
          onConfirm={handlePickConfirm}
          onCancel={() => setShowPickSheet(false)}
        />
      )}
      <div className={`border-b border-zinc-100 px-4 py-3 last:border-0 transition-colors ${isSaved ? 'bg-green-50/50' : ''}`}>
        {/* Match header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-zinc-400 shrink-0">{formatDate(fixture.kickoff_utc)} {formatTime(fixture.kickoff_utc)}</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span>{homeTeam?.flag_url}</span>
            <span className="text-xs font-semibold text-zinc-900">{homeTeam?.name}</span>
            <span className="text-xs text-zinc-400">vs</span>
            <span className="text-xs font-semibold text-zinc-900">{awayTeam?.name}</span>
            <span>{awayTeam?.flag_url}</span>
          </div>
          {fixture.group && <Badge variant="outline">Grp {fixture.group}</Badge>}
          {isSaved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {/* Prediction + result row */}
        <div className="flex flex-wrap items-end gap-3">

          {/* Model */}
          <div className="shrink-0">
            <div className="text-xs text-zinc-400 mb-1">Model</div>
            {isLocked ? (
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white ${modelColor} ${isSaved ? 'opacity-60' : ''}`}>
                  <Lock className="h-2.5 w-2.5" />
                  {ENGINE_LABELS[activeModel] ?? activeModel}
                </span>
                {!isSaved && (
                  <button onClick={handleUnlock} className="text-zinc-300 hover:text-zinc-500" title="Unlock model">
                    <Unlock className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value as ModelKey)}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
              >
                {MODEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Model predicted score */}
          <div className="shrink-0">
            <div className="text-xs text-zinc-400 mb-1">Model predicted</div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
              {isSaved && existing ? (
                <>
                  <span className={`text-sm font-bold ${outcome(displayPred?.home_goals ?? 0, displayPred?.away_goals ?? 0) === outcome(existing.home_goals, existing.away_goals) ? 'text-zinc-700' : 'text-zinc-400 line-through'}`}>
                    {displayPred ? `${goalsDisplay(displayPred.home_goals)} – ${goalsDisplay(displayPred.away_goals)}` : '—'}
                  </span>
                  {displayPred && (outcome(displayPred.home_goals, displayPred.away_goals) === outcome(existing.home_goals, existing.away_goals)
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400" />)}
                </>
              ) : (
                <>
                  <span className={`text-sm font-bold ${isLocked ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {displayPred ? `${goalsDisplay(displayPred.home_goals)} – ${goalsDisplay(displayPred.away_goals)}` : '—'}
                  </span>
                  {!isLocked && livePred && (
                    <button onClick={handleLock} className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900">
                      <Lock className="h-3 w-3" /> Lock
                    </button>
                  )}
                </>
              )}
              </div>
              {locked?.pick_source && locked.pick_source !== 'raw' && (
                <div className="text-xs text-blue-500 font-medium">
                  {locked.pick_source === 'calibrated' ? '↑ calibrated pick'
                    : locked.pick_source === 'pool_recommendation' ? '↑ pool pick'
                    : locked.pick_source === 'backfilled' ? '↑ backfilled'
                    : '↑ custom pick'}
                </div>
              )}
              {!locked && calPred && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <span className="text-zinc-400">Cal:</span>
                  <span className="font-medium">{goalsDisplay(calPred.home_goals)} – {goalsDisplay(calPred.away_goals)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Human override column */}
          {(isLocked || isSaved) && (
            <div className="shrink-0">
              <div className="text-xs text-zinc-400 mb-1">Your prediction</div>
              {isSaved ? (
                humanExist ? (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold text-blue-600 ${existing && outcome(humanExist.home_goals, humanExist.away_goals) !== outcome(existing.home_goals, existing.away_goals) ? 'line-through opacity-50' : ''}`}>
                      {humanExist.home_goals} – {humanExist.away_goals}
                    </span>
                    <Zap className="h-3.5 w-3.5 text-blue-400" aria-label="Human override" />
                    {existing && (outcome(humanExist.home_goals, humanExist.away_goals) === outcome(existing.home_goals, existing.away_goals)
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      : <XCircle className="h-3.5 w-3.5 text-red-400" />)}
                    {humanExist.comment && (
                      <span className="ml-1 text-xs text-zinc-400 italic truncate max-w-32" title={humanExist.comment}>"{humanExist.comment}"</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">Accepted model</span>
                )
              ) : (
                <span className="text-xs text-zinc-400 italic">—</span>
              )}
            </div>
          )}

          <div className="text-zinc-200 text-lg shrink-0 hidden sm:block">│</div>

          {/* Actual result */}
          <div className="shrink-0">
            <div className="text-xs text-zinc-400 mb-1">Actual result</div>
            {isSaved && existing ? (
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-2.5 py-1 text-sm font-bold text-green-800 tabular-nums">
                  {existing.home_goals} – {existing.away_goals}
                </span>
                <span className="text-xs text-zinc-400">final</span>
                <button onClick={handleDeleteResult} className="text-zinc-400 hover:text-red-500 active:text-red-600 p-1" title="Delete result">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ScoreStepper value={homeActual} onChange={setHomeActual} />
                <span className="text-zinc-400 text-sm">–</span>
                <ScoreStepper value={awayActual} onChange={setAwayActual} />
                <Button size="sm" variant="primary" onClick={() => setShowConfirm(true)}>Save</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── ResultsEntry: owns a single render-counter to force re-reads from localStorage
export function ResultsEntry() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'entered'>('all')
  const [groupFilter, setGroupFilter] = useState('All')
  // Incrementing this forces all ResultRow children to re-render and re-read localStorage
  const [rev, setRev] = useState(0)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handler = () => setRev(r => r + 1)
    window.addEventListener('supabase-sync-complete', handler)
    return () => window.removeEventListener('supabase-sync-complete', handler)
  }, [])

  const handleResultChange = useCallback(() => setRev(r => r + 1), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))

  let filtered = fixtures
    .filter(f => f.stage === 'group')
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  if (groupFilter !== 'All') filtered = filtered.filter(f => f.group === groupFilter)
  if (filter === 'pending')  filtered = filtered.filter(f => !getResult(f.id))
  if (filter === 'entered')  filtered = filtered.filter(f => !!getResult(f.id))

  const allResults = fixtures.filter(f => getResult(f.id)).length

  return (
    <div className="space-y-4">
      <SyncErrorBanner />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded border border-zinc-200 p-0.5">
          {(['all', 'pending', 'entered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none"
        >
          {['All', ...'ABCDEFGHIJKL'.split('')].map(g => (
            <option key={g} value={g}>{g === 'All' ? 'All Groups' : `Group ${g}`}</option>
          ))}
        </select>
        <span className="text-xs font-medium text-zinc-600">{allResults} / 72 results saved</span>
      </div>

      <div className="text-xs text-zinc-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Select a model → click <strong>Lock</strong> to freeze before kickoff → enter the actual score and <strong>Save</strong>. Results persist in your browser. Saving feeds the <strong>Performance</strong> page.
      </div>

      {/* Hidden span forces re-render when rev changes, ensuring fresh localStorage reads */}
      <span className="hidden" aria-hidden>{rev}</span>

      <Card>
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">No matches match filter</p>
        ) : filtered.map(f => (
          <ResultRow
            key={f.id}
            fixture={f}
            homeTeam={teamMap[f.home_team_id]}
            awayTeam={teamMap[f.away_team_id]}
            onResultChange={handleResultChange}
          />
        ))}
      </Card>
    </div>
  )
}
