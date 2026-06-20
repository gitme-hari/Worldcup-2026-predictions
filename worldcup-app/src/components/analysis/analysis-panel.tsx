'use client'
import { useState, useEffect } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPredictions, getHumanPredictions, computeHumanBiasData, computeCalibration } from '@/lib/store'
import { getOutcome } from '@/lib/models'
import { formatDate, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, CheckCircle, XCircle, Brain, Zap } from 'lucide-react'
import { SyncErrorBanner } from '@/components/ui/sync-error-banner'
import { ModelHealth } from './model-health'
import { DisagreementAnalysis } from './disagreement-analysis'
import { UpcomingAssistant } from './upcoming-assistant'

const MODELS = ['A', 'B', 'C'] as const

export function AnalysisPanel() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams = getTeams()
  const results = getResults()
  const lockedPreds = getLockedPredictions()
  const allPreds = getPredictions()
  const humanPredsList = getHumanPredictions()
  const calibration = computeCalibration()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  // ── Per-match comparison: all 3 models vs actual ────────────────────────────
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
      fixtureId: fixture.id,
      date: fixture.kickoff_utc,
      homeTeam: home,
      awayTeam: away,
      group: fixture.group ?? '',
      lockedModel: locked?.model ?? null,
      actual: { home: result.home_goals, away: result.away_goals },
      models: modelData,
    }]
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Model leaderboard across ALL played matches ──────────────────────────────
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
            Go to Results → lock a prediction → enter the actual score. Analysis will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <SyncErrorBanner />

      <ModelHealth />
      <DisagreementAnalysis />
      <UpcomingAssistant />

      {/* Model Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Model Leaderboard
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">All 3 models scored against every played match — pick the best one for knockouts.</p>
        </CardHeader>
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
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-600">
            💡 <strong>Recommendation for knockouts:</strong> Use{' '}
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[bestModel]}`}>
              {MODEL_LABELS[bestModel]}
            </span>
            {' '}— leading on accuracy across {comparisons.length} played matches.
          </div>
        )}
      </Card>

      {/* Match-by-match: all models side by side */}
      <Card>
        <CardHeader>
          <CardTitle>All Models vs Actual</CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">Your locked model is highlighted. ✓/✗ = outcome correct.</p>
        </CardHeader>
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
      </Card>

      {/* You vs The Model */}
      {(() => {
        const humanRows = humanPredsList.flatMap(hp => {
          const result = results.find(r => r.fixture_id === hp.fixture_id)
          if (!result) return []
          const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
          if (!locked) return []
          const fixture = fixtures.find(f => f.id === hp.fixture_id)
          if (!fixture) return []
          const home = teamMap[fixture.home_team_id]
          const away = teamMap[fixture.away_team_id]
          if (!home || !away) return []
          const actualOutcome = getOutcome(result.home_goals, result.away_goals)
          return [{
            fixtureId: fixture.id,
            date: fixture.kickoff_utc,
            homeTeam: home, awayTeam: away,
            modelHome: locked.home_goals, modelAway: locked.away_goals,
            humanHome: hp.home_goals, humanAway: hp.away_goals,
            comment: hp.comment,
            actualHome: result.home_goals, actualAway: result.away_goals,
            humanCorrect: getOutcome(hp.home_goals, hp.away_goals) === actualOutcome,
            modelCorrect: getOutcome(locked.home_goals, locked.away_goals) === actualOutcome,
          }]
        })
        if (humanRows.length === 0) return null
        const humanAcc = Math.round((humanRows.filter(r => r.humanCorrect).length / humanRows.length) * 100)
        const modelAcc = Math.round((humanRows.filter(r => r.modelCorrect).length / humanRows.length) * 100)
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-blue-500" />You vs The Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-center">
                  <div className="text-xs text-blue-500">You</div>
                  <div className="text-2xl font-bold text-blue-700">{humanAcc}%</div>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center">
                  <div className="text-xs text-zinc-400">Model</div>
                  <div className="text-2xl font-bold text-zinc-700">{modelAcc}%</div>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center">
                  <div className="text-xs text-zinc-400">Overrides</div>
                  <div className="text-2xl font-bold text-zinc-700">{humanRows.length}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                      <th className="px-3 py-2 text-center font-medium text-zinc-500">Model</th>
                      <th className="px-3 py-2 text-center font-medium text-zinc-500">You</th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Comment</th>
                      <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                      <th className="px-3 py-2 text-center font-medium text-zinc-500">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {humanRows.map(row => {
                      const whoWon = row.humanCorrect && row.modelCorrect ? 'both' : row.humanCorrect ? 'you' : row.modelCorrect ? 'model' : 'neither'
                      return (
                        <tr key={row.fixtureId} className="border-b border-zinc-50">
                          <td className="px-3 py-2.5">
                            <span>{row.homeTeam.flag_url}</span> {row.homeTeam.code} <span className="text-zinc-300">v</span> {row.awayTeam.code} <span>{row.awayTeam.flag_url}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-zinc-500">{row.modelHome.toFixed(1)}–{row.modelAway.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-600">{row.humanHome}–{row.humanAway}</td>
                          <td className="px-3 py-2.5 text-zinc-500 max-w-[120px] truncate">{row.comment || <span className="italic text-zinc-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">{row.actualHome}–{row.actualAway}</td>
                          <td className="px-3 py-2.5 text-center">
                            {whoWon === 'both' && <Badge variant="outline" className="text-green-600 border-green-300">Both</Badge>}
                            {whoWon === 'you' && <Badge variant="outline" className="text-blue-600 border-blue-300">You ⚡</Badge>}
                            {whoWon === 'model' && <Badge variant="outline" className="text-zinc-600">Model</Badge>}
                            {whoWon === 'neither' && <Badge variant="outline" className="text-red-500 border-red-200">Neither</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* What the model learned from you (Model D) */}
      {humanPredsList.length > 0 && (() => {
        const biasData = computeHumanBiasData()
        const qualified = biasData.filter(b => b.qualified)
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-indigo-500" />What the model learned (Model D)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {qualified.length === 0 ? (
                <div className="rounded-md bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
                  <p className="font-medium text-zinc-700 mb-1">Not enough data yet</p>
                  <p>Model D requires at least 3 custom overrides per team to compute a reliable bias.{' '}
                  {biasData.length === 0
                    ? 'No overrides recorded yet.'
                    : `Current samples: ${biasData.map(b => `${b.teamId.toUpperCase()} (${b.samples})`).join(', ')}.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Per-team goal adjustments vs original model prediction. Min 3 overrides required.</p>
                  {qualified.map(({ teamId, avg, samples }) => {
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
                          {avg > 0 ? '+' : ''}{avg.toFixed(2)} goals
                        </span>
                        <span className="text-xs text-zinc-400 w-12 text-right">{samples} picks</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Debug table: all custom overrides with original model prediction */}
              <details className="border-t border-zinc-100 pt-3">
                <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                  All custom overrides ({humanPredsList.length}) — click to inspect
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50">
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Model pred</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Your pick</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Δ goals</th>
                        <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {humanPredsList.map(hp => {
                        const fixture = fixtures.find(f => f.id === hp.fixture_id)
                        if (!fixture) return null
                        const home = teamMap[fixture.home_team_id]
                        const away = teamMap[fixture.away_team_id]
                        const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
                        const origPred = locked
                          ? allPreds.find(p => p.fixture_id === hp.fixture_id && p.model === locked.model)
                          : null
                        const result = results.find(r => r.fixture_id === hp.fixture_id)
                        const dH = origPred ? hp.home_goals - origPred.home_goals : null
                        const dA = origPred ? hp.away_goals - origPred.away_goals : null
                        return (
                          <tr key={hp.fixture_id} className="border-b border-zinc-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              {home?.flag_url} {home?.code} v {away?.code} {away?.flag_url}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-zinc-400">
                              {origPred ? `${origPred.home_goals.toFixed(1)}–${origPred.away_goals.toFixed(1)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-semibold text-blue-600">
                              {hp.home_goals}–{hp.away_goals}
                            </td>
                            <td className="px-3 py-2 text-center font-mono">
                              {dH !== null && dA !== null ? (
                                <span className={dH + dA > 0 ? 'text-blue-500' : dH + dA < 0 ? 'text-red-500' : 'text-zinc-400'}>
                                  {dH >= 0 ? '+' : ''}{dH.toFixed(1)} / {dA >= 0 ? '+' : ''}{dA.toFixed(1)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-zinc-900">
                              {result ? `${result.home_goals}–${result.away_goals}` : <span className="text-zinc-300">pending</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
