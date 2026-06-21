'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  getFixtures, getTeams, getPredictions, getResults, getResult,
  getLockedPredictions, getLockedPrediction, getPoolRecommendation, getConfig,
} from '@/lib/store'
import { computeHybrid } from '@/lib/models'
import { formatDate, formatTime, pct, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import type { SeedFixture } from '@/lib/seed-data'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChevronRight, Lock } from 'lucide-react'
import { FixturePredictionPanel } from './fixture-prediction-panel'
import type { LockedPrediction } from '@/lib/store'

const GROUPS    = ['All', ...'ABCDEFGHIJKL'.split('')]
const MODELS    = [
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

// ── Shared chips ────────────────────────────────────────────────────────────

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
    4: { label: '4 pts · Exact!',       cls: 'bg-green-100 text-green-700' },
    2: { label: '2 pts · Winner+GD',    cls: 'bg-blue-100 text-blue-700'   },
    1: { label: '1 pt · Winner',        cls: 'bg-zinc-100 text-zinc-600'   },
    0: { label: '0 pts · Miss',         cls: 'bg-red-100 text-red-600'     },
  }
  const c = map[pts] ?? map[0]
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>{c.label}</span>
}

function MatchMeta({ fix }: { fix: SeedFixture }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
      {fix.group && <span className="rounded border border-zinc-100 px-1 py-0.5">Grp {fix.group}</span>}
      {fix.matchday && <span>MD{fix.matchday}</span>}
      <span>{formatDate(fix.kickoff_utc)}</span>
    </div>
  )
}

// ── Per-row state renderers ─────────────────────────────────────────────────

function NeedsPickRow({ fix, modelH, modelA, modelLabel, poolH, poolA }: {
  fix: SeedFixture
  modelH: number; modelA: number; modelLabel: string
  poolH?: number; poolA?: number
}) {
  const hasPRec = poolH !== undefined && poolA !== undefined
  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <MatchMeta fix={fix} />
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Needs Pick
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          {hasPRec ? (
            <>
              <p className="text-sm font-bold text-zinc-900">
                Recommended: <span className="tabular-nums">{poolH}–{poolA}</span>
              </p>
              <p className="text-xs text-zinc-400">
                Model {modelLabel}: {topScoreline(modelH, modelA).h}–{topScoreline(modelH, modelA).a}
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-400">
              Model {modelLabel}: {topScoreline(modelH, modelA).h}–{topScoreline(modelH, modelA).a}
            </p>
          )}
        </div>
        <Link
          href={`/matches?fixture=${fix.id}&expand=true`}
          onClick={e => e.stopPropagation()}
          className="shrink-0 flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          <Lock className="h-3 w-3" /> Review & Lock
        </Link>
      </div>
    </div>
  )
}

