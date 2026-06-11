'use client'
import { useState, useEffect } from 'react'
import {
  getFixtures, getTeams, getResult, saveResult, deleteResult,
  getPredictions, getConfig, getLockedPrediction, saveLockPrediction, deleteLockedPrediction,
} from '@/lib/store'
import { getEffectivePrediction } from '@/lib/models'
import { formatDate, formatTime, goals, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Trash2, Check } from 'lucide-react'
import type { SeedFixture } from '@/lib/seed-data'
import type { ModelKey } from '@/lib/types'

const MODEL_OPTIONS: { value: ModelKey; label: string }[] = [
  { value: 'A', label: 'Model A (Poisson)' },
  { value: 'B', label: 'Model B (ML)' },
  { value: 'C', label: 'Model C (Live)' },
  { value: 'hybrid', label: 'Hybrid' },
]

function ResultRow({
  fixture,
  homeTeam,
  awayTeam,
}: {
  fixture: SeedFixture
  homeTeam: { name: string; code: string; flag_url: string } | undefined
  awayTeam: { name: string; code: string; flag_url: string } | undefined
}) {
  const config = getConfig()
  const predictions = getPredictions()

  const locked = getLockedPrediction(fixture.id)
  const existing = getResult(fixture.id)

  const [selectedModel, setSelectedModel] = useState<ModelKey>(
    (locked?.model as ModelKey) ?? config.active_model
  )
  const [isLocked, setIsLocked] = useState(!!locked)
  const [homeActual, setHomeActual] = useState(String(existing?.home_goals ?? ''))
  const [awayActual, setAwayActual] = useState(String(existing?.away_goals ?? ''))
  const [saved, setSaved] = useState(false)

  // Live prediction from currently selected model
  const livePred = getEffectivePrediction(predictions as any, fixture.id, selectedModel, {
    a: config.weight_a, b: config.weight_b, c: config.weight_c,
  })

  const displayPred = isLocked && locked ? locked : livePred

  const handleLock = () => {
    if (!livePred) return
    saveLockPrediction({
      fixture_id: fixture.id,
      model: selectedModel,
      home_goals: livePred.home_goals,
      away_goals: livePred.away_goals,
      home_win_prob: livePred.home_win_prob,
      draw_prob: livePred.draw_prob,
      away_win_prob: livePred.away_win_prob,
    })
    setIsLocked(true)
  }

  const handleUnlock = () => {
    deleteLockedPrediction(fixture.id)
    setIsLocked(false)
  }

  const handleSaveResult = () => {
    const h = parseInt(homeActual, 10)
    const a = parseInt(awayActual, 10)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    // Auto-lock prediction when saving result if not already locked
    if (!isLocked && livePred) handleLock()
    saveResult({ fixture_id: fixture.id, home_goals: h, away_goals: a })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDeleteResult = () => {
    deleteResult(fixture.id)
    setHomeActual(''); setAwayActual('')
  }

  const modelColor = MODEL_COLORS[isLocked ? (locked?.model ?? selectedModel) : selectedModel]

  return (
    <div className="border-b border-zinc-50 px-4 py-3 last:border-0">
      {/* Match header */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-zinc-400 shrink-0">{formatDate(fixture.kickoff_utc)} {formatTime(fixture.kickoff_utc)}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span>{homeTeam?.flag_url}</span>
          <span className="text-xs font-semibold text-zinc-900">{homeTeam?.name}</span>
          <span className="text-xs text-zinc-400">vs</span>
          <span className="text-xs font-semibold text-zinc-900">{awayTeam?.name}</span>
          <span>{awayTeam?.flag_url}</span>
        </div>
        {fixture.group && <Badge variant="outline">Grp {fixture.group}</Badge>}
        {existing && <Badge variant="success">Result entered</Badge>}
      </div>

      {/* Prediction + result row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Model selector / locked label */}
        <div className="shrink-0">
          <div className="text-xs text-zinc-400 mb-1">Model</div>
          {isLocked ? (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white ${modelColor}`}>
                <Lock className="h-2.5 w-2.5" />
                {MODEL_LABELS[locked?.model ?? selectedModel]}
              </span>
              <button onClick={handleUnlock} className="text-zinc-300 hover:text-zinc-500">
                <Unlock className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value as ModelKey)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
            >
              {MODEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Predicted score */}
        <div className="shrink-0">
          <div className="text-xs text-zinc-400 mb-1">Predicted</div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${isLocked ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {displayPred ? `${goals(displayPred.home_goals)} – ${goals(displayPred.away_goals)}` : '—'}
            </span>
            {!isLocked && livePred && (
              <button
                onClick={handleLock}
                className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              >
                <Lock className="h-3 w-3" /> Lock
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="text-zinc-200 text-lg shrink-0 hidden sm:block">│</div>

        {/* Actual score entry */}
        <div className="shrink-0">
          <div className="text-xs text-zinc-400 mb-1">Actual result</div>
          {existing && homeActual === String(existing.home_goals) && awayActual === String(existing.away_goals) && !saved ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900">{existing.home_goals} – {existing.away_goals}</span>
              <button
                onClick={() => { setHomeActual(String(existing.home_goals)); setAwayActual(String(existing.away_goals)) }}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline"
              >Edit</button>
              <button onClick={handleDeleteResult} className="text-zinc-300 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" max="20" value={homeActual}
                onChange={e => setHomeActual(e.target.value)}
                placeholder="0"
                className="w-12 rounded border border-zinc-300 px-2 py-1 text-center text-sm font-bold focus:border-blue-500 focus:outline-none"
              />
              <span className="text-zinc-400 text-sm">–</span>
              <input
                type="number" min="0" max="20" value={awayActual}
                onChange={e => setAwayActual(e.target.value)}
                placeholder="0"
                className="w-12 rounded border border-zinc-300 px-2 py-1 text-center text-sm font-bold focus:border-blue-500 focus:outline-none"
              />
              <Button size="sm" variant="primary" onClick={handleSaveResult}>
                {saved ? <Check className="h-3.5 w-3.5" /> : 'Save'}
              </Button>
              {existing && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setHomeActual(String(existing.home_goals))
                  setAwayActual(String(existing.away_goals))
                }}>Cancel</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResultsEntry() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'entered'>('pending')
  const [groupFilter, setGroupFilter] = useState('All')
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams = getTeams()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  let filtered = fixtures
    .filter(f => f.stage === 'group')
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  if (groupFilter !== 'All') filtered = filtered.filter(f => f.group === groupFilter)
  if (filter === 'pending') filtered = filtered.filter(f => !getResult(f.id))
  if (filter === 'entered') filtered = filtered.filter(f => !!getResult(f.id))

  const allResults = fixtures.filter(f => getResult(f.id)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded border border-zinc-200 p-0.5">
          {(['all', 'pending', 'entered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none"
        >
          {['All', ...'ABCDEFGHIJKL'.split('')].map(g => (
            <option key={g} value={g}>{g === 'All' ? 'All Groups' : `Group ${g}`}</option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">{allResults} results entered</span>
      </div>

      <div className="text-xs text-zinc-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Select a model per match → click <strong>Lock</strong> to freeze the prediction before kickoff → enter the actual result after the game.
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">No matches match filter</p>
        ) : filtered.map(f => (
          <ResultRow
            key={f.id}
            fixture={f}
            homeTeam={teamMap[f.home_team_id]}
            awayTeam={teamMap[f.away_team_id]}
          />
        ))}
      </Card>
    </div>
  )
}
