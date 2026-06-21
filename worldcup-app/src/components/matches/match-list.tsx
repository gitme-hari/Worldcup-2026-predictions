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

function sourceLabel(source: string | undefined): string {
  if (source === 'pool_recommendation') return 'Pool pick'
  if (source === 'custom') return 'Custom override'
  if (source === 'calibrated') return 'Calibrated pick'
  return 'Model pick'
}

// ── Per-row state renderers ─────────────────────────────────────────────────

function NeedsPickRow({ fix, modelH, modelA, modelLabel, poolH, poolA }: {
  fix: SeedFixture
  modelH: number; modelA: number; modelLabel: string
  poolH?: number; poolA?: number
}) {
  const hasPRec = poolH !== undefined && poolA !== undefined
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {fix.group && <span className="rounded border border-zinc-200 px-1.5 py-0.5">Grp {fix.group}</span>}
          {fix.matchday && <span>MD{fix.matchday}</span>}
          <span>{formatDate(fix.kickoff_utc)}</span>
          <span>{formatTime(fix.kickoff_utc)}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
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

function LockedRow({ fix, lockedH, lockedA, source, poolH, poolA }: {
  fix: SeedFixture
  lockedH: number; lockedA: number; source: string | undefined
  poolH?: number; poolA?: number
}) {
  const differsFromRec = poolH !== undefined && poolA !== undefined &&
    (lockedH !== poolH || lockedA !== poolA)
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {fix.group && <span className="rounded border border-zinc-200 px-1.5 py-0.5">Grp {fix.group}</span>}
          {fix.matchday && <span>MD{fix.matchday}</span>}
          <span>{formatDate(fix.kickoff_utc)}</span>
          <span>{formatTime(fix.kickoff_utc)}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          ✓ Locked
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-zinc-900">
            Your pick: <span className="tabular-nums">{lockedH}–{lockedA}</span>
          </p>
          <p className="text-xs text-zinc-400">{sourceLabel(source)}</p>
          {differsFromRec && (
            <p className="text-xs text-zinc-400">Pool rec: {poolH}–{poolA}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
      </div>
    </div>
  )
}

function FinalRow({ fix, actualH, actualA, lockedH, lockedA, source }: {
  fix: SeedFixture
  actualH: number; actualA: number
  lockedH?: number; lockedA?: number; source?: string
}) {
  const myPts = lockedH !== undefined && lockedA !== undefined
    ? poolScore(lockedH, lockedA, actualH, actualA) : null

  const ptsLabel = myPts === null ? null
    : myPts === 4 ? '4 pts · Exact!'
    : myPts === 2 ? '2 pts · Correct winner + GD'
    : myPts === 1 ? '1 pt · Correct winner'
    : '0 pts'
  const ptsColor = myPts === 4 ? 'text-green-600 font-semibold'
    : myPts === 2 ? 'text-blue-600 font-semibold'
    : myPts === 1 ? 'text-zinc-600'
    : 'text-red-500'

  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {fix.group && <span className="rounded border border-zinc-200 px-1.5 py-0.5">Grp {fix.group}</span>}
          {fix.matchday && <span>MD{fix.matchday}</span>}
          <span>{formatDate(fix.kickoff_utc)}</span>
        </div>
        <Badge variant="success">Final</Badge>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-xl font-black text-zinc-900 tabular-nums">{actualH}–{actualA}</p>
          {lockedH !== undefined && lockedA !== undefined && (
            <p className="text-xs text-zinc-400">
              My pick: <span className="font-medium text-zinc-600">{lockedH}–{lockedA}</span>
              {ptsLabel && <span className={` ml-1.5 ${ptsColor}`}>· {ptsLabel}</span>}
            </p>
          )}
          {lockedH === undefined && (
            <p className="text-xs text-zinc-300">No pick submitted</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
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
                lockedH={locked?.home_goals} lockedA={locked?.away_goals}
                source={locked?.pick_source}
              />
            )
          } else if (isLocked) {
            rowContent = (
              <LockedRow
                fix={f}
                lockedH={locked.home_goals} lockedA={locked.away_goals}
                source={locked.pick_source}
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
