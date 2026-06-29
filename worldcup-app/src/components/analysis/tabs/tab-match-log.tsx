'use client'
import type { PerformanceData } from '../performance-data'
import type { MatchReview } from '@/lib/match-review'

const PT_STYLE: Record<number, string> = {
  4: 'text-emerald-700 font-black',
  2: 'text-blue-600 font-bold',
  1: 'text-amber-600 font-semibold',
  0: 'text-red-500 font-medium',
}

const PT_BG: Record<number, string> = {
  4: 'bg-emerald-50',
  2: 'bg-blue-50',
  1: 'bg-amber-50',
  0: 'bg-red-50',
}

function ptLabel(pts: number): string {
  if (pts === 4) return '4 · Exact'
  if (pts === 2) return '2 · Winner + GD'
  if (pts === 1) return '1 · Winner'
  return '0 · Missed'
}

function MatchRow({ r }: { r: MatchReview }) {
  return (
    <tr className={`border-b border-zinc-50 ${PT_BG[r.myPts] ?? ''}`}>
      <td className="px-3 py-2.5 font-medium text-zinc-900 whitespace-nowrap">
        {r.homeCode} v {r.awayCode}
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-zinc-600">
        {r.myH}–{r.myA}
      </td>
      <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">
        {r.actualH}–{r.actualA}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${PT_STYLE[r.myPts] ?? ''}`}>
        {ptLabel(r.myPts)}
      </td>
    </tr>
  )
}

export function TabMatchLog({ data }: { data: PerformanceData }) {
  const { reviews } = data

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">No completed matches yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Lock a prediction, then enter the result on the Matches page.</p>
      </div>
    )
  }

  const totalPts = reviews.reduce((s, r) => s + r.myPts, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {reviews.length} completed predictions
        </p>
        <p className="text-xs text-zinc-500">
          Total: <span className="font-bold text-zinc-900">{totalPts} pts</span>
          {' · '}Avg: <span className="font-bold text-zinc-900">{(totalPts / reviews.length).toFixed(2)} pts/match</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">My pick</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Result</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => <MatchRow key={r.fixtureId} r={r} />)}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-zinc-400">
        4 pts = exact score · 2 pts = correct result + goal difference · 1 pt = correct result · 0 pts = missed
      </p>
    </div>
  )
}
