'use client'
import Link from 'next/link'
import type { PerformanceData } from './performance-data'
import { BLIND_SPOT_LABELS } from './performance-data'
import { CheckSquare } from 'lucide-react'

export function NextPicksChecklist({ data }: { data: PerformanceData }) {
  const { activeSignals, upcoming } = data

  const mustWinUpcoming = upcoming.filter(
    u => u.homeQual === 'must_win' || u.awayQual === 'must_win' ||
         u.homeQual === 'must_not_lose' || u.awayQual === 'must_not_lose',
  )
  const rotationUpcoming = upcoming.filter(
    u => u.homeQual === 'rotation_risk' || u.awayQual === 'rotation_risk',
  )

  const estimatedGain = activeSignals.reduce((s, sig) => s + Math.max(0, sig.avgPtsImprovement), 0)

  type CheckItem = {
    label: string
    detail?: string
    fixtures?: Array<{ id: string; code: string }>
  }

  const items: CheckItem[] = []

  if (mustWinUpcoming.length > 0) {
    const teams = mustWinUpcoming.flatMap(u => {
      const out: Array<{ id: string; code: string }> = []
      if (u.homeQual === 'must_win' || u.homeQual === 'must_not_lose')
        out.push({ id: u.fixture.id, code: u.home?.code ?? u.fixture.home_team_id })
      if (u.awayQual === 'must_win' || u.awayQual === 'must_not_lose')
        out.push({ id: u.fixture.id, code: u.away?.code ?? u.fixture.away_team_id })
      return out
    })
    items.push({ label: 'Review must-win teams', fixtures: teams })
  }

  if (rotationUpcoming.length > 0) {
    const teams = rotationUpcoming.flatMap(u => {
      const out: Array<{ id: string; code: string }> = []
      if (u.homeQual === 'rotation_risk') out.push({ id: u.fixture.id, code: u.home?.code ?? u.fixture.home_team_id })
      if (u.awayQual === 'rotation_risk') out.push({ id: u.fixture.id, code: u.away?.code ?? u.fixture.away_team_id })
      return out
    })
    items.push({ label: 'Check rotation-risk teams', detail: 'Squad rotation may affect predicted scorelines', fixtures: teams })
  }

  items.push({ label: 'Verify confirmed lineups before locking', detail: 'Absences can shift goal expectations significantly' })

  for (const sig of activeSignals) {
    items.push({
      label: `Apply active learning: ${BLIND_SPOT_LABELS[sig.category] ?? sig.category}`,
      detail: `${sig.occurrences} matches observed · ${sig.confidence} confidence`,
    })
  }

  if (items.length === 0) {
    items.push({ label: 'No active signals — trust the engine recommendations' })
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-zinc-500" />
          <p className="text-xs font-semibold text-zinc-800">Next Picks Checklist</p>
        </div>
        {estimatedGain > 0 && (
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            +{estimatedGain.toFixed(1)} estimated opportunity
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <div className="flex items-start gap-2">
              <span className="text-green-600 text-xs mt-px shrink-0">✓</span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-zinc-800">{item.label}</p>
                {item.detail && <p className="text-[10px] text-zinc-500">{item.detail}</p>}
                {item.fixtures && item.fixtures.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.fixtures.map(f => (
                      <Link
                        key={f.id}
                        href={`/matches/${f.id}`}
                        className="inline-flex items-center rounded bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
                      >
                        {f.code} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
