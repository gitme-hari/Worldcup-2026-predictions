'use client'
import { useState, useEffect, useCallback } from 'react'
import { runMonteCarlo, type TeamMCResult } from '@/lib/monte-carlo'
import {
  getBonusPredictions, getTeams, getFixtures, getPredictions, getResults, getResult,
} from '@/lib/store'
import {
  computeGroupStandings, engineScore,
  computeQualificationStatus, computeThirdPlaceRanking,
} from '@/lib/models'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RefreshCw, Trophy, Users, Star, BarChart2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { SeedTeam } from '@/lib/seed-data'

function pct(n: number) { return `${Math.round(n * 100)}%` }

// ── Pick status ───────────────────────────────────────────────────────────────

type PickStatus = 'confirmed' | 'alive' | 'eliminated' | 'unknown'

function StatusPill({ status }: { status: PickStatus }) {
  const map: Record<PickStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    confirmed:  { label: 'Confirmed ✓', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    alive:      { label: 'Still alive',  cls: 'bg-amber-100 text-amber-700',   icon: <Clock className="h-3 w-3" /> },
    eliminated: { label: 'Eliminated',   cls: 'bg-red-100 text-red-600',       icon: <XCircle className="h-3 w-3" /> },
    unknown:    { label: 'No pick',      cls: 'bg-zinc-100 text-zinc-400',     icon: null },
  }
  const { label, cls, icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  )
}

// ── Probability bar ───────────────────────────────────────────────────────────

