'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getPredictions, getResults, getResult, getOverride, getConfig } from '@/lib/store'
import { computeGroupStandings, getEffectivePrediction } from '@/lib/models'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { GroupStanding } from '@/lib/types'

function GroupTable({ group, standings }: { group: string; standings: GroupStanding[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group {group}</CardTitle>
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
            {standings.map((s, i) => (
              <tr key={s.team.id} className={`border-b border-zinc-50 ${i < 2 ? 'bg-green-50/50' : ''}`}>
                <td className="px-3 py-2 text-zinc-400">
                  {i < 2 ? <span className="text-green-600 font-bold">{i + 1}</span> : i + 1}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>{s.team.flag_url}</span>
                    <span className="font-medium text-zinc-900">{s.team.name}</span>
                    {i < 2 && <Badge variant="success" className="hidden sm:inline-flex">Q</Badge>}
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
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function GroupStandings() {
  const [mounted, setMounted] = useState(false)
  const [scoreSource, setScoreSource] = useState<'predictions' | 'results'>('predictions')
  useEffect(() => setMounted(true), [])

  if (!mounted) return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-lg bg-zinc-100" />)}
    </div>
  )

  const teams = getTeams()
  const fixtures = getFixtures()
  const predictions = getPredictions()
  const config = getConfig()

  const getScore = (fid: string) => {
    if (scoreSource === 'results') {
      const r = getResult(fid)
      return r ? { home: r.home_goals, away: r.away_goals } : null
    }
    // Use override if available, else prediction
    const ovr = getOverride(fid)
    if (ovr) return { home: ovr.home_goals, away: ovr.away_goals }
    const pred = getEffectivePrediction(predictions as any, fid, config.active_model, {
      a: config.weight_a, b: config.weight_b, c: config.weight_c
    })
    if (!pred) return null
    return { home: Math.round(pred.home_goals), away: Math.round(pred.away_goals) }
  }

  const standings = computeGroupStandings(fixtures as any, teams, getScore)

  return (
    <div className="space-y-4">
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
          {scoreSource === 'predictions' ? 'Showing predicted standings' : 'Showing actual standings from entered results'}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-100 border border-green-200" />
        Top 2 teams qualify for knockout round
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {'ABCDEFGHIJKL'.split('').map(g => (
          <GroupTable key={g} group={g} standings={standings[g] ?? []} />
        ))}
      </div>
    </div>
  )
}
