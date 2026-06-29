'use client'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions } from '@/lib/store'
import { generateAllReviews } from '@/lib/match-review'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus } from '@/lib/team-stats'
import { getPredictions } from '@/lib/store'
import { Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const VERDICT_STYLE: Record<string, string> = {
  'Override succeeded': 'text-green-700 border-green-300 bg-green-50',
  'Override failed':    'text-red-600 border-red-300 bg-red-50',
  'Both matched':       'text-blue-700 border-blue-300 bg-blue-50',
  'Both missed':        'text-zinc-500 border-zinc-200 bg-zinc-50',
  'Accepted rec':       'text-zinc-600 border-zinc-200',
  'No rec available':   'text-zinc-400 border-zinc-100',
}

export function TabDecisionReview() {
  const reviews = useMemo(() => {
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
    for (const teamStandings of Object.values(standings)) {
      for (const s of teamStandings) {
        qualMap[s.teamId] = computeQualificationStatus(s.teamId, teamStandings, s.played)
      }
    }

    return generateAllReviews({
      fixtures, teams, lockedPredictions: locked,
      poolRecommendations: recs, results, adjustments, qualMap,
      humanPredictions: human,
    })
  }, [])

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <Target className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">No completed matches to review yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Lock a prediction, then enter the actual score on the Matches page.</p>
      </div>
    )
  }

  const totalPts = reviews.reduce((s, r) => s + r.myPts, 0)
  const enginePts = reviews.reduce((s, r) => s + (r.enginePts ?? 0), 0)
  const delta = totalPts - enginePts

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Your pts</p>
          <p className="text-2xl font-black text-zinc-900">{totalPts}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Engine pts</p>
          <p className="text-2xl font-black text-zinc-700">{enginePts}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${delta > 0 ? 'bg-green-50' : delta < 0 ? 'bg-red-50' : 'bg-zinc-50'}`}>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Delta</p>
          <p className={`text-2xl font-black ${delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </p>
        </div>
      </div>

      {/* Match rows */}
      <div className="overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Engine</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Your pick</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Pts</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.fixtureId} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                <td className="px-3 py-2.5 font-medium text-zinc-900 whitespace-nowrap">
                  {r.homeCode} <span className="text-zinc-300">v</span> {r.awayCode}
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
                  <span className={`font-bold text-sm ${r.myPts === 4 ? 'text-green-700' : r.myPts === 2 ? 'text-blue-600' : r.myPts === 1 ? 'text-amber-600' : 'text-red-500'}`}>
                    {r.myPts}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant="outline" className={`text-[10px] ${VERDICT_STYLE[r.verdict] ?? ''}`}>
                    {r.verdict}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lessons */}
      {reviews.some(r => r.lesson) && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Lessons</p>
          {reviews.filter(r => r.lesson).map(r => (
            <div key={r.fixtureId} className="rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              <span className="font-medium text-zinc-900">{r.homeCode} v {r.awayCode}:</span> {r.lesson}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
