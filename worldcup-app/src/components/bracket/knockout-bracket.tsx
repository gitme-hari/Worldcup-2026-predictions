'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getResult } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'

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
    <div className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] ${bg}`}>
      {team ? (
        <>
          <span className="text-[13px] leading-none">{team.flag_url}</span>
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
        <span className="text-zinc-300 italic">TBD</span>
      )}
    </div>
  )
}

// ── Matchup card ──────────────────────────────────────────────────────────────

function MatchupCard({
  fix,
  teamMap,
  label,
}: {
  fix: SeedFixture
  teamMap: Record<string, SeedTeam>
  label?: string
}) {
  const home   = fix.home_team_id ? teamMap[fix.home_team_id] ?? null : null
  const away   = fix.away_team_id ? teamMap[fix.away_team_id] ?? null : null
  const result = getResult(fix.id)

  const winnerId =
    result && result.home_goals > result.away_goals ? fix.home_team_id :
    result && result.away_goals > result.home_goals ? fix.away_team_id :
    null

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{label}</div>
      )}
      <div className="rounded border border-zinc-200 bg-white p-0.5 w-[108px]">
        <TeamSlot team={home} isWinner={winnerId === fix.home_team_id && !!winnerId} score={result?.home_goals} />
        <div className="my-0.5 border-t border-zinc-100" />
        <TeamSlot team={away} isWinner={winnerId === fix.away_team_id && !!winnerId} score={result?.away_goals} />
      </div>
    </div>
  )
}

// ── Champion box ──────────────────────────────────────────────────────────────

function ChampionBox({ champion }: { champion: SeedTeam }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] font-semibold text-yellow-600 uppercase tracking-wider">🏆 Champion</div>
      <div className="rounded border-2 border-yellow-400 bg-yellow-50 px-2 py-3 text-center w-[80px]">
        <div className="text-xl leading-none">{champion.flag_url}</div>
        <div className="text-[10px] font-bold text-yellow-800 mt-1 leading-tight">{champion.name}</div>
      </div>
    </div>
  )
}

// ── Desktop 2-sided tree ──────────────────────────────────────────────────────
// Layout:  [r32] [r16] [qf] [sf] — [Final] — [sf] [qf] [r16] [r32]
//
// Left side (inward):  r32-1..8  → r16-1..4 → qf-1, qf-3 → sf-1
// Right side (inward): r32-9..16 → r16-5..8 → qf-2, qf-4 → sf-2
// Center: Final (+ champion), Third-place below

function DesktopBracket({
  fixtureMap,
  teamMap,
}: {
  fixtureMap: Record<string, SeedFixture>
  teamMap: Record<string, SeedTeam>
}) {
  const f = fixtureMap
  const M = (id: string, label?: string) => (
    <MatchupCard key={id} fix={f[id]} teamMap={teamMap} label={label} />
  )

  const finalFix = f['final']
  const finalResult = finalFix ? getResult(finalFix.id) : null
  const championId =
    finalResult && finalResult.home_goals > finalResult.away_goals ? finalFix?.home_team_id :
    finalResult && finalResult.away_goals > finalResult.home_goals ? finalFix?.away_team_id :
    null
  const champion = championId ? teamMap[championId] : null

  // Vertical spacing for each column, in px, so matchups align with their parents.
  // The bracket "fans out" — r32 has 8 items, r16 has 4, qf has 2, sf has 1 per side.
  // We use CSS grid rows to align them naturally.

  const colCls = 'flex flex-col justify-around'

  // Round labels
  const RoundLabel = ({ label }: { label: string }) => (
    <div className="mb-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider text-center whitespace-nowrap">
      {label}
    </div>
  )

  const GAP = 'gap-3'

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 select-none">

      {/* ── LEFT BRACKET ── */}

      {/* R32 left */}
      <div className="shrink-0">
        <RoundLabel label="Round of 32" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {/* Pod 1 (feeds r16-1) */}
          {M('r32-2')}
          {M('r32-5')}
          {/* Pod 2 (feeds r16-2) */}
          {M('r32-1')}
          {M('r32-3')}
          {/* Pod 3 (feeds r16-3) */}
          {M('r32-4')}
          {M('r32-6')}
          {/* Pod 4 (feeds r16-4) */}
          {M('r32-7')}
          {M('r32-8')}
        </div>
      </div>

      {/* R16 left */}
      <div className="shrink-0">
        <RoundLabel label="Round of 16" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('r16-1')}
          {M('r16-2')}
          {M('r16-3')}
          {M('r16-4')}
        </div>
      </div>

      {/* QF left */}
      <div className="shrink-0">
        <RoundLabel label="Quarter-final" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('qf-1')}
          {M('qf-3')}
        </div>
      </div>

      {/* SF left */}
      <div className="shrink-0">
        <RoundLabel label="Semi-final" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('sf-1')}
        </div>
      </div>

      {/* ── CENTER ── */}
      <div className="shrink-0 flex flex-col items-center gap-4">
        <RoundLabel label="Final" />
        {M('final')}
        {champion && <ChampionBox champion={champion} />}
        <div className="mt-2">
          <RoundLabel label="3rd Place" />
          {M('third-place')}
        </div>
      </div>

      {/* ── RIGHT BRACKET (mirrored: sf → qf → r16 → r32) ── */}

      {/* SF right */}
      <div className="shrink-0">
        <RoundLabel label="Semi-final" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('sf-2')}
        </div>
      </div>

      {/* QF right */}
      <div className="shrink-0">
        <RoundLabel label="Quarter-final" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('qf-2')}
          {M('qf-4')}
        </div>
      </div>

      {/* R16 right */}
      <div className="shrink-0">
        <RoundLabel label="Round of 16" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {M('r16-5')}
          {M('r16-6')}
          {M('r16-7')}
          {M('r16-8')}
        </div>
      </div>

      {/* R32 right */}
      <div className="shrink-0">
        <RoundLabel label="Round of 32" />
        <div className={`${colCls} ${GAP} h-[480px]`}>
          {/* Pod 5 (feeds r16-5) */}
          {M('r32-11')}
          {M('r32-12')}
          {/* Pod 6 (feeds r16-6) */}
          {M('r32-9')}
          {M('r32-10')}
          {/* Pod 7 (feeds r16-7) */}
          {M('r32-14')}
          {M('r32-16')}
          {/* Pod 8 (feeds r16-8) */}
          {M('r32-13')}
          {M('r32-15')}
        </div>
      </div>
    </div>
  )
}

// ── Mobile: stacked by round ──────────────────────────────────────────────────

const MOBILE_ROUNDS = [
  { label: 'Round of 32',   ids: ['r32-1','r32-2','r32-3','r32-4','r32-5','r32-6','r32-7','r32-8','r32-9','r32-10','r32-11','r32-12','r32-13','r32-14','r32-15','r32-16'] },
  { label: 'Round of 16',  ids: ['r16-1','r16-2','r16-3','r16-4','r16-5','r16-6','r16-7','r16-8'] },
  { label: 'Quarter-finals', ids: ['qf-1','qf-2','qf-3','qf-4'] },
  { label: 'Semi-finals',    ids: ['sf-1','sf-2'] },
  { label: '3rd Place',      ids: ['third-place'] },
  { label: 'Final',          ids: ['final'] },
]

// ── Main component ────────────────────────────────────────────────────────────

export function KnockoutBracket() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))
  const fixtures = getFixtures().filter(f => f.stage !== 'group')
  const fixtureMap = Object.fromEntries(fixtures.map(f => [f.id, f]))

  const finalFix    = fixtureMap['final']
  const finalResult = finalFix ? getResult(finalFix.id) : null
  const championId =
    finalResult && finalResult.home_goals > finalResult.away_goals ? finalFix?.home_team_id :
    finalResult && finalResult.away_goals > finalResult.home_goals ? finalFix?.away_team_id :
    null
  const champion = championId ? teamMap[championId] : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Real bracket — teams advance automatically when you enter results in Matches.
        Left side (R32 M73–M80) and right side (M81–M88) converge at the Final.
      </p>

      {/* Mobile */}
      <div className="lg:hidden space-y-6">
        {MOBILE_ROUNDS.map(round => (
          <div key={round.label}>
            <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{round.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {round.ids.map(id => fixtureMap[id] ? (
                <MatchupCard key={id} fix={fixtureMap[id]} teamMap={teamMap} />
              ) : null)}
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

      {/* Desktop 2-sided tree */}
      <div className="hidden lg:block">
        <DesktopBracket fixtureMap={fixtureMap} teamMap={teamMap} />
      </div>
    </div>
  )
}
