'use client'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions, getPredictions } from '@/lib/store'
import { generateAllReviews } from '@/lib/match-review'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus } from '@/lib/team-stats'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function TabOverrideIntelligence() {
  const { reviews, overrides, accepted } = useMemo(() => {
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

    return {
      reviews,
      overrides: reviews.filter(r => r.overridden),
      accepted: reviews.filter(r => !r.overridden && r.enginePts != null),
    }
  }, [])

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">No completed matches yet.</p>
      </div>
    )
  }

  const overrideWins   = overrides.filter(r => r.verdict === 'Override succeeded').length
  const overrideLosses = overrides.filter(r => r.verdict === 'Override failed').length
  const overrideNeutral = overrides.length - overrideWins - overrideLosses

  const overridePts  = overrides.reduce((s, r) => s + r.myPts, 0)
  const recPts       = overrides.reduce((s, r) => s + (r.enginePts ?? 0), 0)
  const overrideDelta = overridePts - recPts

  const acceptedMyPts  = accepted.reduce((s, r) => s + r.myPts, 0)
  const acceptedEngPts = accepted.reduce((s, r) => s + (r.enginePts ?? 0), 0)

  const winRate = overrides.length > 0 ? (overrideWins / overrides.length) * 100 : null

  return (
    <div className="space-y-5">
      {/* Override summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Overrides</p>
          <p className="text-2xl font-black text-zinc-900">{overrides.length}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Win rate</p>
          <p className={`text-2xl font-black ${winRate === null ? 'text-zinc-400' : winRate >= 50 ? 'text-green-700' : 'text-red-600'}`}>
            {winRate === null ? '—' : `${Math.round(winRate)}%`}
          </p>
        </div>
        <div className={`rounded-lg p-3 text-center ${overrideDelta > 0 ? 'bg-green-50' : overrideDelta < 0 ? 'bg-red-50' : 'bg-zinc-50'}`}>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Override delta</p>
          <p className={`text-2xl font-black ${overrideDelta > 0 ? 'text-green-700' : overrideDelta < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {overrideDelta > 0 ? '+' : ''}{overrideDelta}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Accepted rec delta</p>
          <p className={`text-2xl font-black ${acceptedMyPts - acceptedEngPts > 0 ? 'text-green-700' : acceptedMyPts - acceptedEngPts < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {acceptedMyPts - acceptedEngPts > 0 ? '+' : ''}{acceptedMyPts - acceptedEngPts}
          </p>
        </div>
      </div>

      {/* W/L/N breakdown */}
      {overrides.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-green-50 px-3 py-2">
            <TrendingUp className="mx-auto mb-1 h-4 w-4 text-green-600" />
            <p className="font-bold text-green-700 text-lg">{overrideWins}</p>
            <p className="text-green-600">Overrides won</p>
          </div>
          <div className="rounded bg-zinc-50 px-3 py-2">
            <Minus className="mx-auto mb-1 h-4 w-4 text-zinc-400" />
            <p className="font-bold text-zinc-600 text-lg">{overrideNeutral}</p>
            <p className="text-zinc-500">Neutral</p>
          </div>
          <div className="rounded bg-red-50 px-3 py-2">
            <TrendingDown className="mx-auto mb-1 h-4 w-4 text-red-500" />
            <p className="font-bold text-red-600 text-lg">{overrideLosses}</p>
            <p className="text-red-600">Overrides lost</p>
          </div>
        </div>
      )}

      {/* Override detail table */}
      {overrides.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Override history</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">Engine</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">Your pick</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">Δ pts</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map(r => {
                  const delta = r.deltaVsEngine ?? 0
                  return (
                    <tr key={r.fixtureId} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900 whitespace-nowrap">
                        {r.homeCode} v {r.awayCode}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-zinc-400">
                        {r.engineH != null ? `${r.engineH}–${r.engineA}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-700">
                        {r.myH}–{r.myA}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">
                        {r.actualH}–{r.actualA}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 max-w-[160px] truncate">
                        {r.overrideReason ?? <span className="text-zinc-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overrides.length === 0 && (
        <div className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          No overrides recorded yet. When you deviate from the engine recommendation, it will appear here.
        </div>
      )}
    </div>
  )
}
