'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getFixtures, getTeams, getResult, saveResult, deleteResult,
  getPredictions, getConfig, getLockedPrediction, saveLockPrediction, deleteLockedPrediction,
} from '@/lib/store'
import { getEffectivePrediction } from '@/lib/models'
import { formatDate, formatTime, goals, MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { SeedFixture } from '@/lib/seed-data'
import type { ModelKey } from '@/lib/types'

const MODEL_OPTIONS: { value: ModelKey; label: string }[] = [
  { value: 'A', label: 'Model A (Poisson)' },
  { value: 'B', label: 'Model B (ML)' },
  { value: 'C', label: 'Model C (Live)' },
  { value: 'hybrid', label: 'Hybrid' },
]

function ConfirmDialog({
  homeTeam, awayTeam, homeGoals, awayGoals,
  onConfirm, onCancel,
}: {
  homeTeam: string; awayTeam: string; homeGoals: string; awayGoals: string
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Confirm result</p>
            <p className="text-xs text-zinc-500 mt-1">
              Save <span className="font-semibold">{homeTeam} {homeGoals} – {awayGoals} {awayTeam}</span>?
              This will lock the prediction for analysis. The model cannot be changed after saving.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={onConfirm}>Yes, save result</Button>
        </div>
      </div>
    </div>
  )
}

function ResultRow({
  fixture,
  homeTeam,
  awayTeam,
  onSaved,
}: {
  fixture: SeedFixture
  homeTeam: { name: string; code: string; flag_url: string } | undefined
  awayTeam: { name: string; code: string; flag_url: string } | undefined
  onSaved: (fixtureId: string) => void
}) {
  const config = getConfig()
  const predictions = getPredictions()

  const locked = getLockedPrediction(fixture.id)
  const existing = getResult(fixture.id)

  const [selectedModel, setSelectedModel] = useState<ModelKey>(
    (locked?.model as ModelKey) ?? config.active_model
  )
  const [isLocked, setIsLocked] = useState(!!locked)
  const [homeActual, setHomeActual] = useState(String(existing?.home_goals ?? '0'))
  const [awayActual, setAwayActual] = useState(String(existing?.away_goals ?? '0'))
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedResult, setSavedResult] = useState<{ home: number; away: number } | null>(
    existing ? { home: existing.home_goals, away: existing.away_goals } : null
  )

  const livePred = getEffectivePrediction(predictions as any, fixture.id, selectedModel, {
    a: config.weight_a, b: config.weight_b, c: config.weight_c,
  })

  const currentLocked = getLockedPrediction(fixture.id)
  const displayPred = (isLocked && currentLocked) ? currentLocked : livePred

  const handleLock = useCallback(() => {
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
  }, [fixture.id, selectedModel, livePred])

  const handleUnlock = () => {
    deleteLockedPrediction(fixture.id)
    setIsLocked(false)
  }

  const commitSave = useCallback(() => {
    const h = parseInt(homeActual, 10)
    const a = parseInt(awayActual, 10)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    if (!isLocked && livePred) {
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
    saveResult({ fixture_id: fixture.id, home_goals: h, away_goals: a })
    setSavedResult({ home: h, away: a })
    setShowConfirm(false)
    onSaved(fixture.id)
  }, [homeActual, awayActual, isLocked, livePred, selectedModel, fixture.id, onSaved])

  const handleSaveClick = () => {
    const h = parseInt(homeActual, 10)
    const a = parseInt(awayActual, 10)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setShowConfirm(true)
  }

  const handleDeleteResult = () => {
    if (!window.confirm('Delete this result? The prediction lock will also be removed.')) return
    deleteResult(fixture.id)
    deleteLockedPrediction(fixture.id)
    setIsLocked(false)
    setSavedResult(null)
    setHomeActual('0')
    setAwayActual('0')
  }

  const isSaved = !!savedResult
  const activeModel = isLocked ? (getLockedPrediction(fixture.id)?.model ?? selectedModel) : selectedModel
  const modelColor = MODEL_COLORS[activeModel]

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          homeTeam={homeTeam?.name ?? ''}
          awayTeam={awayTeam?.name ?? ''}
          homeGoals={homeActual}
          awayGoals={awayActual}
          onConfirm={commitSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className={`border-b border-zinc-100 px-4 py-3 last:border-0 transition-colors ${isSaved ? 'bg-zinc-50 opacity-80' : ''}`}>
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
          {isSaved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {/* Prediction + result row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Model — frozen once saved */}
          <div className="shrink-0">
            <div className="text-xs text-zinc-400 mb-1">Model</div>
            {isLocked || isSaved ? (
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white ${modelColor} ${isSaved ? 'opacity-60' : ''}`}>
                  <Lock className="h-2.5 w-2.5" />
                  {MODEL_LABELS[activeModel]}
                </span>
                {!isSaved && (
                  <button onClick={handleUnlock} className="text-zinc-300 hover:text-zinc-500" title="Unlock model">
                    <Unlock className="h-3.5 w-3.5" />
                  </button>
                )}
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
              <span className={`text-sm font-bold ${isLocked || isSaved ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {displayPred ? `${goals(displayPred.home_goals)} – ${goals(displayPred.away_goals)}` : '—'}
              </span>
              {!isLocked && !isSaved && livePred && (
                <button
                  onClick={handleLock}
                  className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <Lock className="h-3 w-3" /> Lock
                </button>
              )}
            </div>
          </div>

          <div className="text-zinc-200 text-lg shrink-0 hidden sm:block">│</div>

          {/* Actual score — frozen once saved */}
          <div className="shrink-0">
            <div className="text-xs text-zinc-400 mb-1">Actual result</div>
            {isSaved ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-700">
                  {savedResult!.home} – {savedResult!.away}
                </span>
                <button
                  onClick={handleDeleteResult}
                  className="text-zinc-300 hover:text-red-400"
                  title="Delete result"
                >
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
                <Button size="sm" variant="primary" onClick={handleSaveClick}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function ResultsEntry() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'entered'>('all')
  const [groupFilter, setGroupFilter] = useState('All')
  // Tracks fixture IDs saved in this session so they stay visible even in "pending" view
  const [sessionSaved, setSessionSaved] = useState<Set<string>>(new Set())

  useEffect(() => setMounted(true), [])

  const handleSaved = useCallback((fixtureId: string) => {
    setSessionSaved(prev => new Set([...prev, fixtureId]))
  }, [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams = getTeams()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  let filtered = fixtures
    .filter(f => f.stage === 'group')
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  if (groupFilter !== 'All') filtered = filtered.filter(f => f.group === groupFilter)
  // Keep session-saved fixtures visible even in pending filter
  if (filter === 'pending') filtered = filtered.filter(f => !getResult(f.id) || sessionSaved.has(f.id))
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
        Select a model → click <strong>Lock</strong> to freeze before kickoff → enter the actual score and <strong>Save</strong>. Saving locks the model permanently and feeds the <strong>Analysis</strong> page.
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
            onSaved={handleSaved}
          />

        ))}
      </Card>
    </div>
  )
}
