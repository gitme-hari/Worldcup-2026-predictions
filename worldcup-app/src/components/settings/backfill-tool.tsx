'use client'
import { useState, useEffect } from 'react'
import {
  getFixtures, getTeams, getResults, getLockedPredictions,
  getLockedPrediction, saveLockPrediction,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ClipboardList, Check, AlertTriangle } from 'lucide-react'
import { ScoreStepper } from '@/components/ui/score-stepper'

interface BackfillRow {
  fixtureId: string
  homeCode: string
  awayCode: string
  homeFlag: string
  awayFlag: string
  kickoff: string
  actualHome: number
  actualAway: number
}

interface RowState {
  homeGoals: number
  awayGoals: number
  note: string
  saved: boolean
  error: string | null
  confirmOverwrite: boolean
}

function defaultRowState(): RowState {
  return { homeGoals: 0, awayGoals: 0, note: '', saved: false, error: null, confirmOverwrite: false }
}

export function BackfillTool() {
  const [mounted, setMounted] = useState(false)
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures    = getFixtures()
  const teams       = getTeams()
  const results     = getResults()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const resultMap   = Object.fromEntries(results.map(r => [r.fixture_id, r]))
  const lockedPreds = getLockedPredictions()
  const lockedMap   = Object.fromEntries(lockedPreds.map(p => [p.fixture_id, p]))

  // Completed matches without a locked pick (the gap we're filling)
  const missingRows: BackfillRow[] = results.flatMap(r => {
    if (lockedMap[r.fixture_id] && !rowStates[r.fixture_id]?.confirmOverwrite) return []
    const fixture = fixtures.find(f => f.id === r.fixture_id)
    if (!fixture) return []
    const home = teamMap[fixture.home_team_id]
    const away = teamMap[fixture.away_team_id]
    if (!home || !away) return []
    // Only include if no locked pick exists (or user wants to overwrite)
    if (lockedMap[r.fixture_id]) return []
    return [{
      fixtureId: fixture.id,
      homeCode: home.code,
      awayCode: away.code,
      homeFlag: home.flag_url ?? '',
      awayFlag: away.flag_url ?? '',
      kickoff: fixture.kickoff_utc,
      actualHome: r.home_goals,
      actualAway: r.away_goals,
    }]
  }).sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  // Already backfilled this session
  const backfilledInSession = lockedPreds.filter(p => p.pick_source === 'backfilled')

  function getRow(fixtureId: string): RowState {
    return rowStates[fixtureId] ?? defaultRowState()
  }

  function setRow(fixtureId: string, patch: Partial<RowState>) {
    setRowStates(prev => ({
      ...prev,
      [fixtureId]: { ...(prev[fixtureId] ?? defaultRowState()), ...patch },
    }))
  }

  function save(row: BackfillRow) {
    const state = getRow(row.fixtureId)
    const h = state.homeGoals
    const a = state.awayGoals

    // Guard: warn if overwriting an existing lock
    const existing = getLockedPrediction(row.fixtureId)
    if (existing && !state.confirmOverwrite) {
      setRow(row.fixtureId, {
        error: `A locked pick (${existing.home_goals}–${existing.away_goals}) already exists. Confirm below to overwrite.`,
        confirmOverwrite: true,
      })
      return
    }

    const pick: Omit<LockedPrediction, 'locked_at'> = {
      fixture_id:      row.fixtureId,
      model:           'A',
      home_goals:      h,
      away_goals:      a,
      home_win_prob:   0,
      draw_prob:       0,
      away_win_prob:   0,
      pick_source:     'backfilled',
      override_reason: state.note.trim() || 'Backfilled historical pick',
    }
    saveLockPrediction(pick)
    setRow(row.fixtureId, { saved: true, error: null, confirmOverwrite: false })
    setShowSaved(true)
  }

  if (missingRows.length === 0 && backfilledInSession.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ClipboardList className="h-3.5 w-3.5 text-zinc-500" /> Historical Pick Backfill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">
            No completed matches are missing a locked pick. Everything is accounted for.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ClipboardList className="h-3.5 w-3.5 text-zinc-500" /> Historical Pick Backfill
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">
          Recovery tool for picks that were submitted elsewhere but did not sync.
          Backfilled picks count toward Pool Leaderboard and Analysis but are labelled separately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Warning banner */}
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
          <p>
            This is a manual recovery tool. Only use it for picks you genuinely submitted
            but that failed to sync. Backfilled picks are tagged and visible in Analysis.
          </p>
        </div>

        {/* Missing rows */}
        {missingRows.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500">{missingRows.length} completed match{missingRows.length !== 1 ? 'es' : ''} missing a pick:</p>
            {missingRows.map(row => {
              const state = getRow(row.fixtureId)
              if (state.saved) return null

              const date = new Date(row.kickoff).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })

              return (
                <div key={row.fixtureId} className="rounded-lg border border-zinc-100 p-3 space-y-3">
                  {/* Match header */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {row.homeFlag} {row.homeCode}
                        <span className="text-zinc-300 font-normal mx-1.5">vs</span>
                        {row.awayCode} {row.awayFlag}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {date} · Actual: <span className="font-semibold text-zinc-600">{row.actualHome}–{row.actualAway}</span>
                      </p>
                    </div>
                  </div>

                  {/* Score steppers */}
                  <div className="flex items-start gap-3">
                    <ScoreStepper
                      label={`${row.homeCode} goals`}
                      value={state.homeGoals}
                      onChange={v => setRow(row.fixtureId, { homeGoals: v, error: null })}
                    />
                    <div className="text-zinc-300 text-xl pt-7 shrink-0">–</div>
                    <ScoreStepper
                      label={`${row.awayCode} goals`}
                      value={state.awayGoals}
                      onChange={v => setRow(row.fixtureId, { awayGoals: v, error: null })}
                    />
                  </div>

                  {/* Optional note */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={state.note}
                      onChange={e => setRow(row.fixtureId, { note: e.target.value })}
                      placeholder="e.g. Submitted on mobile, didn't sync"
                      className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  {state.error && (
                    <p className="text-xs text-red-500">{state.error}</p>
                  )}

                  {/* Overwrite confirmation */}
                  {state.confirmOverwrite && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      This will overwrite your existing locked pick. Click Save again to confirm.
                    </div>
                  )}

                  <button
                    onClick={() => save(row)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> Save as Backfilled Pick
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-400">No missing picks remaining.</p>
        )}

        {/* Session backfills summary */}
        {showSaved && backfilledInSession.length > 0 && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold text-green-700">
              {backfilledInSession.length} backfilled pick{backfilledInSession.length !== 1 ? 's' : ''} saved
            </p>
            <p className="text-xs text-green-600">
              These are now included in Pool Leaderboard and Analysis, labelled as "backfilled".
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
