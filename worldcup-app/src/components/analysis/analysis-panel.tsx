'use client'
import { useState, useEffect } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPredictions, getHumanPredictions, computeHumanBiasData, computeCalibration, getConfig } from '@/lib/store'
import { getOutcome } from '@/lib/models'
import { formatDate, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, CheckCircle, XCircle, Brain, Zap, ChevronDown, ChevronUp, Crosshair } from 'lucide-react'
import { SyncErrorBanner } from '@/components/ui/sync-error-banner'
import { ModelHealth } from './model-health'
import { DisagreementAnalysis } from './disagreement-analysis'
import { UpcomingAssistant } from './upcoming-assistant'
import { DecisionEngine } from './decision-engine'
import { OverrideROI } from './override-roi'

const MODELS = ['A', 'B', 'C'] as const

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (predH === actH && predA === actA) return 4
  const predGD = predH - predA, actGD = actH - actA
  const predW = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW  = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && predGD === actGD) return 2
  if (predW === actW) return 1
  return 0
}

export function AnalysisPanel() {
  const [mounted, setMounted] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures     = getFixtures()
  const teams        = getTeams()
  const results      = getResults()
  const lockedPreds  = getLockedPredictions()
  const allPreds     = getPredictions()
  const humanPredsList = getHumanPredictions()
  const calibration  = computeCalibration()
  const teamMap      = Object.fromEntries(teams.map(t => [t.id, t]))

  // ── Per-match comparison ──────────────────────────────────────────────────
  const comparisons = results.flatMap(result => {
    const fixture = fixtures.find(f => f.id === result.fixture_id)
    if (!fixture) return []
    const home = teamMap[fixture.home_team_id]
    const away = teamMap[fixture.away_team_id]
    if (!home || !away) return []
    const locked = lockedPreds.find(p => p.fixture_id === result.fixture_id)
    const actualOutcome = getOutcome(result.home_goals, result.away_goals)

    const modelData = Object.fromEntries(MODELS.map(m => {
      const pred = allPreds.find(p => p.fixture_id === result.fixture_id && p.model === m)
      if (!pred) return [m, null]
      return [m, {
        predHome: pred.home_goals,
        predAway: pred.away_goals,
        outcomeCorrect: getOutcome(pred.home_goals, pred.away_goals) === actualOutcome,
        goalErr: Math.abs(pred.home_goals - result.home_goals) + Math.abs(pred.away_goals - result.away_goals),
      }]
    }))

    return [{
      fixtureId: fixture.id, date: fixture.kickoff_utc,
      homeTeam: home, awayTeam: away, group: fixture.group ?? '',
      lockedModel: locked?.model ?? null,
      actual: { home: result.home_goals, away: result.away_goals },
      models: modelData,
    }]
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Pool score breakdown from locked predictions ──────────────────────────
  const scoredPicks = lockedPreds.flatMap(lp => {
    const result = results.find(r => r.fixture_id === lp.fixture_id)
    if (!result) return []
    const rH = Math.round(lp.home_goals)
    const rA = Math.round(lp.away_goals)
    const pts = poolScore(rH, rA, result.home_goals, result.away_goals)
    const goalDeltaH = rH - result.home_goals
    const goalDeltaA = rA - result.away_goals
    return [{ pts, goalDeltaH, goalDeltaA }]
  })
  const totalScoredPicks = scoredPicks.length
  const exact    = scoredPicks.filter(p => p.pts === 4).length
  const winnerGD = scoredPicks.filter(p => p.pts === 2).length
  const winner   = scoredPicks.filter(p => p.pts === 1).length
  const wrong    = scoredPicks.filter(p => p.pts === 0).length
  const avgPts   = totalScoredPicks > 0
    ? scoredPicks.reduce((s, p) => s + p.pts, 0) / totalScoredPicks : 0
  const avgGoalBiasH = totalScoredPicks > 0
    ? scoredPicks.reduce((s, p) => s + p.goalDeltaH, 0) / totalScoredPicks : 0
  const avgGoalBiasA = totalScoredPicks > 0
    ? scoredPicks.reduce((s, p) => s + p.goalDeltaA, 0) / totalScoredPicks : 0

  // ── Model leaderboard ─────────────────────────────────────────────────────
  const leaderboard = MODELS.map(m => {
    const entries = comparisons.map(c => c.models[m]).filter(Boolean)
    const correct = entries.filter(e => e!.outcomeCorrect).length
    return {
      model: m,
      matches: entries.length,
      correct,
      accuracy: entries.length > 0 ? correct / entries.length : 0,
      avgGoalErr: entries.length > 0 ? entries.reduce((s, e) => s + e!.goalErr, 0) / entries.length : 0,
    }
  }).sort((a, b) => b.accuracy - a.accuracy || a.avgGoalErr - b.avgGoalErr)

  const bestModel = leaderboard[0]?.accuracy > 0 ? leaderboard[0].model : null

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No analysable data yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Go to Matches → lock a prediction → enter the actual score. Analysis will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <SyncErrorBanner />

      {/* ── 1. Pool Performance ──────────────────────────────────────────────── */}
      {(() => {
        const activeModel = (getConfig().active_model ?? 'A') as 'A' | 'B' | 'C'
        const pending = humanPredsList.filter(hp => !results.find(r => r.fixture_id === hp.fixture_id))

        type OverrideRow = {
          fixtureId: string; homeTeam: typeof teamMap[string]; awayTeam: typeof teamMap[string]
          origHome: number; origAway: number; modelKey: string; noLock: boolean
          humanHome: number; humanAway: number
          actualHome: number; actualAway: number
          humanCorrect: boolean; modelCorrect: boolean
        }
        const completedRows: OverrideRow[] = humanPredsList.flatMap(hp => {
          const result = results.find(r => r.fixture_id === hp.fixture_id)
          if (!result) return []
          const fixture = fixtures.find(f => f.id === hp.fixture_id)
          if (!fixture) return []
          const home = teamMap[fixture.home_team_id]
          const away = teamMap[fixture.away_team_id]
          if (!home || !away) return []
          const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
          const modelKey = (locked?.model as 'A' | 'B' | 'C' | undefined) || activeModel
          const origPred = allPreds.find(p => p.fixture_id === hp.fixture_id && p.model === modelKey)
          if (!origPred) return []
          const actualOutcome = getOutcome(result.home_goals, result.away_goals)
          return [{ fixtureId: fixture.id, homeTeam: home, awayTeam: away,
            origHome: origPred.home_goals, origAway: origPred.away_goals, modelKey, noLock: !locked,
            humanHome: hp.home_goals, humanAway: hp.away_goals,
            actualHome: result.home_goals, actualAway: result.away_goals,
            humanCorrect: getOutcome(hp.home_goals, hp.away_goals) === actualOutcome,
            modelCorrect: getOutcome(origPred.home_goals, origPred.away_goals) === actualOutcome,
          }]
        })

        const youCorrect  = completedRows.filter(r => r.humanCorrect).length
        const modelCorrect = completedRows.filter(r => r.modelCorrect).length
        const youBeat     = completedRows.filter(r => r.humanCorrect && !r.modelCorrect).length
        const modelBeat   = completedRows.filter(r => r.modelCorrect && !r.humanCorrect).length
        const bothWrong   = completedRows.filter(r => !r.humanCorrect && !r.modelCorrect).length
        const fallbackCount = completedRows.filter(r => r.noLock).length

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-500" /> Pool Performance
              </CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Your picks vs engine baseline. Pending matches excluded.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-zinc-50 px-2 py-2">
                  <div className="text-xs text-zinc-400">Picks</div>
                  <div className="text-xl font-bold text-zinc-700">{humanPredsList.length}</div>
                </div>
                <div className="rounded-lg bg-zinc-50 px-2 py-2">
                  <div className="text-xs text-zinc-400">Completed</div>
                  <div className="text-xl font-bold text-zinc-700">{completedRows.length}</div>
                </div>
                <div className="rounded-lg bg-blue-50 px-2 py-2">
                  <div className="text-xs text-blue-500">You correct</div>
                  <div className="text-xl font-bold text-blue-700">{youCorrect}</div>
                </div>
                <div className="rounded-lg bg-zinc-50 px-2 py-2">
                  <div className="text-xs text-zinc-400">Engine correct</div>
                  <div className="text-xl font-bold text-zinc-700">{modelCorrect}</div>
                </div>
              </div>
              {completedRows.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded bg-green-50 px-2 py-1.5">
                    <div className="text-green-600 font-semibold">{youBeat}</div>
                    <div className="text-green-700">You beat engine</div>
                  </div>
                  <div className="rounded bg-zinc-50 px-2 py-1.5">
                    <div className="text-zinc-600 font-semibold">{modelBeat}</div>
                    <div className="text-zinc-500">Engine beat you</div>
                  </div>
                  <div className="rounded bg-red-50 px-2 py-1.5">
                    <div className="text-red-500 font-semibold">{bothWrong}</div>
                    <div className="text-red-600">Both wrong</div>
                  </div>
                </div>
              )}
              {fallbackCount > 0 && (
                <p className="text-xs text-amber-600">
                  {fallbackCount} match{fallbackCount > 1 ? 'es' : ''}: no lock found — used Model {activeModel} as baseline.
                </p>
              )}
              {pending.length > 0 && (
                <p className="text-xs text-zinc-400">{pending.length} override{pending.length > 1 ? 's' : ''} pending result — not counted above.</p>
              )}
              {completedRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50">
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Engine pred</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">You</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Winner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedRows.map(row => {
                        const whoWon = row.humanCorrect && row.modelCorrect ? 'both' : row.humanCorrect ? 'you' : row.modelCorrect ? 'model' : 'neither'
                        return (
                          <tr key={row.fixtureId} className="border-b border-zinc-50">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {row.homeTeam.flag_url} {row.homeTeam.code} <span className="text-zinc-300">v</span> {row.awayTeam.code} {row.awayTeam.flag_url}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-zinc-500">
                              {row.origHome.toFixed(1)}–{row.origAway.toFixed(1)}
                              {row.noLock && <span className="ml-1 text-amber-400 text-[10px]">~{row.modelKey}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-600">{row.humanHome}–{row.humanAway}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">{row.actualHome}–{row.actualAway}</td>
                            <td className="px-3 py-2.5 text-center">
                              {whoWon === 'both'    && <Badge variant="outline" className="text-green-600 border-green-300">Both</Badge>}
                              {whoWon === 'you'     && <Badge variant="outline" className="text-blue-600 border-blue-300">You ⚡</Badge>}
                              {whoWon === 'model'   && <Badge variant="outline" className="text-zinc-600">Engine</Badge>}
                              {whoWon === 'neither' && <Badge variant="outline" className="text-red-500 border-red-200">Neither</Badge>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* ── 2. Exact Score Diagnosis ─────────────────────────────────────────── */}
      {totalScoredPicks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-zinc-500" /> Exact Score Diagnosis
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">Pool point breakdown across {totalScoredPicks} completed locked pick{totalScoredPicks !== 1 ? 's' : ''}.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Distribution bars */}
            <div className="space-y-2">
              {[
                { pts: 4, count: exact,    label: '4 pts · Exact',      bar: 'bg-green-500' },
                { pts: 2, count: winnerGD, label: '2 pts · Winner + GD', bar: 'bg-blue-400' },
                { pts: 1, count: winner,   label: '1 pt  · Winner',      bar: 'bg-amber-400' },
                { pts: 0, count: wrong,    label: '0 pts · Missed',      bar: 'bg-red-400'  },
              ].map(({ pts, count, label, bar }) => (
                <div key={pts} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <span className="text-xs text-zinc-600">{label}</span>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar} transition-all`}
                      style={{ width: totalScoredPicks > 0 ? `${(count / totalScoredPicks) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-xs font-semibold text-zinc-700">{count}</span>
                    <span className="text-[10px] text-zinc-400 ml-1">({Math.round((count / totalScoredPicks) * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-zinc-400">Avg pts / match</p>
                <p className={`text-xl font-black tabular-nums ${avgPts >= 2 ? 'text-green-700' : avgPts >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                  {avgPts.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-zinc-400">Home goal bias</p>
                <p className={`text-xl font-black tabular-nums ${Math.abs(avgGoalBiasH) < 0.3 ? 'text-green-700' : 'text-amber-600'}`}>
                  {avgGoalBiasH >= 0 ? '+' : ''}{avgGoalBiasH.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-zinc-400">Away goal bias</p>
                <p className={`text-xl font-black tabular-nums ${Math.abs(avgGoalBiasA) < 0.3 ? 'text-green-700' : 'text-amber-600'}`}>
                  {avgGoalBiasA >= 0 ? '+' : ''}{avgGoalBiasA.toFixed(2)}
                </p>
              </div>
            </div>
            {(Math.abs(avgGoalBiasH) >= 0.3 || Math.abs(avgGoalBiasA) >= 0.3) && (
              <p className="text-[10px] text-amber-600">
                Goal bias detected — you{avgGoalBiasH > 0 ? ' over' : ' under'}-predict home goals by {Math.abs(avgGoalBiasH).toFixed(2)}/match.
                Consider adjusting custom picks.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 4. Override ROI ──────────────────────────────────────────────────── */}
      <OverrideROI />

      {/* ── 5. Upcoming Risk Review ──────────────────────────────────────────── */}
      <UpcomingAssistant />

      {/* ── 6. Model Debugging (collapsed by default) ────────────────────────── */}
      <Card>
        <button
          onClick={() => setShowDebug(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-sm font-semibold text-zinc-700">Model Debugging</span>
            <span className="text-xs text-zinc-400">— Model A/B/C diagnostics, leaderboard, raw match data</span>
          </div>
          {showDebug ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>

        {showDebug && (
          <div className="border-t border-zinc-100 space-y-4 px-0 py-4">

            {/* Decision Engine */}
            <div className="px-4">
              <DecisionEngine />
            </div>

            <ModelHealth />
            <DisagreementAnalysis />

            {/* Model Leaderboard */}
            <div>
              <div className="px-4 pb-2">
                <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Model Leaderboard
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">All 3 models scored against every played match.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Rank</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Model</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Matches</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Correct</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Accuracy</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Avg Goal Err</th>
                      <th className="px-4 py-2 text-center font-medium text-zinc-500">Calibration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((s, i) => {
                      const cal = calibration.find(c => c.model === s.model)
                      const isLocked = comparisons.some(c => c.lockedModel === s.model)
                      return (
                        <tr key={s.model} className={`border-b border-zinc-50 ${i === 0 && s.accuracy > 0 ? 'bg-green-50' : ''}`}>
                          <td className="px-4 py-2.5 font-bold text-zinc-400">#{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[s.model]}`}>
                                {MODEL_LABELS[s.model]}
                              </span>
                              {i === 0 && s.accuracy > 0 && <span className="text-xs text-green-600 font-medium">Best</span>}
                              {isLocked && <span className="text-xs text-zinc-400">← your choice</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-zinc-700">{s.matches}</td>
                          <td className="px-4 py-2.5 text-center text-zinc-700">{s.correct}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-zinc-900">{Math.round(s.accuracy * 100)}%</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={s.avgGoalErr <= 1.5 ? 'text-green-600 font-medium' : s.avgGoalErr <= 2.5 ? 'text-yellow-600' : 'text-red-500'}>
                              {s.avgGoalErr.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-zinc-500">
                            {cal && cal.matchCount >= 3
                              ? `H×${cal.homeScale.toFixed(2)} A×${cal.awayScale.toFixed(2)}`
                              : <span className="text-zinc-300">need 3+</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {bestModel && (
                <div className="mx-4 mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  💡 Best performer: {MODEL_LABELS[bestModel]} — leading on accuracy across {comparisons.length} played matches.
                </div>
              )}
            </div>

            {/* All models vs actual */}
            <div>
              <div className="px-4 pb-2">
                <p className="text-sm font-semibold text-zinc-700">All Models vs Actual</p>
                <p className="text-xs text-zinc-400 mt-0.5">Your locked model highlighted. ✓/✗ = outcome correct.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                      {MODELS.map(m => (
                        <th key={m} className="px-3 py-2 text-center font-medium text-zinc-500">{MODEL_LABELS[m]}</th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map(row => (
                      <tr key={row.fixtureId} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <span>{row.homeTeam.flag_url}</span>
                            <span className="font-medium text-zinc-900">{row.homeTeam.code}</span>
                            <span className="text-zinc-300">v</span>
                            <span className="font-medium text-zinc-900">{row.awayTeam.code}</span>
                            <span>{row.awayTeam.flag_url}</span>
                          </div>
                          <div className="text-zinc-400 mt-0.5">{formatDate(row.date)} · Grp {row.group}</div>
                        </td>
                        {MODELS.map(m => {
                          const d = row.models[m]
                          const isLocked = row.lockedModel === m
                          return (
                            <td key={m} className={`px-3 py-2.5 text-center ${isLocked ? 'bg-blue-50' : ''}`}>
                              {d ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`font-mono font-semibold ${isLocked ? 'text-blue-700' : 'text-zinc-500'}`}>
                                    {d.predHome.toFixed(1)}–{d.predAway.toFixed(1)}
                                  </span>
                                  <span>
                                    {d.outcomeCorrect
                                      ? <CheckCircle className="h-3 w-3 text-green-500 inline" />
                                      : <XCircle className="h-3 w-3 text-red-400 inline" />}
                                    {isLocked && <span className="ml-0.5 text-blue-400 text-xs">●</span>}
                                  </span>
                                </div>
                              ) : <span className="text-zinc-300">—</span>}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">
                          {row.actual.home}–{row.actual.away}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Human Override Learning */}
            {humanPredsList.length > 0 && (() => {
              const biasData = computeHumanBiasData()
              const completedCount = humanPredsList.filter(hp => results.find(r => r.fixture_id === hp.fixture_id)).length
              const showable = biasData.filter(b => b.qualified)

              return (
                <div className="px-4 space-y-3">
                  <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-indigo-500" /> Human Override Learning
                  </p>
                  {completedCount < 3 ? (
                    <div className="rounded-md bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
                      <p className="font-medium text-zinc-700 mb-1">Need more completed custom overrides</p>
                      <p>{completedCount} of 3 required. Learning activates at 3 total completed overrides.</p>
                    </div>
                  ) : showable.length === 0 ? (
                    <div className="rounded-md bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
                      <p>Each team needs 2+ overrides to show a trend.{' '}
                        {biasData.length > 0 && `Current: ${biasData.map(b => `${b.teamId.toUpperCase()} (${b.samples})`).join(', ')}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {showable.map(({ teamId, avg, samples, confidence }) => {
                        const team = teamMap[teamId]
                        return (
                          <div key={teamId} className="flex items-center gap-3">
                            <span className="text-sm">{team?.flag_url}</span>
                            <span className="text-xs font-medium text-zinc-900 w-24 truncate">{team?.name ?? teamId}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                              <div className={`h-full rounded-full ${avg > 0 ? 'bg-blue-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(100, Math.abs(avg) * 50)}%`, marginLeft: avg < 0 ? 'auto' : undefined }} />
                            </div>
                            <span className={`text-xs font-semibold tabular-nums w-16 text-right ${avg > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                              {avg > 0 ? '+' : ''}{avg.toFixed(2)}
                            </span>
                            <span className={`text-xs w-20 text-right ${confidence === 'reliable' ? 'text-zinc-500' : 'text-amber-500'}`}>
                              {samples} pick{samples > 1 ? 's' : ''} · {confidence}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <details className="border-t border-zinc-100 pt-3">
                    <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                      All overrides ({humanPredsList.length}) — click to inspect
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50">
                            <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                            <th className="px-3 py-2 text-center font-medium text-zinc-500">Engine pred</th>
                            <th className="px-3 py-2 text-center font-medium text-zinc-500">Your pick</th>
                            <th className="px-3 py-2 text-center font-medium text-zinc-500">Δ goals</th>
                            <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                            <th className="px-3 py-2 text-left font-medium text-zinc-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {humanPredsList.map(hp => {
                            const fixture = fixtures.find(f => f.id === hp.fixture_id)
                            if (!fixture) return null
                            const home = teamMap[fixture.home_team_id]
                            const away = teamMap[fixture.away_team_id]
                            const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
                            const hasModel = locked && locked.model
                            const origPred = hasModel
                              ? allPreds.find(p => p.fixture_id === hp.fixture_id && p.model === (locked.model as 'A' | 'B' | 'C'))
                              : null
                            const result = results.find(r => r.fixture_id === hp.fixture_id)
                            const dH = origPred ? hp.home_goals - origPred.home_goals : null
                            const dA = origPred ? hp.away_goals - origPred.away_goals : null
                            type Reason = 'resolved' | 'no locked prediction found' | 'model missing' | 'seed prediction missing'
                            const reason: Reason = !locked ? 'no locked prediction found'
                              : !hasModel ? 'model missing'
                              : !origPred ? 'seed prediction missing'
                              : 'resolved'
                            return (
                              <tr key={hp.fixture_id} className={`border-b border-zinc-50 ${reason !== 'resolved' ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {home?.flag_url} {home?.code} v {away?.code} {away?.flag_url}
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-zinc-400">
                                  {origPred ? `${origPred.home_goals.toFixed(1)}–${origPred.away_goals.toFixed(1)}` : <span className="text-zinc-300">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-semibold text-blue-600">
                                  {hp.home_goals}–{hp.away_goals}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {dH != null && dA != null ? (
                                    <span className={dH + dA > 0 ? 'text-blue-500' : dH + dA < 0 ? 'text-red-500' : 'text-zinc-400'}>
                                      {dH >= 0 ? '+' : ''}{dH.toFixed(1)} / {dA >= 0 ? '+' : ''}{dA.toFixed(1)}
                                    </span>
                                  ) : <span className="text-zinc-300">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-zinc-900">
                                  {result ? `${result.home_goals}–${result.away_goals}` : <span className="text-zinc-300">pending</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {reason === 'resolved'
                                    ? <span className="text-green-600">resolved</span>
                                    : <span className="text-amber-600">{reason}</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              )
            })()}
          </div>
        )}
      </Card>
    </div>
  )
}
