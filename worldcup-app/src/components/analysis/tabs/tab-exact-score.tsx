'use client'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions, getPredictions } from '@/lib/store'
import { generateAllReviews } from '@/lib/match-review'
import { buildExactScoreProfile } from '@/lib/exact-score-analysis'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus } from '@/lib/team-stats'
import { Crosshair } from 'lucide-react'

export function TabExactScore() {
  const { profile, total } = useMemo(() => {
    const fixtures = getFixtures()
    const teams = getTeams()
    const results = getResults()
    const locked = getLockedPredictions()
    const recs = getPoolRecommendations()
    const human = getHumanPredictions()
    const preds = getPredictions()
    const adjustments = buildTeamAdjustments(teams, fixtures, results, preds)
    const standings = computeGroupStandings(fixtures, results)

    const qualMap: Record<string, import('@/lib/team-stats').QualificationStatus> = {}
    for (const ts of Object.values(standings)) {
      for (const s of ts) qualMap[s.teamId] = computeQualificationStatus(s.teamId, ts, s.played)
    }

    const reviews = generateAllReviews({
      fixtures, teams, lockedPredictions: locked,
      poolRecommendations: recs, results, adjustments, qualMap, humanPredictions: human,
    })

    return { profile: buildExactScoreProfile(reviews), total: reviews.length }
  }, [])

  if (total === 0) {
    return (
      <div className="py-12 text-center">
        <Crosshair className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">No completed matches yet.</p>
      </div>
    )
  }

  const { distribution: d, avgPts, homeGoalBias, awayGoalBias, missedPatterns, topMissedPattern } = profile

  const bars = [
    { pts: 4, count: d.exact,    label: '4 pts · Exact score',       bar: 'bg-green-500' },
    { pts: 2, count: d.gdWin,    label: '2 pts · Winner + GD',        bar: 'bg-blue-400' },
    { pts: 1, count: d.winOnly,  label: '1 pt  · Correct winner',     bar: 'bg-amber-400' },
    { pts: 0, count: d.miss,     label: '0 pts · Missed',             bar: 'bg-red-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Point distribution */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Pool point distribution ({d.total} picks)
        </p>
        {bars.map(({ pts, count, label, bar }) => (
          <div key={pts} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-xs text-zinc-600">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${bar}`}
                style={{ width: d.total > 0 ? `${(count / d.total) * 100}%` : '0%' }}
              />
            </div>
            <span className="w-16 text-right text-xs font-semibold text-zinc-700">
              {count} <span className="font-normal text-zinc-400">({Math.round((count / d.total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Avg pts / match</p>
          <p className={`text-2xl font-black ${avgPts >= 2 ? 'text-green-700' : avgPts >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
            {avgPts.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Home goal bias</p>
          <p className={`text-2xl font-black tabular-nums ${Math.abs(homeGoalBias) < 0.3 ? 'text-zinc-700' : 'text-amber-600'}`}>
            {homeGoalBias >= 0 ? '+' : ''}{homeGoalBias.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Away goal bias</p>
          <p className={`text-2xl font-black tabular-nums ${Math.abs(awayGoalBias) < 0.3 ? 'text-zinc-700' : 'text-amber-600'}`}>
            {awayGoalBias >= 0 ? '+' : ''}{awayGoalBias.toFixed(2)}
          </p>
        </div>
      </div>

      {topMissedPattern && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">Top pattern: </span>{topMissedPattern}
        </div>
      )}

      {missedPatterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Missed score patterns (2+ occurrences)</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Predicted</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Actual</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">Count</th>
                </tr>
              </thead>
              <tbody>
                {missedPatterns.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-50">
                    <td className="px-3 py-2 font-mono text-zinc-700">{p.predicted}</td>
                    <td className="px-3 py-2 font-mono text-zinc-900 font-semibold">{p.actual}</td>
                    <td className="px-3 py-2 text-center text-zinc-600">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
