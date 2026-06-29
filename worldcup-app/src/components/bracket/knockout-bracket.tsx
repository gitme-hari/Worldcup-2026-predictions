'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getResult } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'
import { stageLabel } from '@/lib/seed-data'

// ── Team slot ─────────────────────────────────────────────────────────────────

function TeamSlot({
  team,
  isWinner,
  score,
}: {
  team: SeedTeam | null
  isWinner: boolean
  score?: number
}) {
  const bg = isWinner ? 'border-emerald-300 bg-emerald-50' :
             !team     ? 'border-zinc-100 bg-zinc-50'       :
                         'border-zinc-200 bg-white'

  return (
    <div className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs ${bg}`}>
      {team ? (
        <>
          <span>{team.flag_url}</span>
          <span className={`font-medium ${isWinner ? 'text-emerald-700' : 'text-zinc-900'}`}>
            {team.code}
          </span>
          {score !== undefined && (
            <span className={`ml-auto tabular-nums font-bold ${isWinner ? 'text-emerald-700' : 'text-zinc-500'}`}>
              {score}
            </span>
          )}
        </>
      ) : (
        <span className="text-zinc-300 italic text-[11px]">TBD</span>
      )}
    </div>
  )
}

// ── Matchup card ──────────────────────────────────────────────────────────────

function MatchupCard({
  fix,
  teamMap,
}: {
  fix: SeedFixture
  teamMap: Record<string, SeedTeam>
}) {
  const home   = fix.home_team_id ? teamMap[fix.home_team_id] ?? null : null
  const away   = fix.away_team_id ? teamMap[fix.away_team_id] ?? null : null
  const result = getResult(fix.id)

  const winnerId =
    result && result.home_goals > result.away_goals ? fix.home_team_id :
    result && result.away_goals > result.home_goals ? fix.away_team_id :
    null

  return (
    <div className="rounded border border-zinc-200 bg-white p-1 min-w-[120px]">
      <TeamSlot team={home} isWinner={winnerId === fix.home_team_id && !!winnerId} score={result?.home_goals} />
      <div className="my-0.5 border-t border-zinc-100" />
      <TeamSlot team={away} isWinner={winnerId === fix.away_team_id && !!winnerId} score={result?.away_goals} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const

export function KnockoutBracket() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))
  const fixtures = getFixtures().filter(f => f.stage !== 'group')

  const rounds = STAGE_ORDER.map(stage => ({
    label: stageLabel(stage),
    matchups: fixtures.filter(f => f.stage === stage),
  })).filter(r => r.matchups.length > 0)

  const thirdPlace = fixtures.filter(f => f.stage === 'third_place')
  if (thirdPlace.length) {
    rounds.splice(rounds.length - 1, 0, { label: stageLabel('third_place'), matchups: thirdPlace })
  }

  const finalFix   = fixtures.find(f => f.stage === 'final')
  const finalResult = finalFix ? getResult(finalFix.id) : null
  const championId =
    finalResult && finalResult.home_goals > finalResult.away_goals ? finalFix?.home_team_id :
    finalResult && finalResult.away_goals > finalResult.home_goals ? finalFix?.away_team_id :
    null
  const champion = championId ? teamMap[championId] : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Real bracket. Teams advance automatically when you enter results in Matches.
      </p>

      {/* Mobile: stacked by round */}
      <div className="lg:hidden space-y-6">
        {rounds.map(round => (
          <div key={round.label}>
            <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{round.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {round.matchups.map(fix => (
                <MatchupCard key={fix.id} fix={fix} teamMap={teamMap} />
              ))}
            </div>
          </div>
        ))}
        {champion && (
          <div className="rounded border-2 border-yellow-400 bg-yellow-50 px-3 py-4 text-center">
            <div className="text-2xl">{champion.flag_url}</div>
            <div className="text-xs font-bold text-yellow-800 mt-1">🏆 {champion.name}</div>
          </div>
        )}
      </div>

      {/* Desktop: horizontal bracket */}
      <div className="hidden lg:flex items-start gap-4 overflow-x-auto pb-4">
        {rounds.map((round, ri) => (
          <div key={round.label} className="shrink-0">
            <div className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
              {round.label}
            </div>
            <div
              className="space-y-4"
              style={{ marginTop: ri > 0 ? `${Math.pow(2, ri - 1) * 24}px` : 0 }}
            >
              {round.matchups.map(fix => (
                <MatchupCard key={fix.id} fix={fix} teamMap={teamMap} />
              ))}
            </div>
          </div>
        ))}

        {champion && (
          <div className="shrink-0">
            <div className="mb-2 text-xs font-semibold text-yellow-600 uppercase tracking-wide">🏆 Champion</div>
            <div className="rounded border-2 border-yellow-400 bg-yellow-50 px-3 py-4 text-center min-w-[100px]">
              <div className="text-2xl">{champion.flag_url}</div>
              <div className="text-xs font-bold text-yellow-800 mt-1">{champion.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
