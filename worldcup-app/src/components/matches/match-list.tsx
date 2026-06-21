'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getFixtures, getTeams, getPredictions, getResults, getResult, getOverride, getConfig } from '@/lib/store'
import { computeHybrid } from '@/lib/models'
import { formatDate, formatTime, pct, goals, MODEL_LABELS, STAGE_LABELS } from '@/lib/utils'
import type { SeedFixture } from '@/lib/seed-data'
import type { SeedPrediction } from '@/lib/seed-data'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import { FixturePredictionPanel } from './fixture-prediction-panel'

const GROUPS = ['All', ...'ABCDEFGHIJKL'.split('')]
const STAGES = [
  { value: 'all', label: 'All Stages' },
  { value: 'group', label: 'Group Stage' },
  { value: 'r32', label: 'Round of 32' },
  { value: 'r16', label: 'Round of 16' },
  { value: 'qf', label: 'Quarter-Finals' },
  { value: 'sf', label: 'Semi-Finals' },
  { value: 'final', label: 'Final' },
]
const MODELS = [
  { value: 'active', label: 'Active Model' },
  { value: 'A', label: 'Model A' },
  { value: 'B', label: 'Model B' },
  { value: 'C', label: 'Model C' },
  { value: 'hybrid', label: 'Hybrid' },
]
const MATCHDAYS = [
  { value: 'all', label: 'All Matchdays' },
  { value: '1', label: 'Matchday 1' },
  { value: '2', label: 'Matchday 2' },
  { value: '3', label: 'Matchday 3' },
]

interface MatchListProps {
  focusFixtureId?: string
}

export function MatchList({ focusFixtureId }: MatchListProps = {}) {
  const [mounted, setMounted]       = useState(false)
  const [group, setGroup]           = useState('All')
  const [stage, setStage]           = useState('all')
  const [modelFilter, setModelFilter] = useState('active')
  const [matchday, setMatchday]     = useState('all')
  const [search, setSearch]         = useState('')
  const focusRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!focusFixtureId || !focusRef.current) return
    // slight delay to let render settle before scrolling
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => clearTimeout(t)
  }, [focusFixtureId, mounted])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures   = getFixtures()
  const teams      = getTeams()
  const predictions = getPredictions()
  const results    = getResults()
  const config     = getConfig()
  const teamMap    = Object.fromEntries(teams.map(t => [t.id, t]))
  const playedIds  = new Set(results.map(r => r.fixture_id))

  const displayModel = modelFilter === 'active' ? config.active_model : modelFilter

  let filtered = fixtures as SeedFixture[]
  if (group !== 'All')   filtered = filtered.filter(f => f.group === group)
  if (stage !== 'all')   filtered = filtered.filter(f => f.stage === stage)
  if (matchday !== 'all') filtered = filtered.filter(f => String(f.matchday) === matchday)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(f => {
      const h = teamMap[f.home_team_id]
      const a = teamMap[f.away_team_id]
      return h?.name.toLowerCase().includes(q) || a?.name.toLowerCase().includes(q) ||
             h?.code.toLowerCase().includes(q) || a?.code.toLowerCase().includes(q)
    })
  }
  filtered = filtered.sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  const getPred = (fid: string, model: string) => {
    if (model === 'hybrid') {
      return computeHybrid(predictions as any, fid, { a: config.weight_a, b: config.weight_b, c: config.weight_c })
    }
    if (model === 'active') {
      if (config.active_model === 'hybrid') {
        return computeHybrid(predictions as any, fid, { a: config.weight_a, b: config.weight_b, c: config.weight_c })
      }
      return predictions.find(p => p.fixture_id === fid && p.model === config.active_model) ?? null
    }
    return predictions.find(p => p.fixture_id === fid && p.model === model) ?? null
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          options={GROUPS.map(g => ({ value: g, label: g === 'All' ? 'All Groups' : `Group ${g}` }))}
          value={group}
          onChange={e => setGroup(e.target.value)}
          label="Group"
        />
        <Select
          options={MATCHDAYS}
          value={matchday}
          onChange={e => setMatchday(e.target.value)}
          label="Matchday"
        />
        <Select
          options={MODELS}
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          label="Show Model"
        />
        <Input
          label="Search team"
          placeholder="e.g. Brazil"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="text-xs text-zinc-400">{filtered.length} matches</div>

      {/* Match rows */}
      <div className="space-y-1">
        {filtered.map(f => {
          const home = teamMap[f.home_team_id]
          const away = teamMap[f.away_team_id]
          const isFocused  = f.id === focusFixtureId
          const isPlayed   = playedIds.has(f.id)
          const now        = new Date()
          const kickoff    = new Date(f.kickoff_utc)
          const isUpcoming = kickoff > now && !isPlayed

          // Auto-expand the focused upcoming fixture as a prediction workspace
          if (isFocused && isUpcoming) {
            return (
              <div key={f.id} ref={focusRef}>
                <FixturePredictionPanel fixture={f} home={home} away={away} />
              </div>
            )
          }

          // All other rows: standard link card
          const pred     = getPred(f.id, displayModel as string)
          const result   = getResult(f.id)
          const override = getOverride(f.id)

          return (
            <Link key={f.id} href={`/matches/${f.id}`}>
              <Card className="hover:border-zinc-300 cursor-pointer transition-colors">
                <div className="px-3 py-2.5">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      {f.group && <Badge variant="outline">Grp {f.group}</Badge>}
                      {f.matchday && <span>MD{f.matchday}</span>}
                      <span>{formatDate(f.kickoff_utc)}</span>
                      <span>{formatTime(f.kickoff_utc)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {result && <Badge variant="success">Final</Badge>}
                      {override && !result && <Badge variant="warning">Override</Badge>}
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                    </div>
                  </div>

                  {/* Teams + score */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-lg">{home?.flag_url}</span>
                      <span className="text-sm font-semibold text-zinc-900 truncate">{home?.name}</span>
                    </div>

                    <div className="text-center shrink-0">
                      {result ? (
                        <span className="text-base font-bold text-zinc-900">{result.home_goals} – {result.away_goals}</span>
                      ) : override ? (
                        <span className="text-sm font-medium text-orange-600">{override.home_goals} – {override.away_goals}</span>
                      ) : pred ? (
                        <span className="text-sm font-medium text-zinc-500">{goals(pred.home_goals)} – {goals(pred.away_goals)}</span>
                      ) : (
                        <span className="text-sm text-zinc-300">vs</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-semibold text-zinc-900 truncate">{away?.name}</span>
                      <span className="text-lg">{away?.flag_url}</span>
                    </div>
                  </div>

                  {/* Probability bar */}
                  {pred && !result && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-8 text-right">{pct(pred.home_win_prob)}</span>
                      <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-100 flex">
                        <div className="h-full bg-blue-500 rounded-l-full transition-all" style={{ width: `${pred.home_win_prob * 100}%` }} />
                        <div className="h-full bg-zinc-300 transition-all" style={{ width: `${pred.draw_prob * 100}%` }} />
                        <div className="h-full bg-red-400 rounded-r-full transition-all" style={{ width: `${pred.away_win_prob * 100}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 w-8">{pct(pred.away_win_prob)}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
