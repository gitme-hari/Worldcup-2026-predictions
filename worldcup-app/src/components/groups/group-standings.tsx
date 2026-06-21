'use client'
import { useState, useEffect } from 'react'
import {
  getTeams, getFixtures, getPredictions, getResults, getResult, getOverride,
} from '@/lib/store'
import {
  computeGroupStandings, engineScore,
  computeQualificationStatus, computeThirdPlaceRanking,
} from '@/lib/models'
import type { QualificationStatus } from '@/lib/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { GroupStanding } from '@/lib/types'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QualificationStatus }) {
  const map: Record<QualificationStatus, { label: string; cls: string }> = {
    confirmed:      { label: 'Q',          cls: 'bg-emerald-600 text-white' },
    projected_top2: { label: 'Top 2',      cls: 'bg-emerald-100 text-emerald-700' },
    best_third:     { label: 'Best 3rd',   cls: 'bg-blue-100 text-blue-700' },
    in_contention:  { label: 'Alive',      cls: 'bg-amber-100 text-amber-700' },
    eliminated:     { label: 'Out',        cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`hidden sm:inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

// ── Group table ───────────────────────────────────────────────────────────────

function GroupTable({
  group,
  standings,
  statusMap,
}: {
  group: string
  standings: GroupStanding[]
  statusMap: Record<string, QualificationStatus>
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold text-zinc-800">Group {group}</p>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Team</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">P</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">W</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">D</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">L</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">GF</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">GA</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">GD</th>
              <th className="px-3 py-2 text-center font-semibold text-zinc-700">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const st = statusMap[s.team.id]
              const rowCls =
                st === 'confirmed'      ? 'bg-emerald-50/70' :
                st === 'projected_top2' ? 'bg-emerald-50/30' :
                st === 'best_third'     ? 'bg-blue-50/30' :
                st === 'eliminated'     ? 'opacity-50' : ''
              return (
                <tr key={s.team.id} className={`border-b border-zinc-50 ${rowCls}`}>
                  <td className="px-3 py-2 text-zinc-400">
                    <span className={i < 2 ? 'text-emerald-600 font-bold' : ''}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span>{s.team.flag_url}</span>
                      <span className="font-medium text-zinc-900">{s.team.name}</span>
                      {st && <StatusBadge status={st} />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.played}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.wins}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.draws}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.losses}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.gf}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.ga}</td>
                  <td className="px-3 py-2 text-center text-zinc-700">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                  <td className="px-3 py-2 text-center font-bold text-zinc-900">{s.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Third-place race table ─────────────────────────────────────────────────────

function ThirdPlaceTable({
  thirds,
}: {
  thirds: Array<GroupStanding & { group: string; qualifies: boolean }>
}) {
  if (thirds.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold text-zinc-800">Best Third-Place Race</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Top 8 third-place teams across all groups qualify. Ranked by Pts → GD → GF.
        </p>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">#</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Team</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Grp</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">P</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">GD</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">GF</th>
              <th className="px-3 py-2 text-center font-semibold text-zinc-700">Pts</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {thirds.map((s, i) => (
              <tr
                key={s.team.id}
                className={`border-b border-zinc-50 ${s.qualifies ? 'bg-blue-50/40' : 'opacity-60'}`}
              >
                <td className="px-3 py-2 font-medium text-zinc-500">
                  <span className={s.qualifies ? 'text-blue-600 font-bold' : ''}>{i + 1}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>{s.team.flag_url}</span>
                    <span className="font-medium text-zinc-900">{s.team.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-zinc-500">{s.group}</td>
                <td className="px-3 py-2 text-center text-zinc-700">{s.played}</td>
                <td className="px-3 py-2 text-center text-zinc-700">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="px-3 py-2 text-center text-zinc-700">{s.gf}</td>
                <td className="px-3 py-2 text-center font-bold text-zinc-900">{s.points}</td>
                <td className="px-3 py-2 text-center">
                  {s.qualifies ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      In
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                      Out
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupStandings() {
  const [mounted, setMounted] = useState(false)
  const [scoreSource, setScoreSource] = useState<'predictions' | 'results'>('predictions')
  useEffect(() => setMounted(true), [])

  if (!mounted) return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-lg bg-zinc-100" />)}
    </div>
  )

  const teams       = getTeams()
  const fixtures    = getFixtures()
  const predictions = getPredictions()

  // Engine-native score source: average of all model predictions, no active_model dependency
  const getScore = (fid: string) => {
    if (scoreSource === 'results') {
      const r = getResult(fid)
      return r ? { home: r.home_goals, away: r.away_goals } : null
    }
    const ovr = getOverride(fid)
    if (ovr) return { home: ovr.home_goals, away: ovr.away_goals }
    return engineScore(predictions, fid)
  }

  const standings = computeGroupStandings(fixtures as any, teams, getScore)
  const statusMap = computeQualificationStatus(standings)
  const thirds    = computeThirdPlaceRanking(standings)

  // Only show third-place table if any team has played at least 1 match
  const anyPlayed = Object.values(standings).some(g => g.some(s => s.played > 0))

  return (
    <div className="space-y-4">
      {/* Source toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">Score source:</span>
        <div className="flex items-center gap-1.5 rounded border border-zinc-200 p-0.5">
          {(['predictions', 'results'] as const).map(src => (
            <button
              key={src}
              onClick={() => setScoreSource(src)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                scoreSource === src ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {src.charAt(0).toUpperCase() + src.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-400">
          {scoreSource === 'predictions' ? 'Engine projection' : 'Actual results'}
        </span>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" /> Qualified
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-200" /> Top 2 (projected)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-300" /> Best 3rd (projected)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-300" /> In contention
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-300" /> Eliminated
        </div>
      </div>

      {/* Group grids */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {'ABCDEFGHIJKL'.split('').map(g => (
          <GroupTable
            key={g}
            group={g}
            standings={standings[g] ?? []}
            statusMap={statusMap}
          />
        ))}
      </div>

      {/* Third-place race */}
      {anyPlayed && <ThirdPlaceTable thirds={thirds} />}
    </div>
  )
}