function ProbBar({ value, color = 'bg-blue-400' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

// ── Champion tracker ──────────────────────────────────────────────────────────

function ChampionTracker({
  pick,
  mcResults,
  qualStatus,
  team,
}: {
  pick: string | null
  mcResults: TeamMCResult[]
  qualStatus: Record<string, PickStatus>
  team: SeedTeam | null
}) {
  const mc = pick ? mcResults.find(r => r.teamId === pick) : null
  const status: PickStatus = pick ? (qualStatus[pick] ?? 'unknown') : 'unknown'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" /> World Champion
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Your pre-tournament pick to lift the trophy.</p>
      </CardHeader>
      <CardContent>
        {!pick || !team ? (
          <p className="text-sm text-zinc-400">No pick submitted.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{team.flag_url}</span>
              <div className="flex-1">
                <p className="text-base font-bold text-zinc-900">{team.name}</p>
                <StatusPill status={status} />
              </div>
            </div>
            {mc && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Remaining chance to win tournament</span>
                  <span className="font-bold text-zinc-900">{pct(mc.winTournament)}</span>
                </div>
                <ProbBar
                  value={mc.winTournament}
                  color={mc.winTournament >= 0.2 ? 'bg-emerald-500' : mc.winTournament >= 0.08 ? 'bg-amber-400' : 'bg-red-400'}
                />
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Reach SF</span>
                  <span>{pct(mc.reachSF)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Semi-finalists tracker ────────────────────────────────────────────────────

function SFTracker({
  picks,
  mcResults,
  qualStatus,
  teams,
}: {
  picks: (string | null)[]
  mcResults: TeamMCResult[]
  qualStatus: Record<string, PickStatus>
  teams: SeedTeam[]
}) {
  const sfPicks = picks.filter(Boolean) as string[]
  const confirmed = sfPicks.filter(id => qualStatus[id] === 'confirmed').length
  const alive     = sfPicks.filter(id => qualStatus[id] === 'alive').length
  const out       = sfPicks.filter(id => qualStatus[id] === 'eliminated').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" /> Semi-Finalists
          <span className="ml-auto text-xs font-normal text-zinc-400">
            {confirmed} confirmed · {alive} alive · {out} out
          </span>
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Your 4 pre-tournament semi-final picks.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sfPicks.length === 0 ? (
          <p className="text-sm text-zinc-400">No semi-finalist picks submitted.</p>
        ) : (
          sfPicks.map(id => {
            const team = teams.find(t => t.id === id)
            const mc   = mcResults.find(r => r.teamId === id)
            const status = qualStatus[id] ?? 'unknown'
            if (!team) return null
            return (
              <div key={id} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                <span className="text-xl">{team.flag_url}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900">{team.name}</span>
                    <StatusPill status={status} />
                  </div>
                  {mc && status !== 'eliminated' && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {pct(mc.reachSF)} chance to reach SF
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ── Group winners tracker ─────────────────────────────────────────────────────

function GroupWinnersTracker({
  picks,
  standings,
  teams,
}: {
  picks: Record<string, string | null>
  standings: Record<string, import('@/lib/types').GroupStanding[]>
  teams: SeedTeam[]
}) {
  const groups = 'ABCDEFGHIJKL'.split('')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-orange-500" /> Group Winners
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Your pre-tournament group winner picks.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {groups.map(g => {
            const pickedId = picks[`winner_group_${g}`]
            const groupStandings = standings[g] ?? []
            const currentLeader  = groupStandings[0]?.team
            const pickedTeam     = pickedId ? teams.find(t => t.id === pickedId) : null
            const allGroupPlayed = groupStandings.every(s => s.played === 3)

            let status: PickStatus = 'unknown'
            if (pickedId && currentLeader) {
              if (allGroupPlayed) {
                status = currentLeader.id === pickedId ? 'confirmed' : 'eliminated'
              } else if (groupStandings[0]?.team.id === pickedId) {
                status = 'alive'
              } else {
                // Check if picked team can still win
                const pickedStanding = groupStandings.find(s => s.team.id === pickedId)
                const leader = groupStandings[0]
                if (pickedStanding) {
                  const remaining = 3 - pickedStanding.played
                  const maxPts = pickedStanding.points + remaining * 3
                  status = maxPts >= leader.points ? 'alive' : 'eliminated'
                }
              }
            }

            return (
              <div key={g} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                <div className="w-6 text-xs font-bold text-zinc-400 shrink-0">Grp {g}</div>
                {pickedTeam ? (
                  <>
                    <span className="text-lg shrink-0">{pickedTeam.flag_url}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-900">{pickedTeam.name}</span>
                    </div>
                    <StatusPill status={status} />
                  </>
                ) : (
                  <span className="text-xs text-zinc-300 flex-1">No pick</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Top scorer tracker ────────────────────────────────────────────────────────

function TopScorerTracker({
  pick,
  mcResults,
  teams,
  teamGoals,
}: {
  pick: string | null
  mcResults: TeamMCResult[]
  teams: SeedTeam[]
  teamGoals: Record<string, number>
}) {
  const team = pick ? teams.find(t => t.id === pick) : null
  const mc   = pick ? mcResults.find(r => r.teamId === pick) : null

  // Rank all teams by actual goals scored so far
  const ranked = Object.entries(teamGoals)
    .sort(([, a], [, b]) => b - a)
  const myRank = pick ? ranked.findIndex(([id]) => id === pick) + 1 : null
  const myGoals = pick ? (teamGoals[pick] ?? 0) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-green-500" /> Top Scoring Team
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Team with the highest total goals in the tournament.</p>
      </CardHeader>
      <CardContent>
        {!pick || !team ? (
          <p className="text-sm text-zinc-400">No pick submitted.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{team.flag_url}</span>
              <div className="flex-1">
                <p className="text-base font-bold text-zinc-900">{team.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {myGoals} goal{myGoals !== 1 ? 's' : ''} scored
                  {myRank ? ` · Currently ranked #${myRank}` : ''}
                </p>
              </div>
            </div>
            {mc && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Simulated avg goals / tournament run</span>
                  <span className="font-bold text-zinc-900">{mc.avgGoals.toFixed(1)}</span>
                </div>
                <ProbBar value={Math.min(1, mc.avgGoals / 12)} color="bg-green-400" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BonusPage() {
  const [mounted, setMounted]   = useState(false)
  const [mcResults, setMcResults] = useState<TeamMCResult[] | null>(null)
  const [running, setRunning]   = useState(false)
  const [picks, setPicks]       = useState<Record<string, string | null>>({})

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
    setMcResults(runMonteCarlo(8000))
    setRunning(false)
  }, [])

  useEffect(() => { if (mounted) runSim() }, [mounted, runSim])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams       = getTeams()
  const fixtures    = getFixtures()
  const predictions = getPredictions()
  const results     = getResults()

  // Use actual results when available, engine projection otherwise
  const getScore = (fid: string) => {
    const r = getResult(fid)
    if (r) return { home: r.home_goals, away: r.away_goals }
    return engineScore(predictions, fid)
  }

  const standings  = computeGroupStandings(fixtures as any, teams, getScore)
  const statusMap  = computeQualificationStatus(standings)

  // Map QualificationStatus → PickStatus
  const qualPickStatus: Record<string, PickStatus> = {}
  teams.forEach(t => {
    const st = statusMap[t.id]
    qualPickStatus[t.id] =
      st === 'confirmed'      ? 'confirmed' :
      st === 'eliminated'     ? 'eliminated' :
      st === 'projected_top2' ? 'alive' :
      st === 'best_third'     ? 'alive' :
      st === 'in_contention'  ? 'alive' : 'unknown'
  })

  // Team goals from actual results
  const teamGoals: Record<string, number> = {}
  results.forEach(r => {
    const fix = fixtures.find(f => f.id === r.fixture_id)
    if (!fix) return
    teamGoals[fix.home_team_id] = (teamGoals[fix.home_team_id] ?? 0) + r.home_goals
    teamGoals[fix.away_team_id] = (teamGoals[fix.away_team_id] ?? 0) + r.away_goals
  })

  const sfPicks = ['sf1', 'sf2', 'sf3', 'sf4'].map(k => picks[k] ?? null)
  const championTeam = picks['champion'] ? teams.find(t => t.id === picks['champion']) ?? null : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pre-tournament picks · probabilities updated live via Monte Carlo
          </p>
        </div>
        <button
          onClick={runSim}
          disabled={running}
          className="flex items-center gap-1.5 rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Simulating…' : 'Refresh probabilities'}
        </button>
      </div>

      {running && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Running 8,000 simulations…
        </div>
      )}

      <ChampionTracker
        pick={picks['champion'] ?? null}
        mcResults={mcResults ?? []}
        qualStatus={qualPickStatus}
        team={championTeam}
      />

      <SFTracker
        picks={sfPicks}
        mcResults={mcResults ?? []}
        qualStatus={qualPickStatus}
        teams={teams}
      />

      <GroupWinnersTracker
        picks={picks}
        standings={standings}
        teams={teams}
      />

      <TopScorerTracker
        pick={picks['top_scorer_team'] ?? null}
        mcResults={mcResults ?? []}
        teams={teams}
        teamGoals={teamGoals}
      />
    </div>
  )
}
