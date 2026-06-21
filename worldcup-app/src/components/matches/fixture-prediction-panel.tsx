'use client'
import { useState } from 'react'
import {
  getLockedPrediction, saveLockPrediction, getPoolRecommendation, getPredictions,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'
import { CheckCircle, Edit3, Lock } from 'lucide-react'

interface Props {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}

type Mode = 'idle' | 'customise'

const BERLIN_TZ = 'Europe/Berlin'
function berlinDateLabel(utc: string) {
  return new Date(utc).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ,
  }) + ' CEST'
}

export function FixturePredictionPanel({ fixture, home, away }: Props) {
  const poolRec    = getPoolRecommendation(fixture.id)
  const existingLP = getLockedPrediction(fixture.id)

  const [locked, setLocked] = useState<LockedPrediction | undefined>(existingLP)
  const [mode, setMode]     = useState<Mode>('idle')
  const [homeGoals, setHomeGoals] = useState(poolRec?.recommended_home ?? 0)
  const [awayGoals, setAwayGoals] = useState(poolRec?.recommended_away ?? 0)
  const [reason, setReason]         = useState('')
  const [reasonError, setReasonError] = useState(false)

  const allPreds = getPredictions().filter(p => p.fixture_id === fixture.id)
  const recPred  = poolRec
    ? allPreds.find(p => p.model === poolRec.recommended_model) ?? allPreds[0]
    : allPreds[0]

  function useRecommendation() {
    if (!poolRec) return
    const pick: Omit<LockedPrediction, 'locked_at'> = {
      fixture_id:     fixture.id,
      model:          poolRec.recommended_model,
      home_goals:     poolRec.recommended_home,
      away_goals:     poolRec.recommended_away,
      home_win_prob:  recPred?.home_win_prob ?? 0,
      draw_prob:      recPred?.draw_prob ?? 0,
      away_win_prob:  recPred?.away_win_prob ?? 0,
      pick_source:    'custom',
      override_reason: 'Suggested pool pick based on pool-scoring optimisation.',
      pool_rec_home:  poolRec.recommended_home,
      pool_rec_away:  poolRec.recommended_away,
    }
    saveLockPrediction(pick)
    setLocked({ ...pick, locked_at: new Date().toISOString() })
  }

  function lockCustom() {
    if (!reason.trim()) { setReasonError(true); return }
    const pick: Omit<LockedPrediction, 'locked_at'> = {
      fixture_id:     fixture.id,
      model:          poolRec?.recommended_model ?? recPred?.model ?? 'A',
      home_goals:     homeGoals,
      away_goals:     awayGoals,
      home_win_prob:  recPred?.home_win_prob ?? 0,
      draw_prob:      recPred?.draw_prob ?? 0,
      away_win_prob:  recPred?.away_win_prob ?? 0,
      pick_source:    'custom',
      override_reason: reason.trim(),
      pool_rec_home:  poolRec?.recommended_home,
      pool_rec_away:  poolRec?.recommended_away,
    }
    saveLockPrediction(pick)
    setLocked({ ...pick, locked_at: new Date().toISOString() })
    setMode('idle')
  }

  // ── Locked state ────────────────────────────────────────────────────────────
  if (locked && mode === 'idle') {
    const isPoolPick = locked.override_reason === 'Suggested pool pick based on pool-scoring optimisation.'
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-900">
                {home?.flag_url} {home?.code ?? fixture.home_team_id}
                <span className="text-zinc-400 font-normal mx-1.5">vs</span>
                {away?.code ?? fixture.away_team_id} {away?.flag_url}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle className="h-3 w-3" /> Locked
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{berlinDateLabel(fixture.kickoff_utc)}</p>
          </div>
          <div className="text-3xl font-bold text-zinc-900 tabular-nums shrink-0">
            {locked.home_goals}–{locked.away_goals}
          </div>
        </div>

        <div className="rounded-md border border-green-100 bg-white px-3 py-2 text-xs space-y-0.5">
          <p className="text-zinc-500">
            {isPoolPick
              ? 'Accepted pool recommendation · Model ' + locked.model
              : 'Custom pick · Model ' + locked.model}
          </p>
          {locked.override_reason && !isPoolPick && (
            <p className="text-zinc-400">Reason: {locked.override_reason}</p>
          )}
          {locked.pool_rec_home !== undefined && locked.home_goals !== locked.pool_rec_home && (
            <p className="text-zinc-400">
              Pool rec was {locked.pool_rec_home}–{locked.pool_rec_away}
            </p>
          )}
        </div>

        <button onClick={() => {
          setHomeGoals(locked.home_goals)
          setAwayGoals(locked.away_goals)
          setReason(locked.override_reason ?? '')
          setMode('customise')
        }} className="text-xs text-blue-600 underline">
          Change pick →
        </button>
      </div>
    )
  }

  // ── Idle / Customise state ───────────────────────────────────────────────────
  return (
    <div className="rounded-lg border-2 border-blue-300 bg-white p-4 space-y-4 shadow-sm">

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-zinc-900">
          {home?.flag_url} {home?.code ?? fixture.home_team_id}
          <span className="text-zinc-400 font-normal mx-1.5">vs</span>
          {away?.code ?? fixture.away_team_id} {away?.flag_url}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{berlinDateLabel(fixture.kickoff_utc)}</p>
      </div>

      {/* Pool recommendation block */}
      {poolRec ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            Pool recommendation · Model {poolRec.recommended_model}
          </p>
          <p className="text-3xl font-bold text-blue-900 tabular-nums leading-none">
            {poolRec.recommended_home}–{poolRec.recommended_away}
          </p>
          <p className="text-xs text-blue-500 mt-1">{poolRec.recommendation_reason}</p>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs text-zinc-400">No pool recommendation available — enter a custom score.</p>
        </div>
      )}

      {/* Actions: Idle mode */}
      {mode === 'idle' && (
        <div className="flex gap-2">
          {poolRec && (
            <button
              onClick={useRecommendation}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" /> Use Recommendation
            </button>
          )}
          <button
            onClick={() => setMode('customise')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" /> Customise
          </button>
        </div>
      )}

      {/* Customise form */}
      {mode === 'customise' && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">{home?.code ?? 'Home'} goals</label>
              <input
                type="number" min={0} max={20}
                value={homeGoals}
                onChange={e => setHomeGoals(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-xl font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <span className="text-zinc-300 text-xl pb-2">–</span>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">{away?.code ?? 'Away'} goals</label>
              <input
                type="number" min={0} max={20}
                value={awayGoals}
                onChange={e => setAwayGoals(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-xl font-bold text-zinc-900 focus:border-blue-400 focus:outline-none"
              />
            </div>
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
    </div>
  )
}
