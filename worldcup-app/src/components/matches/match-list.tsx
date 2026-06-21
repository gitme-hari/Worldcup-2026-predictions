'use client'
import { useState, useEffect, useRef } from 'react'
import {
  getFixtures, getTeams, getPredictions, getResults,
  getLockedPredictions, getPoolRecommendation, getConfig,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import { computeHybrid } from '@/lib/models'
import { formatDate } from '@/lib/utils'
import type { SeedFixture } from '@/lib/seed-data'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FixturePredictionPanel } from './fixture-prediction-panel'

const MODELS = [
  { value: 'active', label: 'Active Model' },
  { value: 'A', label: 'Model A' },
  { value: 'B', label: 'Model B' },
  { value: 'C', label: 'Model C' },
  { value: 'hybrid', label: 'Hybrid' },
]

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function topScoreline(hl: number, al: number): { h: number; a: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (p > best.p) best = { h, a, p }
    }
  return { h: best.h, a: best.a }
}

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (predH === actH && predA === actA) return 4
  const predGD = predH - predA, actGD = actH - actA
  const predW = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW  = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && predGD === actGD) return 2
  if (predW === actW) return 1
  return 0
}

// ── Shared chips ─────────────────────────────────────────────────────────────

function SourceChip({ source }: { source?: string }) {
  if (source === 'pool_recommendation')
    return <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Pool pick</span>
  if (source === 'custom')
    return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Custom</span>
  if (source === 'backfilled')
    return <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">Backfilled</span>
  return <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Model pick</span>
}

function PtsChip({ pts }: { pts: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    4: { label: '4 pts · Exact!',    cls: 'bg-green-100 text-green-700' },
    2: { label: '2 pts · Winner+GD', cls: 'bg-blue-100 text-blue-700'   },
    1: { label: '1 pt · Winner',     cls: 'bg-zinc-100 text-zinc-600'   },
    0: { label: '0 pts · Miss',      cls: 'bg-red-100 text-red-600'     },
  }
  const c = map[pts] ?? map[0]
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>{c.label}</span>
}

// ── Row header (always visible) ───────────────────────────────────────────────

function RowHeader({ fix, home, away, isExpanded, onToggle, state }: {
  fix: SeedFixture
  home: { name: string; flag_url?: string | null } | undefined
  away: { name: string; flag_url?: string | null } | undefined
  isExpanded: boolean
  onToggle: () => void
  state: 'needs-pick' | 'locked' | 'final'
}) {
  const stateBadge =
    state === 'final'      ? <Badge variant="success">Final</Badge>
    : state === 'locked'   ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">✓ Locked</span>
    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs Pick</span>

  return (
    <button
      onClick={onToggle}
      className="w-full text-left"
      aria-expanded={isExpanded}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Teams */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base leading-none">{home?.flag_url}</span>
          <span className="text-sm font-semibold text-zinc-900 truncate">{home?.name}</span>
        </div>
        <span className="text-[10px] text-zinc-300 shrink-0">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-zinc-900 truncate">{away?.name}</span>
          <span className="text-base leading-none">{away?.flag_url}</span>
        </div>
        {/* State badge */}
        <div className="shrink-0 ml-1">{stateBadge}</div>
        {/* Expand chevron */}
        <div className="shrink-0 text-zinc-400 ml-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 px-3 pb-2 text-[10px] text-zinc-400">
        {fix.group && <span className="rounded border border-zinc-100 px-1 py-0.5">Grp {fix.group}</span>}
        {fix.matchday && <span>MD{fix.matchday}</span>}
        <span>{formatDate(fix.kickoff_utc)}</span>
      </div>
    </button>
  )
}

// ── Expanded body for completed (played) matches ──────────────────────────────

