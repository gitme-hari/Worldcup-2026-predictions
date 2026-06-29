'use client'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions, getPredictions } from '@/lib/store'
import { generateAllReviews } from '@/lib/match-review'
import { buildBlindSpotProfile } from '@/lib/failure-classifier'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus } from '@/lib/team-stats'
import { Eye } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  over_predicted_goals:          'Over-predicted goals',
  favourite_overestimated:       'Favourite overestimated',
  qualification_pressure_ignored:'Qualification pressure ignored',
  away_attack_underestimated:    'Away attack underestimated',
  home_attack_underestimated:    'Home attack underestimated',
  defensive_improvement_ignored: 'Defensive improvement ignored',
  random_variance:               'Random variance',
  correct:                       'Correct',
}

const BAR_COLOR: Record<string, string> = {
  over_predicted_goals:           'bg-amber-400',
  favourite_overestimated:        'bg-red-400',
  qualification_pressure_ignored: 'bg-orange-400',
  away_attack_underestimated:     'bg-purple-400',
  home_attack_underestimated:     'bg-indigo-400',
  defensive_improvement_ignored:  'bg-blue-400',
  random_variance:                'bg-zinc-300',
  correct:                        'bg-green-400',
}

export function TabBlindSpots() {
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

    const profile = buildBlindSpotProfile(reviews.map(r => ({ category: r.blindSpot })))
    const total = reviews.length

    return { profile, total }
  }, [])

  if (total === 0) {
    return (
      <div className="py-12 text-center">
        <Eye className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">No match data yet.</p>
      </div>
    )
  }

  // Split correct/failures
  const failures = profile.filter(p => p.category !== 'correct')
  const correctEntry = profile.find(p => p.category === 'correct')

  return (
    <div className="space-y-5">
      {/* Accuracy headline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Engine correct</p>
          <p className="text-2xl font-black text-green-700">{correctEntry?.count ?? 0}</p>
          <p className="text-xs text-zinc-400">{correctEntry?.pct ?? 0}% of matches</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Engine missed</p>
          <p className="text-2xl font-black text-red-600">{total - (correctEntry?.count ?? 0)}</p>
          <p className="text-xs text-zinc-400">across {failures.length} pattern{failures.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Failure breakdown */}
      {failures.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Failure patterns (engine errors only)</p>
          {failures.map(p => (
            <div key={p.category} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-700 font-medium">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                <span className="text-zinc-500">{p.count} ({p.pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${BAR_COLOR[p.category] ?? 'bg-zinc-400'}`}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {failures.length === 0 && (
        <div className="rounded-lg bg-green-50 px-4 py-4 text-center text-sm text-green-700">
          No failure patterns detected — all classified matches were correct.
        </div>
      )}

      <p className="text-[10px] text-zinc-400">
        Based on {total} classified match{total !== 1 ? 'es' : ''}. Patterns drive learning signals once 3+ occur.
      </p>
    </div>
  )
}