function LockedRow({ fix, locked, poolH, poolA }: {
  fix: SeedFixture
  locked: LockedPrediction
  poolH?: number; poolA?: number
}) {
  const rH = Math.round(locked.home_goals)
  const rA = Math.round(locked.away_goals)
  const isDecimal = locked.home_goals !== rH || locked.away_goals !== rA
  const differsFromRec = poolH !== undefined && poolA !== undefined && (rH !== poolH || rA !== poolA)

  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <MatchMeta fix={fix} />
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
          ✓ Locked
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-zinc-900 tabular-nums">{rH}–{rA}</span>
            <SourceChip source={locked.pick_source} />
            {locked.model && <span className="text-[10px] text-zinc-400">Mdl {locked.model}</span>}
          </div>
          {isDecimal && (
            <p className="text-[10px] text-zinc-400">Model value: {locked.home_goals.toFixed(1)}–{locked.away_goals.toFixed(1)}</p>
          )}
          {differsFromRec && (
            <p className="text-[10px] text-zinc-400">Pool rec: {poolH}–{poolA}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
      </div>
    </div>
  )
}

function FinalRow({ fix, actualH, actualA, locked }: {
  fix: SeedFixture
  actualH: number; actualA: number
  locked?: LockedPrediction
}) {
  if (!locked) {
    return (
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">Actual</p>
          <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{actualH}–{actualA}</p>
        </div>
        <div className="flex-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
          <p className="text-xs font-semibold text-amber-700">No pick recorded</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Tap to backfill this result</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
      </div>
    )
  }

  // Always display and score using rounded integers — model decimal is secondary context
  const rH  = Math.round(locked.home_goals)
  const rA  = Math.round(locked.away_goals)
  const pts = poolScore(rH, rA, actualH, actualA)
  const isDecimal = locked.home_goals !== rH || locked.away_goals !== rA

  return (
    <div className="px-3 py-2.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Block 1: Actual */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">Actual</p>
          <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{actualH}–{actualA}</p>
        </div>

        {/* Block 2: My Pick */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">My Pick</p>
          <p className="text-xl font-bold text-zinc-800 tabular-nums leading-none">{rH}–{rA}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <SourceChip source={locked.pick_source} />
            {locked.model && <span className="text-[10px] text-zinc-400">Mdl {locked.model}</span>}
          </div>
        </div>

        {/* Block 3: Points */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-1">Points</p>
          <PtsChip pts={pts} />
        </div>

        {/* Block 4: Model */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">Model</p>
          {isDecimal ? (
            <p className="text-[10px] text-zinc-500 leading-snug">
              Model value: {locked.home_goals.toFixed(1)}–{locked.away_goals.toFixed(1)}
            </p>
          ) : locked.pool_rec_home !== undefined && locked.pool_rec_away !== undefined &&
              (locked.pool_rec_home !== rH || locked.pool_rec_away !== rA) ? (
            <p className="text-[10px] text-zinc-400">Pool rec: {locked.pool_rec_home}–{locked.pool_rec_away}</p>
          ) : (
            <p className="text-[10px] text-zinc-300">—</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

interface MatchListProps {
  focusFixtureId?: string
}

export function MatchList({ focusFixtureId }: MatchListProps = {}) {
  const [mounted, setMounted]         = useState(false)
  const [group, setGroup]             = useState('All')
  const [modelFilter, setModelFilter] = useState('active')
  const [matchday, setMatchday]       = useState('all')
  const [search, setSearch]           = useState('')
  const focusRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

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

  const getModelPred = (fid: string) => {
    if (displayModel === 'hybrid' || config.active_model === 'hybrid') {
      return computeHybrid(predictions as any, fid, { a: config.weight_a, b: config.weight_b, c: config.weight_c })
    }
    return predictions.find(p => p.fixture_id === fid && p.model === displayModel) ?? null
  }

  const now = new Date()

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
          const home    = teamMap[f.home_team_id]
          const away    = teamMap[f.away_team_id]
          const result  = resultMap[f.id]
          const locked  = lockedMap[f.id]
          const poolRec = getPoolRecommendation(f.id)
          const pred    = getModelPred(f.id)
          const isUpcoming = new Date(f.kickoff_utc) > now

          const isFocused = f.id === focusFixtureId

          // Auto-expand focused upcoming fixture as prediction workspace
          if (isFocused && isUpcoming && !result) {
            return (
              <div key={f.id} ref={focusRef}>
                {/* Team header above panel */}
                <div className="flex items-center gap-3 px-1 pb-1 text-sm font-semibold text-zinc-900">
                  <span>{home?.flag_url}</span>
                  <span>{home?.code ?? f.home_team_id}</span>
                  <span className="text-zinc-300 font-normal text-xs">vs</span>
                  <span>{away?.code ?? f.away_team_id}</span>
                  <span>{away?.flag_url}</span>
                </div>
                <FixturePredictionPanel fixture={f} home={home} away={away} />
              </div>
            )
          }

          // Determine state for standard rows
          const isPlayed = !!resultMap[f.id]
          const isLocked = !!locked && !isPlayed

          let rowContent: React.ReactNode

          if (isPlayed) {
            const r = resultMap[f.id]
            rowContent = (
              <FinalRow
                fix={f}
                actualH={r.home_goals} actualA={r.away_goals}
                locked={locked ?? undefined}
              />
            )
          } else if (isLocked) {
            rowContent = (
              <LockedRow
                fix={f}
                locked={locked}
                poolH={poolRec?.recommended_home} poolA={poolRec?.recommended_away}
              />
            )
          } else {
            rowContent = (
              <NeedsPickRow
                fix={f}
                modelH={pred?.home_goals ?? 1} modelA={pred?.away_goals ?? 1}
                modelLabel={displayModel === 'active' ? config.active_model : displayModel}
                poolH={poolRec?.recommended_home} poolA={poolRec?.recommended_away}
              />
            )
          }

          return (
            <Link
              key={f.id}
              href={isPlayed || isLocked ? `/matches/${f.id}` : `/matches?fixture=${f.id}&expand=true`}
            >
              <Card className={`cursor-pointer transition-colors hover:border-zinc-300 ${isFocused ? 'border-blue-300 ring-1 ring-blue-100' : ''}`}>
                {/* Team names row */}
                <div className="flex items-center gap-3 border-b border-zinc-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-base">{home?.flag_url}</span>
                    <span className="text-sm font-semibold text-zinc-900 truncate">{home?.name}</span>
                  </div>
                  <span className="text-xs text-zinc-300 shrink-0">vs</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-semibold text-zinc-900 truncate">{away?.name}</span>
                    <span className="text-base">{away?.flag_url}</span>
                  </div>
                </div>
                {rowContent}
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