function FinalBody({ actualH, actualA, locked }: {
  actualH: number; actualA: number; locked?: LockedPrediction
}) {
  if (!locked) {
    return (
      <div className="border-t border-zinc-100 px-4 py-3 flex items-center gap-3 bg-amber-50">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">Actual</p>
          <p className="text-2xl font-black text-zinc-900 tabular-nums">{actualH}–{actualA}</p>
        </div>
        <p className="text-xs text-amber-700 font-semibold">No pick recorded · use Recovery tab in Settings to backfill</p>
      </div>
    )
  }

  const rH  = Math.round(locked.home_goals)
  const rA  = Math.round(locked.away_goals)
  const pts = poolScore(rH, rA, actualH, actualA)
  const isDecimal = locked.home_goals !== rH || locked.away_goals !== rA

  return (
    <div className="border-t border-zinc-100 px-4 py-3 bg-white">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">Actual</p>
          <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{actualH}–{actualA}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">My Pick</p>
          <p className="text-xl font-bold text-zinc-800 tabular-nums leading-none">{rH}–{rA}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <SourceChip source={locked.pick_source} />
            {locked.model && <span className="text-[10px] text-zinc-400">Mdl {locked.model}</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Points</p>
          <PtsChip pts={pts} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">Model</p>
          {isDecimal
            ? <p className="text-[10px] text-zinc-500">Model value: {locked.home_goals.toFixed(1)}–{locked.away_goals.toFixed(1)}</p>
            : locked.pool_rec_home !== undefined && locked.home_goals !== locked.pool_rec_home
            ? <p className="text-[10px] text-zinc-400">Pool rec: {locked.pool_rec_home}–{locked.pool_rec_away}</p>
            : <p className="text-[10px] text-zinc-300">—</p>}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface MatchListProps {
  focusFixtureId?: string
}

export function MatchList({ focusFixtureId }: MatchListProps = {}) {
  const [mounted, setMounted]         = useState(false)
  const [group, setGroup]             = useState('All')
  const [modelFilter, setModelFilter] = useState('active')
  const [matchday, setMatchday]       = useState('all')
  const [search, setSearch]           = useState('')
  const [expandedId, setExpandedId]   = useState<string | null>(focusFixtureId ?? null)
  const focusRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Update expandedId when URL param changes (e.g. dashboard deep-link)
  useEffect(() => {
    if (focusFixtureId) setExpandedId(focusFixtureId)
  }, [focusFixtureId])

  useEffect(() => {
    if (!focusFixtureId || !focusRef.current) return
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => clearTimeout(t)
  }, [focusFixtureId, mounted])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures    = getFixtures()
  const teams       = getTeams()
  const predictions = getPredictions()
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const config      = getConfig()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const resultMap   = Object.fromEntries(results.map(r => [r.fixture_id, r]))
  const lockedMap   = Object.fromEntries(lockedPreds.map(p => [p.fixture_id, p]))

  const displayModel = modelFilter === 'active' ? config.active_model : modelFilter

  let filtered = fixtures as SeedFixture[]
  if (group !== 'All') filtered = filtered.filter(f => f.group === group)
  if (matchday !== 'all') filtered = filtered.filter(f => String(f.matchday) === matchday)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(f => {
      const h = teamMap[f.home_team_id], a = teamMap[f.away_team_id]
      return h?.name.toLowerCase().includes(q) || a?.name.toLowerCase().includes(q) ||
             h?.code.toLowerCase().includes(q) || a?.code.toLowerCase().includes(q)
    })
  }
  filtered = filtered.sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  const now = new Date()

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          options={['All', ...'ABCDEFGHIJKL'.split('')].map(g => ({ value: g, label: g === 'All' ? 'All Groups' : `Group ${g}` }))}
          value={group}
          onChange={e => setGroup(e.target.value)}
          label="Group"
        />
        <Select
          options={[{ value: 'all', label: 'All Matchdays' }, { value: '1', label: 'MD 1' }, { value: '2', label: 'MD 2' }, { value: '3', label: 'MD 3' }]}
          value={matchday}
          onChange={e => setMatchday(e.target.value)}
          label="Matchday"
        />
        <Select
          options={MODELS}
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          label="Model"
        />
        <Input
          label="Search team"
          placeholder="e.g. Brazil"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="text-xs text-zinc-400">{filtered.length} matches</div>

      <div className="space-y-1.5">
        {filtered.map(f => {
          const home       = teamMap[f.home_team_id]
          const away       = teamMap[f.away_team_id]
          const result     = resultMap[f.id]
          const locked     = lockedMap[f.id]
          const isPlayed   = !!result
          const isLocked   = !!locked && !isPlayed
          const isExpanded = expandedId === f.id
          const isFocused  = f.id === focusFixtureId

          const rowState: 'final' | 'locked' | 'needs-pick' =
            isPlayed ? 'final' : isLocked ? 'locked' : 'needs-pick'

          return (
            <div
              key={f.id}
              ref={isFocused ? focusRef : undefined}
            >
              <Card className={`overflow-hidden transition-colors ${
                isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : ''
              } ${isFocused && !isExpanded ? 'border-blue-200' : ''}`}>
                <RowHeader
                  fix={f}
                  home={home}
                  away={away}
                  isExpanded={isExpanded}
                  onToggle={() => toggle(f.id)}
                  state={rowState}
                />

                {/* Accordion body */}
                {isExpanded && (
                  isPlayed
                    ? <FinalBody actualH={result.home_goals} actualA={result.away_goals} locked={locked ?? undefined} />
                    : <FixturePredictionPanel fixture={f} home={home} away={away} />
                )}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
