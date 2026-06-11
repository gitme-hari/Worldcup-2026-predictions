'use client'
import { useState, useEffect } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions } from '@/lib/store'
import { getOutcome } from '@/lib/models'
import { formatDate, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, CheckCircle, XCircle, Minus } from 'lucide-react'

interface MatchAnalysis {
  fixtureId: string
  date: string
  homeTeam: { name: string; code: string; flag_url: string }
  awayTeam: { name: string; code: string; flag_url: string }
  group: string
  model: string
  predHome: number
  predAway: number
  actualHome: number
  actualAway: number
  outcomeCorrect: boolean
  homeGoalErr: number
  awayGoalErr: number
  totalGoalErr: number
}

interface ModelSummary {
  model: string
  matches: number
  correct: number
  accuracy: number
  avgGoalErr: number
}

export function AnalysisPanel() {
  const [mounted, setMounted] = useState(false)
  const [modelFilter, setModelFilter] = useState('all')
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams = getTeams()
  const results = getResults()
  const lockedPreds = getLockedPredictions()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  // Build per-match analysis rows (only matches with both a result AND a locked prediction)
  const rows: MatchAnalysis[] = []
  for (const result of results) {
    const fixture = fixtures.find(f => f.id === result.fixture_id)
    if (!fixture) continue
    const locked = lockedPreds.find(p => p.fixture_id === result.fixture_id)
    if (!locked) continue

    const home = teamMap[fixture.home_team_id]
    const away = teamMap[fixture.away_team_id]
    if (!home || !away) continue

    const predOutcome = getOutcome(locked.home_goals, locked.away_goals)
    const actualOutcome = getOutcome(result.home_goals, result.away_goals)

    rows.push({
      fixtureId: fixture.id,
      date: fixture.kickoff_utc,
      homeTeam: home,
      awayTeam: away,
      group: fixture.group ?? '',
      model: locked.model,
      predHome: locked.home_goals,
      predAway: locked.away_goals,
      actualHome: result.home_goals,
      actualAway: result.away_goals,
      outcomeCorrect: predOutcome === actualOutcome,
      homeGoalErr: Math.abs(locked.home_goals - result.home_goals),
      awayGoalErr: Math.abs(locked.away_goals - result.away_goals),
      totalGoalErr: Math.abs(locked.home_goals - result.home_goals) + Math.abs(locked.away_goals - result.away_goals),
    })
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Model summaries
  const modelKeys = [...new Set(rows.map(r => r.model))]
  const summaries: ModelSummary[] = modelKeys.map(model => {
    const mRows = rows.filter(r => r.model === model)
    const correct = mRows.filter(r => r.outcomeCorrect).length
    return {
      model,
      matches: mRows.length,
      correct,
      accuracy: mRows.length > 0 ? correct / mRows.length : 0,
      avgGoalErr: mRows.length > 0 ? mRows.reduce((s, r) => s + r.totalGoalErr, 0) / mRows.length : 0,
    }
  }).sort((a, b) => b.accuracy - a.accuracy)

  const filtered = modelFilter === 'all' ? rows : rows.filter(r => r.model === modelFilter)
  const overallCorrect = rows.filter(r => r.outcomeCorrect).length

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No analysable data yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Go to Results → lock a prediction for a match → enter the actual score. Analysis will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-zinc-400">Matches analysed</div>
            <div className="text-2xl font-bold text-zinc-900 mt-0.5">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-zinc-400">Outcome accuracy</div>
            <div className="text-2xl font-bold text-zinc-900 mt-0.5">
              {rows.length > 0 ? `${Math.round((overallCorrect / rows.length) * 100)}%` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-zinc-400">Avg goal error</div>
            <div className="text-2xl font-bold text-zinc-900 mt-0.5">
              {rows.length > 0
                ? (rows.reduce((s, r) => s + r.totalGoalErr, 0) / rows.length).toFixed(2)
                : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-zinc-400">Best model</div>
            <div className="text-sm font-bold text-zinc-900 mt-0.5">
              {summaries[0] ? (
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[summaries[0].model]}`}>
                  {MODEL_LABELS[summaries[0].model]}
                </span>
              ) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-model breakdown */}
      {summaries.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Model Breakdown</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Model</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500">Matches</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500">Correct</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500">Accuracy</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500">Avg Goal Err</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr key={s.model} className={`border-b border-zinc-50 ${i === 0 ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[s.model]}`}>
                        {MODEL_LABELS[s.model]}
                      </span>
                      {i === 0 && <span className="ml-1.5 text-xs text-green-600 font-medium">Best</span>}
                    </td>
                    <td className="px-4 py-2 text-center text-zinc-700">{s.matches}</td>
                    <td className="px-4 py-2 text-center text-zinc-700">{s.correct}</td>
                    <td className="px-4 py-2 text-center font-semibold text-zinc-900">{Math.round(s.accuracy * 100)}%</td>
                    <td className="px-4 py-2 text-center text-zinc-700">{s.avgGoalErr.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Per-match table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Match-by-Match</CardTitle>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All models</option>
            {modelKeys.map(m => (
              <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
            ))}
          </select>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Date</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Match</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Model</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Predicted</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Actual</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Outcome</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Goal Err</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.fixtureId} className={`border-b border-zinc-50 ${row.outcomeCorrect ? 'bg-green-50/40' : ''}`}>
                  <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span>{row.homeTeam.flag_url}</span>
                      <span className="font-medium text-zinc-900">{row.homeTeam.code}</span>
                      <span className="text-zinc-300">vs</span>
                      <span className="font-medium text-zinc-900">{row.awayTeam.code}</span>
                      <span>{row.awayTeam.flag_url}</span>
                      {row.group && <span className="text-zinc-400">Grp {row.group}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[row.model]}`}>
                      {MODEL_LABELS[row.model] ?? row.model}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold text-zinc-500">
                    {row.predHome.toFixed(1)}–{row.predAway.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-zinc-900">
                    {row.actualHome}–{row.actualAway}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.outcomeCorrect
                      ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-medium ${row.totalGoalErr <= 1 ? 'text-green-600' : row.totalGoalErr <= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {row.totalGoalErr.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
