'use client'
import type { PerformanceData } from './performance-data'
import { BLIND_SPOT_LABELS, SIGNAL_RECOMMENDATIONS } from './performance-data'
import { Lightbulb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const IMPACT_STYLE: Record<string, string> = {
  High:   'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-zinc-50 text-zinc-600 border-zinc-200',
}

function strengthToImpact(strength: string): 'High' | 'Medium' | 'Low' {
  if (strength === 'Strong')   return 'High'
  if (strength === 'Moderate') return 'Medium'
  return 'Low'
}

export function KeyInsightsCard({ data }: { data: PerformanceData }) {
  const { activeSignals, upcoming } = data

  const mustWinUpcoming = upcoming.filter(
    u => u.homeQual === 'must_win' || u.awayQual === 'must_win' ||
         u.homeQual === 'must_not_lose' || u.awayQual === 'must_not_lose',
  )

  const topSignal = activeSignals[0]
  const estimatedGain = activeSignals.reduce((s, sig) => s + Math.max(0, sig.avgPtsImprovement), 0)

  if (!topSignal && mustWinUpcoming.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 flex items-start gap-3">
        <Lightbulb className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-zinc-700">Key Insights for Your Next Picks</p>
          <p className="text-xs text-zinc-400 mt-0.5">No active learning signals yet. Complete more matches to unlock pattern-based guidance.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-xs font-semibold text-zinc-900">Key Insights for Your Next Picks</p>
        </div>
        {estimatedGain > 0 && (
          <span className="text-[10px] text-green-700 font-semibold bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            +{estimatedGain.toFixed(1)} expected pts
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {activeSignals.map(sig => {
          const impact = strengthToImpact(sig.strength)
          const rec = SIGNAL_RECOMMENDATIONS[sig.category]
          return (
            <div key={sig.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${IMPACT_STYLE[impact]}`}>
                  {impact} Impact
                </Badge>
                <span className="text-xs font-medium text-zinc-800">
                  {BLIND_SPOT_LABELS[sig.category] ?? sig.category}
                </span>
                <span className="text-[10px] text-zinc-400">{sig.occurrences} matches · {sig.confidence} confidence</span>
                {sig.avgPtsImprovement > 0 && (
                  <span className="text-[10px] text-green-600 font-medium ml-auto">
                    +{sig.avgPtsImprovement.toFixed(1)} pts/match
                  </span>
                )}
              </div>
              {rec && <p className="text-xs text-zinc-600 pl-1">{rec}</p>}
            </div>
          )
        })}

        {mustWinUpcoming.length > 0 && (
          <div className="space-y-1 border-t border-blue-100 pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                Medium Impact
              </Badge>
              <span className="text-xs font-medium text-zinc-800">Qualification pressure in upcoming fixtures</span>
            </div>
            <p className="text-xs text-zinc-600 pl-1">
              These teams need a result:{' '}
              {mustWinUpcoming.flatMap(u => {
                const names: string[] = []
                if (u.homeQual === 'must_win' || u.homeQual === 'must_not_lose') names.push(u.home?.code ?? '')
                if (u.awayQual === 'must_win' || u.awayQual === 'must_not_lose') names.push(u.away?.code ?? '')
                return names
              }).filter(Boolean).join(' · ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
