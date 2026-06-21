'use client'
import { useState, useEffect, useRef } from 'react'
import {
  getFixtures, getTeams, getResults,
  getLockedPredictions,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import type { SeedFixture } from '@/lib/seed-data'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FixturePredictionPanel } from './fixture-prediction-panel'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceLabel(src?: string, model?: string): string {
  const mdl = model ? ` · Mdl ${model}` : ''
  if (src === 'pool_recommendation') return `Pool Pick${mdl}`
  if (src === 'custom')              return `Custom${mdl}`
  if (src === 'backfilled')         return 'Backfilled'
  return `Model Pick${mdl}`
}

// ── Completed match card (no accordion — always shows result strip) ────────────

function FinalCard({ fix, home, away, actualH, actualA, locked }: {
  fix: SeedFixture
  home: { name: string; flag_url?: string | null } | undefined
  away: { name: string; flag_url?: string | null } | undefined
  actualH: number
  actualA: number
  locked?: LockedPrediction
}) {
  const rH  = locked ? Math.round(locked.home_goals) : null
  const rA  = locked ? Math.round(locked.away_goals) : null
  const pts = (rH !== null && rA !== null) ? poolScore(rH, rA, actualH, actualA) : null
  const isDecimal = locked && (locked.home_goals !== rH || locked.away_goals !== rA)

  const ptsConfig: Record<number, { label: string; cls: string }> = {
    4: { label: '4 pts ✓ Exact',      cls: 'text-green-700 bg-green-50' },
    2: { label: '2 pts ✓ Winner+GD',  cls: 'text-blue-700 bg-blue-50'   },
    1: { label: '1 pt ✓ Winner',      cls: 'text-amber-700 bg-amber-50' },
    0: { label: '0 pts ✗ Missed',     cls: 'text-red-700 bg-red-50'     },
  }

  return (
    <div className="px-3 py-2.5">
      {/* Teams row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base leading-none">{home?.flag_url}</span>
          <span className="text-sm font-semibold text-zinc-900 truncate">{home?.name}</span>
        </div>
        <span className="text-[10px] text-zinc-300 shrink-0">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-zinc-900 truncate">{away?.name}</span>
          <span className="text-base leading-none">{away?.flag_url}</span>
        </div>
        <Badge variant="success" className="shrink-0 ml-1">Final</Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 mb-2.5 text-[10px] text-zinc-400">
        {fix.group && <span className="rounded border border-zinc-100 px-1 py-0.5">Grp {fix.group}</span>}
        {fix.matchday && <span>MD{fix.matchday}</span>}
        <span>{formatDate(fix.kickoff_utc)}</span>
      </div>

      {/* Result strip */}
      {locked && rH !== null && rA !== null && pts !== null ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 border-t border-zinc-100 pt-2.5">
          {/* Actual */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Actual</p>
            <p className="text-lg font-black text-green-700 tabular-nums leading-none">{actualH}–{actualA}</p>
          </div>
          {/* My Pick */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">My Pick</p>
            <p className="text-lg font-bold text-blue-700 tabular-nums leading-none">{rH}–{rA}</p>
            {isDecimal && (
              <p className="text-[9px] text-zinc-400 mt-0.5">{locked.home_goals.toFixed(1)}–{locked.away_goals.toFixed(1)} xG</p>
            )}
          </div>
          {/* Points */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Points</p>
            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${ptsConfig[pts]?.cls ?? ptsConfig[0].cls}`}>
              {ptsConfig[pts]?.label ?? ptsConfig[0].label}
            </span>
          </div>
          {/* Source */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Source</p>
            <p className="text-[10px] font-medium text-zinc-600 leading-tight">{sourceLabel(locked.pick_source, locked.model)}</p>
          </div>
        </div>
      ) : (
        /* No pick recorded */
        <div className="flex items-center gap-3 border-t border-zinc-100 pt-2.5">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Actual</p>
            <p className="text-lg font-black text-green-700 tabular-nums leading-none">{actualH}–{actualA}</p>
          </div>
          <div className="flex-1">
            <span className="inline-block rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
              No pick recorded · backfill in Settings → Recovery
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Upcoming/locked row header (accordion trigger) ────────────────────────────

function RowHeader({ fix, home, away, isExpanded, onToggle, state }: {
  fix: SeedFixture
  home: { name: string; flag_url?: string | null } | undefined
  away: { name: string; flag_url?: string | null } | undefined
  isExpanded: boolean
  onToggle: () => void
  state: 'needs-pick' | 'locked'
}) {
  const stateBadge = state === 'locked'
    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">✓ Locked</span>
    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs Pick</span>

  return (
    <button
      onClick={onToggle}
      className="w-full text-left"
      aria-expanded={isExpanded}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base leading-none">{home?.flag_url}</span>
          <span className="text-sm font-semibold text-zinc-900 truncate">{home?.name}</span>
        </div>
        <span className="text-[10px] text-zinc-300 shrink-0">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-zinc-900 truncate">{away?.name}</span>
          <span className="text-base leading-none">{away?.flag_url}</span>
        </div>
        <div className="shrink-0 ml-1">{stateBadge}</div>
        <div className="shrink-0 text-zinc-400 ml-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-2 text-[10px] text-zinc-400">
        {fix.group && <span className="rounded border border-zinc-100 px-1 py-0.5">Grp {fix.group}</span>}
        {fix.matchday && <span>MD{fix.matchday}</span>}
        <span>{formatDate(fix.kickoff_utc)}</span>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface MatchListProps {
  focusFixtureId?: string
}

export function MatchList({ focusFixtureId }: MatchListProps = {}) {
  const [mounted, setMounted] = useState(false)
  const [group, setGroup]     = useState('All')
  const [matchday, setMatchday] = useState('all')
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId]   = useState<string | null>(focusFixtureId ?? null)
  const [savedResults, setSavedResults] = useState<Record<string, { home_goals: number; away_goals: number }>>({})
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
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const resultMap   = Object.fromEntries(results.map(r => [r.fixture_id, r]))
  const lockedMap   = Object.fromEntries(lockedPreds.map(p => [p.fixture_id, p]))

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

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          const home           = teamMap[f.home_team_id]
          const away           = teamMap[f.away_team_id]
          const storedResult   = resultMap[f.id]
          const inlineResult   = savedResults[f.id]
          const result         = storedResult ?? (inlineResult ? { ...inlineResult, fixture_id: f.id } : undefined)
          const locked         = lockedMap[f.id]
          const isPlayed       = !!result
          const isLocked       = !!locked && !isPlayed
          const isExpanded = expandedId === f.id
          const isFocused  = f.id === focusFixtureId

          const rowState: 'locked' | 'needs-pick' =
            isLocked ? 'locked' : 'needs-pick'

          return (
            <div
              key={f.id}
              ref={isFocused ? focusRef : undefined}
            >
              {isPlayed ? (
                /* Completed: static strip, no accordion */
                <Card className={`overflow-hidden ${isFocused ? 'border-blue-200' : ''}`}>
                  <FinalCard
                    fix={f}
                    home={home}
                    away={away}
                    actualH={result.home_goals}
                    actualA={result.away_goals}
                    locked={locked ?? undefined}
                  />
                </Card>
              ) : (
                /* Upcoming / locked: accordion */
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
                  {isExpanded && (
                    <FixturePredictionPanel
                      fixture={f}
                      home={home}
                      away={away}
                      onResultSaved={(h, a) => {
                        setSavedResults(prev => ({ ...prev, [f.id]: { home_goals: h, away_goals: a } }))
                        setExpandedId(null)
                      }}
                    />
                  )}
                </Card>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
