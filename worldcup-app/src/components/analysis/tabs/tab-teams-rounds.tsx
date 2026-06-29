'use client'
import type { PerformanceData } from '../performance-data'
import type { MatchReview } from '@/lib/match-review'
import { stageLabel } from '@/lib/seed-data'

// ── Per-team bias analysis ────────────────────────────────────────────────────

interface TeamBias {
  code: string
  flag: string
  matches: number
  avgGoalBias: number   // avg(myGoals − actualGoals), positive = over-predicted
  avgPts: number
}

function computeTeamBiases(reviews: MatchReview[]): TeamBias[] {
  const map = new Map<string, { code: string; flag: string; homeDeltas: number[]; awayDeltas: number[]; pts: number[] }>()

  for (const r of reviews) {
    if (!map.has(r.homeCode)) map.set(r.homeCode, { code: r.homeCode, flag: '', homeDeltas: [], awayDeltas: [], pts: [] })
    if (!map.has(r.awayCode)) map.set(r.awayCode, { code: r.awayCode, flag: '', homeDeltas: [], awayDeltas: [], pts: [] })

    map.get(r.homeCode)!.homeDeltas.push(r.myH - r.actualH)
    map.get(r.homeCode)!.pts.push(r.myPts)
    map.get(r.awayCode)!.awayDeltas.push(r.myA - r.actualA)
    map.get(r.awayCode)!.pts.push(r.myPts)
  }

  return Array.from(map.values()).map(t => {
    const allDeltas = [...t.homeDeltas, ...t.awayDeltas]
    const avgBias = allDeltas.length > 0
      ? allDeltas.reduce((s, d) => s + d, 0) / allDeltas.length
      : 0
    const avgPts = t.pts.length > 0
      ? t.pts.reduce((s, p) => s + p, 0) / t.pts.length
      : 0
    return {
      code: t.code,
      flag: t.flag,
      matches: t.pts.length,
      avgGoalBias: Math.round(avgBias * 100) / 100,
      avgPts: Math.round(avgPts * 100) / 100,
    }
  }).filter(t => t.matches >= 2)
    .sort((a, b) => Math.abs(b.avgGoalBias) - Math.abs(a.avgGoalBias))
}

function TeamBiasTable({ reviews }: { reviews: MatchReview[] }) {
  const biases = computeTeamBiases(reviews)

  if (biases.length === 0) {
    return (
      <div className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-xs text-zinc-400">
        Need 2+ matches per team to surface biases.
      </div>
    )
  }

  const overrated  = biases.filter(b => b.avgGoalBias > 0.15).slice(0, 5)
  const underrated = biases.filter(b => b.avgGoalBias < -0.15).slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-500">Consistently over-predicted goals</p>
        {overrated.length === 0
          ? <p className="text-xs text-zinc-400">None yet.</p>
          : overrated.map(b => (
            <div key={b.code} className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-zinc-800 w-8">{b.code}</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, b.avgGoalBias * 100)}%` }} />
              </div>
              <span className="text-amber-700 font-semibold w-16 text-right">+{b.avgGoalBias.toFixed(2)} goals</span>
            </div>
          ))
        }
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-500">Consistently under-predicted goals</p>
        {underrated.length === 0
          ? <p className="text-xs text-zinc-400">None yet.</p>
          : underrated.map(b => (
            <div key={b.code} className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-zinc-800 w-8">{b.code}</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(100, Math.abs(b.avgGoalBias) * 100)}%` }} />
              </div>
              <span className="text-blue-700 font-semibold w-16 text-right">{b.avgGoalBias.toFixed(2)} goals</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Round-by-round performance ────────────────────────────────────────────────

interface RoundStats {
  label: string
  matches: number
  total: number
  avg: number
  exact: number
}

function computeRoundStats(reviews: MatchReview[], fixtures: PerformanceData['fixtures']): RoundStats[] {
  const fixtureMap = Object.fromEntries(fixtures.map(f => [f.id, f]))
  const stageMap = new Map<string, MatchReview[]>()

  for (const r of reviews) {
    const fix = fixtureMap[r.fixtureId]
    if (!fix) continue
    const stage = fix.stage
    if (!stageMap.has(stage)) stageMap.set(stage, [])
    stageMap.get(stage)!.push(r)
  }

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final']

  return stageOrder
    .filter(s => stageMap.has(s))
    .map(s => {
      const rs = stageMap.get(s)!
      const total = rs.reduce((sum, r) => sum + r.myPts, 0)
      return {
        label: stageLabel(s as Parameters<typeof stageLabel>[0]),
        matches: rs.length,
        total,
        avg: Math.round((total / rs.length) * 100) / 100,
        exact: rs.filter(r => r.myPts === 4).length,
      }
    })
}

function RoundTable({ rounds }: { rounds: RoundStats[] }) {
  if (rounds.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Round</th>
            <th className="px-3 py-2 text-center font-medium text-zinc-500">Matches</th>
            <th className="px-3 py-2 text-center font-medium text-zinc-500">Total pts</th>
            <th className="px-3 py-2 text-center font-medium text-zinc-500">Avg pts</th>
            <th className="px-3 py-2 text-center font-medium text-zinc-500">Exact scores</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map(r => (
            <tr key={r.label} className="border-b border-zinc-50">
              <td className="px-3 py-2.5 font-medium text-zinc-800">{r.label}</td>
              <td className="px-3 py-2.5 text-center text-zinc-600 tabular-nums">{r.matches}</td>
              <td className="px-3 py-2.5 text-center font-bold text-zinc-900 tabular-nums">{r.total}</td>
              <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${r.avg >= 2 ? 'text-emerald-700' : r.avg >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                {r.avg.toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-center text-zinc-600 tabular-nums">{r.exact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Best & worst predictions ──────────────────────────────────────────────────

function BestWorst({ reviews }: { reviews: MatchReview[] }) {
  if (reviews.length < 3) return null

  const bests  = reviews.filter(r => r.myPts === 4).slice(-3).reverse()
  const worsts = reviews.filter(r => r.myPts === 0).slice(-3).reverse()

  if (bests.length === 0 && worsts.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {bests.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-500">Recent exact scores (4 pts)</p>
          {bests.map(r => (
            <div key={r.fixtureId} className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-emerald-800">{r.homeCode} v {r.awayCode}</span>
              <span className="ml-auto font-mono font-bold text-emerald-700">{r.actualH}–{r.actualA}</span>
            </div>
          ))}
        </div>
      )}
      {worsts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-500">Recent misses (0 pts)</p>
          {worsts.map(r => (
            <div key={r.fixtureId} className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-red-800">{r.homeCode} v {r.awayCode}</span>
              <div className="ml-auto flex gap-1.5 font-mono text-[10px]">
                <span className="text-zinc-400">pred {r.myH}–{r.myA}</span>
                <span className="text-red-600 font-bold">actual {r.actualH}–{r.actualA}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function TabTeamsRounds({ data }: { data: PerformanceData }) {
  const { reviews, fixtures } = data
  const rounds = computeRoundStats(reviews, fixtures)

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">No completed matches yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Round-by-Round Performance</p>
        <RoundTable rounds={rounds} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Team Goal Biases</p>
        <p className="text-xs text-zinc-400">Teams where your goal predictions consistently differ from reality.</p>
        <TeamBiasTable reviews={reviews} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Best & Worst Picks</p>
        <BestWorst reviews={reviews} />
      </div>
    </div>
  )
}
