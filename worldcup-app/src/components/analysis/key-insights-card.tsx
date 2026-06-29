'use client'
import type { PerformanceData } from './performance-data'
import { Lightbulb } from 'lucide-react'

export function KeyInsightsCard({ data }: { data: PerformanceData }) {
  const { reviews, exactScore: es } = data

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 flex items-start gap-3">
        <Lightbulb className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-zinc-700">Next steps to maximise pool points</p>
          <p className="text-xs text-zinc-400 mt-0.5">Lock predictions before kickoff, then enter results to start tracking your performance.</p>
        </div>
      </div>
    )
  }

  const total     = reviews.length
  const totalPts  = reviews.reduce((s, r) => s + r.myPts, 0)
  const avgPts    = totalPts / total
  const exactPct  = Math.round((reviews.filter(r => r.myPts === 4).length / total) * 100)
  const homeNote  = Math.abs(es.homeGoalBias) >= 0.3
    ? `Home goal bias ${es.homeGoalBias > 0 ? 'high +' : ''}${es.homeGoalBias.toFixed(2)} — consider adjusting.`
    : null
  const awayNote  = Math.abs(es.awayGoalBias) >= 0.3
    ? `Away goal bias ${es.awayGoalBias > 0 ? 'high +' : ''}${es.awayGoalBias.toFixed(2)} — consider adjusting.`
    : null

  const bullets = [homeNote, awayNote].filter(Boolean)

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-xs font-semibold text-zinc-900">Pool Points Summary</p>
        <span className="ml-auto text-xs text-zinc-500">
          <span className="font-bold text-zinc-900">{avgPts.toFixed(2)} avg pts/match</span>
          {' · '}{exactPct}% exact scores
        </span>
      </div>
      {bullets.length > 0 && (
        <ul className="space-y-1 pl-6">
          {bullets.map((b, i) => (
            <li key={i} className="text-xs text-zinc-600">· {b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
