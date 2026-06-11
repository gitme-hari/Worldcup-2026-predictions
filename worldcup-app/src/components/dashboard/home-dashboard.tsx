'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConfig, getTeams, getFixtures, getPredictions, getResults, getResult, getBestModel, computeMetrics, getBonusPredictions } from '@/lib/store'
import { computeGroupStandings, getEffectivePrediction } from '@/lib/models'
import { MODEL_LABELS, MODEL_COLORS, formatDate, formatTime, pct, goals } from '@/lib/utils'
import type { ModelConfig } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingUp, Calendar, Star, ChevronRight, Target } from 'lucide-react'

function TodayMatches() {
  const fixtures = getFixtures()
  const teams = getTeams()
  const predictions = getPredictions()
  const config = getConfig()
  const results = getResults()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const upcomingDays = 3

  const upcoming = fixtures
    .filter(f => {
      const d = new Date(f.kickoff_utc)
      const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000)
      return diffDays >= -1 && diffDays <= upcomingDays
    })
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .slice(0, 8)

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Upcoming Matches</CardTitle>
        <Link href="/matches" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">All <ChevronRight className="h-3 w-3" /></Link>
      </CardHeader>
      <CardContent className="p-0">
        {upcoming.length === 0 ? (
          <p className="px-4 py-3 text-xs text-zinc-400">No upcoming matches</p>
        ) : upcoming.map(f => {
          const home = teamMap[f.home_team_id]
          const away = teamMap[f.away_team_id]
          const pred = getEffectivePrediction(predictions as any, f.id, config.active_model, {
            a: config.weight_a, b: config.weight_b, c: config.weight_c
          })
          const result = getResult(f.id)
          const matchDate = new Date(f.kickoff_utc)
          const isToday = matchDate.toISOString().split('T')[0] === todayStr

          return (
            <Link key={f.id} href={`/matches/${f.id}`} className="block border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
              <div className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{home?.flag_url}</span>
                    <span className="text-xs font-medium text-zinc-900 truncate">{home?.code}</span>
                    {result ? (
                      <span className="text-xs font-bold text-zinc-900 mx-1">{result.home_goals}–{result.away_goals}</span>
                    ) : pred ? (
                      <span className="text-xs text-zinc-400 mx-1">{goals(pred.home_goals)}–{goals(pred.away_goals)}</span>
                    ) : null}
                    <span className="text-xs font-medium text-zinc-900 truncate">{away?.code}</span>
                    <span className="text-base">{away?.flag_url}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isToday && <Badge variant="warning">Today</Badge>}
                    {result && <Badge variant="success">Final</Badge>}
                    <span className="text-xs text-zinc-400">{f.group ? `Grp ${f.group}` : f.stage.toUpperCase()}</span>
                    <span className="text-xs text-zinc-400">{formatTime(f.kickoff_utc)}</span>
                  </div>
                </div>
                {pred && !result && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-100 flex">
                      <div className="h-full bg-blue-500 rounded-l-full" style={{ width: `${pred.home_win_prob * 100}%` }} />
                      <div className="h-full bg-zinc-300" style={{ width: `${pred.draw_prob * 100}%` }} />
                      <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${pred.away_win_prob * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {pct(pred.home_win_prob)} / {pct(pred.draw_prob)} / {pct(pred.away_win_prob)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function TopPredictions() {
  const teams = getTeams()
  const fixtures = getFixtures()
  const predictions = getPredictions()
  const config = getConfig()
  const bonus = getBonusPredictions()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const getScore = (fid: string) => {
    const pred = getEffectivePrediction(predictions as any, fid, config.active_model, {
      a: config.weight_a, b: config.weight_b, c: config.weight_c
    })
    if (!pred) return null
    return { home: Math.round(pred.home_goals), away: Math.round(pred.away_goals) }
  }

  const standings = computeGroupStandings(fixtures as any, teams, getScore)

  const groupWinners = 'ABCDEFGHIJKL'.split('').map(g => ({
    group: g,
    team: standings[g]?.[0]?.team,
  }))

  const champion = bonus.find(b => b.key === 'champion')?.team_id
  const champTeam = champion ? teamMap[champion] : groupWinners[0]?.team

  const sfTeams = ['sf1','sf2','sf3','sf4'].map(k => {
    const id = bonus.find(b => b.key === k)?.team_id
    return id ? teamMap[id] : null
  }).filter(Boolean)

  const topScorerTeam = bonus.find(b => b.key === 'top_scorer_team')?.team_id
  const topScorerTeamData = topScorerTeam ? teamMap[topScorerTeam] : null

  return (
    <div className="space-y-3">
      {champTeam && (
        <Card>
          <CardContent className="flex items-center gap-2 py-2.5">
            <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="text-xs font-medium text-zinc-500">Predicted Champion</span>
            <span className="ml-auto flex items-center gap-1.5 text-sm font-bold text-zinc-900">
              <span>{champTeam.flag_url}</span> {champTeam.name}
            </span>
          </CardContent>
        </Card>
      )}

      {sfTeams.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Predicted Semi-Finalists</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 py-2">
            {sfTeams.map((t, i) => t && (
              <span key={i} className="flex items-center gap-1 text-xs text-zinc-900">
                {t.flag_url} {t.name}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" />Group Winners</CardTitle>
          <Link href="/groups" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-zinc-50">
            {groupWinners.map(({ group, team }) => (
              <div key={group} className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs font-bold text-zinc-400 w-3">{group}</span>
                {team ? (
                  <span className="flex items-center gap-1 text-xs text-zinc-900 min-w-0">
                    <span>{team.flag_url}</span>
                    <span className="truncate">{team.code}</span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-300">—</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ModelPerformance() {
  const metrics = computeMetrics()
  const best = getBestModel()
  const withData = metrics.filter(m => m.total > 0)

  if (withData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Model Performance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">No results entered yet. Enter match results to see model metrics.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Model Performance</CardTitle>
        <Link href="/metrics" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">Full <ChevronRight className="h-3 w-3" /></Link>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Model</th>
              <th className="px-4 py-2 text-right font-medium text-zinc-500">Acc%</th>
              <th className="px-4 py-2 text-right font-medium text-zinc-500">Brier</th>
              <th className="px-4 py-2 text-right font-medium text-zinc-500">N</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.model} className={`border-b border-zinc-50 ${best === m.model ? 'bg-green-50' : ''}`}>
                <td className="px-4 py-2 font-medium text-zinc-900">
                  Model {m.model}
                  {best === m.model && <span className="ml-1 text-green-600">★</span>}
                </td>
                <td className="px-4 py-2 text-right text-zinc-700">{m.total > 0 ? `${(m.accuracy * 100).toFixed(0)}%` : '—'}</td>
                <td className="px-4 py-2 text-right text-zinc-700">{m.total > 0 ? m.avgBrier.toFixed(3) : '—'}</td>
                <td className="px-4 py-2 text-right text-zinc-400">{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function ActiveModelCard() {
  const config = getConfig()
  const best = getBestModel()
  const metrics = computeMetrics()

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-3 text-white">
      <div>
        <div className="text-xs text-zinc-400">Active Model</div>
        <div className="text-base font-bold">{MODEL_LABELS[config.active_model]}</div>
        {config.active_model === 'hybrid' && (
          <div className="text-xs text-zinc-400 mt-0.5">A:{config.weight_a} B:{config.weight_b} C:{config.weight_c}</div>
        )}
      </div>
      {best && (
        <div className="text-right">
          <div className="text-xs text-zinc-400">Best Performing</div>
          <div className="text-base font-bold text-green-400">Model {best}</div>
          <div className="text-xs text-zinc-400">{(metrics.find(m => m.model === best)?.accuracy ?? 0 * 100).toFixed(0)}% acc</div>
        </div>
      )}
    </div>
  )
}

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <ActiveModelCard />
      <TodayMatches />
      <TopPredictions />
      <ModelPerformance />
    </div>
  )
}
