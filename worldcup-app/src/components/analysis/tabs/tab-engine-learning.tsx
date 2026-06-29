'use client'
import { useMemo } from 'react'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions, getPredictions } from '@/lib/store'
import { generateAllReviews } from '@/lib/match-review'
import { generateLearningSignals } from '@/lib/learning-signals'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus } from '@/lib/team-stats'
import { Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STRENGTH_STYLE: Record<string, string> = {
  Strong:   'bg-green-100 text-green-800 border-green-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Weak:     'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export function TabEngineLearning() {
  const signals = useMemo(() => {
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

    return generateLearningSignals(reviews)
  }, [])

  if (signals.length === 0) {
    return (
      <div className="py-12 text-center">
        <Brain className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">Not enough match data to derive learning signals yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Signals appear after 3+ matches with the same failure pattern.</p>
      </div>
    )
  }

  const active = signals.filter(s => s.appliedToRecs)
  const inactive = signals.filter(s => !s.appliedToRecs)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Total signals</p>
          <p className="text-2xl font-black text-zinc-900">{signals.length}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Applied</p>
          <p className="text-2xl font-black text-green-700">{active.length}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Monitoring</p>
          <p className="text-2xl font-black text-zinc-600">{inactive.length}</p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Applied to recommendations</p>
          {active.map(sig => (
            <SignalCard key={sig.id} sig={sig} />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Monitoring (not yet applied)</p>
          {inactive.map(sig => (
            <SignalCard key={sig.id} sig={sig} />
          ))}
        </div>
      )}
    </div>
  )
}

function SignalCard({ sig }: { sig: import('@/lib/learning-signals').LearningSignal }) {
  const ptsSign = sig.avgPtsImprovement >= 0 ? '+' : ''
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-900">{sig.lesson}</span>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${STRENGTH_STYLE[sig.strength] ?? ''}`}>
          {sig.strength}
        </Badge>
      </div>
      <div className="flex gap-4 text-[10px] text-zinc-500">
        <span>{sig.occurrences} occurrences</span>
        <span>Confidence: {sig.confidence}</span>
        <span>Avg Δpts: <span className={sig.avgPtsImprovement > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
          {ptsSign}{sig.avgPtsImprovement.toFixed(2)}
        </span></span>
        <span className={sig.appliedToRecs ? 'text-green-600 font-medium' : 'text-zinc-400'}>
          {sig.appliedToRecs ? '✓ active' : 'monitoring'}
        </span>
      </div>
    </div>
  )
}
