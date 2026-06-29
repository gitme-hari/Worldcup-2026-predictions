'use client'
import { ModelHealth } from '@/components/analysis/model-health'
import { DisagreementAnalysis } from '@/components/analysis/disagreement-analysis'
import { DecisionEngine } from '@/components/analysis/decision-engine'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, computeCalibration } from '@/lib/store'
import { getLockedPredictions, getPredictions } from '@/lib/store'
import { getOutcome } from '@/lib/models'
import { MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'

const MODELS = ['A', 'B', 'C'] as const

export function TabDiagnostics() {
  const { leaderboard, calibration, comparisons } = useMemo(() => {
    const fixtures = getFixtures()
    const teams = getTeams()
    const results = getResults()
    const allPreds = getPredictions()
    const lockedPreds = getLockedPredictions()
    const calibration = computeCalibration()
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

    const comparisons = results.flatMap(result => {
      const fixture = fixtures.find(f => f.id === result.fixture_id)
      if (!fixture) return []
      const home = teamMap[fixture.home_team_id]
      const away = teamMap[fixture.away_team_id]
      if (!home || !away) return []
      const locked = lockedPreds.find(p => p.fixture_id === result.fixture_id)
      const actualOutcome = getOutcome(result.home_goals, result.away_goals)

      const models = Object.fromEntries(MODELS.map(m => {
        const pred = allPreds.find(p => p.fixture_id === result.fixture_id && p.model === m)
        if (!pred) return [m, null]
        return [m, {
          predHome: pred.home_goals, predAway: pred.away_goals,
          outcomeCorrect: getOutcome(pred.home_goals, pred.away_goals) === actualOutcome,
          goalErr: Math.abs(pred.home_goals - result.home_goals) + Math.abs(pred.away_goals - result.away_goals),
        }]
      }))

      return [{
        fixtureId: fixture.id,
        homeCode: home.code, awayCode: away.code,
        date: fixture.kickoff_utc, group: fixture.group ?? '',
        lockedModel: locked?.model ?? null,
        actual: { home: result.home_goals, away: result.away_goals },
        models,
      }]
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

    return { leaderboard, calibration, comparisons }
  }, [])

  const bestModel = leaderboard[0]?.accuracy > 0 ? leaderboard[0].model : null

  return (
    <div className="space-y-6">
      <DecisionEngine />
      <ModelHealth />
      <DisagreementAnalysis />

      {/* Model leaderboard */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-700">Model Leaderboard</p>
        <p className="text-xs text-zinc-400">Outcome accuracy and goal error across all played matches.</p>
        <div className="overflow-x-auto rounded-lg border border-zinc-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Rank</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Model</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Matches</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Correct</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Accuracy</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Avg goal err</th>
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Calibration</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((s, i) => {
                const cal = calibration.find(c => c.model === s.model)
                return (
                  <tr key={s.model} className={`border-b border-zinc-50 ${i === 0 && s.accuracy > 0 ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-2.5 font-bold text-zinc-400">#{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[s.model]}`}>
                          {MODEL_LABELS[s.model]}
                        </span>
                        {i === 0 && s.accuracy > 0 && <span className="text-xs text-green-600 font-medium">Best</span>}
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
          <p className="text-xs text-zinc-500 px-1">
            Best performer: {MODEL_LABELS[bestModel]} — leading on accuracy across {comparisons.length} played matches.
          </p>
        )}
      </div>
    </div>
  )
}
