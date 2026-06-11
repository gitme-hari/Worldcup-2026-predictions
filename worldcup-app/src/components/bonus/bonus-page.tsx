'use client'
import { useState, useEffect, useCallback } from 'react'
import { runMonteCarlo, type TeamMCResult } from '@/lib/monte-carlo'
import { getBonusPredictions, saveBonusPrediction } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trophy, Users, Star, BarChart2, AlertTriangle, CheckCircle2 } from 'lucide-react'

function pct(n: number) { return `${Math.round(n * 100)}%` }

function ProbBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

function tierColor(prob: number): string {
  if (prob >= 0.40) return 'text-green-600'
  if (prob >= 0.20) return 'text-yellow-600'
  return 'text-zinc-400'
}

function tierBg(prob: number): string {
  if (prob >= 0.40) return 'bg-green-50 border-green-200'
  if (prob >= 0.20) return 'bg-yellow-50 border-yellow-200'
  return 'bg-zinc-50 border-zinc-200'
}

function tierBarColor(prob: number): string {
  if (prob >= 0.40) return 'bg-green-500'
  if (prob >= 0.20) return 'bg-yellow-400'
  return 'bg-zinc-400'
}

// ── Champion Section ──────────────────────────────────────────────────────────
function ChampionSection({ results, picks, onPick }: {
  results: TeamMCResult[]
  picks: Record<string, string | null>
  onPick: (key: string, id: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...results].sort((a, b) => b.winTournament - a.winTournament)
  const display = showAll ? sorted : sorted.slice(0, 8)
  const selected = picks['champion']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" /> World Champion
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Pick the team you think will lift the trophy</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {display.map(t => (
          <button
            key={t.teamId}
            onClick={() => onPick('champion', t.teamId)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
              selected === t.teamId
                ? 'border-blue-500 bg-blue-50'
                : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-900 truncate">{t.name}</span>
                  {t.teamId === 'arg' && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> defending champ −8%
                    </span>
                  )}
                  <span className={`ml-auto text-xs font-bold shrink-0 ${tierColor(t.winTournament)}`}>
                    {pct(t.winTournament)}
                  </span>
                </div>
                <ProbBar value={t.winTournament} color={tierBarColor(t.winTournament)} />
              </div>
              {selected === t.teamId && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
            </div>
          </button>
        ))}
        {!showAll && sorted.length > 8 && (
          <button onClick={() => setShowAll(true)} className="text-xs text-blue-600 hover:underline w-full text-center pt-1">
            Show all {sorted.length} teams
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ── Semi-Finalists Section ────────────────────────────────────────────────────
function SFSection({ results, picks, onPick }: {
  results: TeamMCResult[]
  picks: Record<string, string | null>
  onPick: (key: string, id: string) => void
}) {
  const sorted = [...results].sort((a, b) => b.reachSF - a.reachSF)
  const selected = ['sf1', 'sf2', 'sf3', 'sf4'].map(k => picks[k]).filter(Boolean) as string[]

  const high = sorted.filter(t => t.reachSF >= 0.40)
  const mid = sorted.filter(t => t.reachSF >= 0.20 && t.reachSF < 0.40)
  const dark = sorted.filter(t => t.reachSF >= 0.06 && t.reachSF < 0.20)

  function toggle(teamId: string) {
    const idx = selected.indexOf(teamId)
    if (idx >= 0) {
      // Deselect: find which sf slot has it and clear
      const slot = ['sf1', 'sf2', 'sf3', 'sf4'].find(k => picks[k] === teamId)
      if (slot) onPick(slot, '')
    } else if (selected.length < 4) {
      const nextSlot = ['sf1', 'sf2', 'sf3', 'sf4'].find(k => !picks[k])
      if (nextSlot) onPick(nextSlot, teamId)
    }
  }

  function TeamChip({ t }: { t: TeamMCResult }) {
    const isSel = selected.includes(t.teamId)
    return (
      <button
        onClick={() => toggle(t.teamId)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
          isSel ? 'border-blue-500 bg-blue-50' : tierBg(t.reachSF) + ' hover:border-zinc-300'
        } ${selected.length >= 4 && !isSel ? 'opacity-40 cursor-not-allowed' : ''}`}
        disabled={selected.length >= 4 && !isSel}
      >
        <span className="text-lg">{t.flag}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-900 truncate">{t.name}</span>
            <span className={`text-xs font-bold ml-1 shrink-0 ${tierColor(t.reachSF)}`}>{pct(t.reachSF)}</span>
          </div>
          <div className="text-xs text-zinc-400 truncate">Grp {t.group} · {pct(t.winTournament)} to win</div>
        </div>
        {isSel && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 ml-auto" />}
      </button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" /> Semi-Finalists
          <span className="ml-auto text-xs font-normal text-zinc-400">{selected.length}/4 selected</span>
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Pick 4 teams you think will reach the semi-finals</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-blue-50 border border-blue-100">
            {selected.map(id => {
              const t = results.find(r => r.teamId === id)
              return t ? (
                <span key={id} className="flex items-center gap-1 rounded bg-blue-500 text-white text-xs px-2 py-0.5 font-medium">
                  {t.flag} {t.name}
                </span>
              ) : null
            })}
            {selected.length < 4 && (
              <span className="text-xs text-blue-400 self-center">Pick {4 - selected.length} more</span>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-zinc-600">High probability ≥40%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {high.map(t => <TeamChip key={t.teamId} t={t} />)}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs font-semibold text-zinc-600">Medium 20–40%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {mid.map(t => <TeamChip key={t.teamId} t={t} />)}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="text-xs font-semibold text-zinc-600">Dark horses 6–20%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {dark.map(t => <TeamChip key={t.teamId} t={t} />)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Group Winners Section ─────────────────────────────────────────────────────
function GroupWinnersSection({ results, picks, onPick }: {
  results: TeamMCResult[]
  picks: Record<string, string | null>
  onPick: (key: string, id: string) => void
}) {
  const groups = 'ABCDEFGHIJKL'.split('')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-orange-500" /> Group Winners
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Pick who tops each group</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map(g => {
            const teams = results.filter(t => t.group === g).sort((a, b) => b.groupWinProb - a.groupWinProb)
            const key = `winner_group_${g}`
            const sel = picks[key]
            return (
              <div key={g} className="rounded-lg border border-zinc-100 p-3">
                <div className="text-xs font-bold text-zinc-500 mb-2">Group {g}</div>
                <div className="space-y-1.5">
                  {teams.map(t => (
                    <button
                      key={t.teamId}
                      onClick={() => onPick(key, t.teamId)}
                      className={`w-full flex items-center gap-2 rounded px-2 py-1.5 transition-colors ${
                        sel === t.teamId ? 'bg-blue-50 border border-blue-400' : 'hover:bg-zinc-50 border border-transparent'
                      }`}
                    >
                      <span className="text-base">{t.flag}</span>
                      <span className="text-xs font-medium text-zinc-800 flex-1 text-left truncate">{t.name}</span>
                      <div className="w-16 shrink-0">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 rounded bg-zinc-100 overflow-hidden">
                            <div className="h-full bg-blue-400 rounded" style={{ width: `${Math.round(t.groupWinProb * 100)}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-7 text-right">{pct(t.groupWinProb)}</span>
                        </div>
                      </div>
                      {sel === t.teamId && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Top Scoring Team Section ──────────────────────────────────────────────────
function TopScorerTeamSection({ results, picks, onPick }: {
  results: TeamMCResult[]
  picks: Record<string, string | null>
  onPick: (key: string, id: string) => void
}) {
  const sorted = [...results].sort((a, b) => b.avgGoals - a.avgGoals).slice(0, 12)
  const sel = picks['top_scorer_team']
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-green-500" /> Top Scoring Team
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Avg goals scored across simulated tournament runs</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {sorted.map((t, i) => (
            <button
              key={t.teamId}
              onClick={() => onPick('top_scorer_team', t.teamId)}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                sel === t.teamId ? 'border-blue-500 bg-blue-50' : 'border-zinc-100 hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs font-bold text-zinc-300 w-4 shrink-0">{i + 1}</span>
              <span className="text-lg shrink-0">{t.flag}</span>
              <span className="text-sm font-medium text-zinc-800 flex-1 text-left truncate">{t.name}</span>
              <div className="w-28 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded bg-zinc-100 overflow-hidden">
                    <div className="h-full bg-green-500 rounded" style={{ width: `${Math.round((t.avgGoals / sorted[0].avgGoals) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 w-12 text-right">{t.avgGoals.toFixed(1)} xG</span>
                </div>
              </div>
              {sel === t.teamId && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function BonusPage() {
  const [mounted, setMounted] = useState(false)
  const [results, setResults] = useState<TeamMCResult[] | null>(null)
  const [running, setRunning] = useState(false)
  const [picks, setPicks] = useState<Record<string, string | null>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
    const bonus = getBonusPredictions()
    const map: Record<string, string | null> = {}
    bonus.forEach(b => { map[b.key] = b.team_id })
    setPicks(map)
  }, [])

  const runSim = useCallback(async () => {
    setRunning(true)
    await new Promise(r => setTimeout(r, 10))
    const res = runMonteCarlo(8000)
    setResults(res)
    setRunning(false)
  }, [])

  useEffect(() => {
    if (mounted) runSim()
  }, [mounted, runSim])

  const handlePick = (key: string, teamId: string) => {
    setPicks(prev => ({ ...prev, [key]: teamId || null }))
    setSaved(false)
  }

  const handleSave = () => {
    Object.entries(picks).forEach(([key, teamId]) => {
      saveBonusPrediction(key, teamId)
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const sfCount = ['sf1','sf2','sf3','sf4'].filter(k => picks[k]).length
  const gwCount = 'ABCDEFGHIJKL'.split('').filter(g => picks[`winner_group_${g}`]).length
  const totalPicks = (picks['champion'] ? 1 : 0) + sfCount + gwCount + (picks['top_scorer_team'] ? 1 : 0)
  const maxPicks = 1 + 4 + 12 + 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Bonus Predictions</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monte Carlo · 8,000 simulations · {totalPicks}/{maxPicks} picks made
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSim}
            disabled={running}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Simulating…' : 'Re-run'}
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            {saved ? '✓ Saved' : 'Save all picks'}
          </button>
        </div>
      </div>

      {running && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Running 8,000 tournament simulations — takes a moment…
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <ChampionSection results={results} picks={picks} onPick={handlePick} />
          <SFSection results={results} picks={picks} onPick={handlePick} />
          <GroupWinnersSection results={results} picks={picks} onPick={handlePick} />
          <TopScorerTeamSection results={results} picks={picks} onPick={handlePick} />
        </div>
      )}
    </div>
  )
}
