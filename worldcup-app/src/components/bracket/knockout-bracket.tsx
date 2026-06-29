'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getResult } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'

// ── Team slot ─────────────────────────────────────────────────────────────────

function TeamSlot({ team, isWinner, score }: {
  team: SeedTeam | null
  isWinner: boolean
  score?: number
}) {
  const bg = isWinner ? 'border-emerald-300 bg-emerald-50'
           : !team    ? 'border-zinc-100 bg-zinc-50'
                      : 'border-zinc-200 bg-white'
  return (
    <div className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] leading-none ${bg}`}>
      {team ? (
        <>
          <span>{team.flag_url}</span>
          <span className={`font-medium ${isWinner ? 'text-emerald-700' : 'text-zinc-900'}`}>{team.code}</span>
          {score !== undefined && (
            <span className={`ml-auto tabular-nums font-bold ${isWinner ? 'text-emerald-700' : 'text-zinc-500'}`}>{score}</span>
          )}
        </>
      ) : (
        <span className="text-zinc-300 italic">TBD</span>
      )}
    </div>
  )
}

// ── Matchup card ──────────────────────────────────────────────────────────────

function MatchupCard({ fix, teamMap }: { fix: SeedFixture; teamMap: Record<string, SeedTeam> }) {
  const home   = fix.home_team_id ? teamMap[fix.home_team_id] ?? null : null
  const away   = fix.away_team_id ? teamMap[fix.away_team_id] ?? null : null
  const result = getResult(fix.id)
  const winnerId =
    result && result.home_goals > result.away_goals ? fix.home_team_id :
    result && result.away_goals > result.home_goals ? fix.away_team_id :
    null
  return (
    <div className="rounded border border-zinc-200 bg-white p-0.5 w-[108px] shrink-0">
      <TeamSlot team={home} isWinner={winnerId === fix.home_team_id && !!winnerId} score={result?.home_goals} />
      <div className="my-0.5 border-t border-zinc-100" />
      <TeamSlot team={away} isWinner={winnerId === fix.away_team_id && !!winnerId} score={result?.away_goals} />
    </div>
  )
}

// ── Round column ──────────────────────────────────────────────────────────────
// Each column has a fixed height and distributes its matches evenly.

function RoundCol({ label, ids, fixtureMap, teamMap, height = 560 }: {
  label: string
  ids: string[]
  fixtureMap: Record<string, SeedFixture>
  teamMap: Record<string, SeedTeam>
  height?: number
}) {
  return (
    <div className="shrink-0">
      <div className="mb-1.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider text-center whitespace-nowrap">
        {label}
      </div>
      <div className="flex flex-col justify-around" style={{ height }}>
        {ids.map(id => fixtureMap[id]
          ? <MatchupCard key={id} fix={fixtureMap[id]} teamMap={teamMap} />
          : null
        )}
      </div>
    </div>
  )
}

// ── Desktop bracket ───────────────────────────────────────────────────────────
// Official FIFA layout: R32 | R16 | QF | SF | FINAL | SF | QF | R16 | R32
//
// Left side (flows inward, top-to-bottom):
//   R32: m74, m77, m73, m75, m76, m78, m79, m80
//   R16: m89 (W:m74×m77), m90 (W:m73×m75), m91 (W:m76×m78), m92 (W:m79×m80)
//   QF:  m97 (W:m89×m90), m99 (W:m91×m92)
//   SF:  m101 (W:m97×m99)
//
// Right side (flows inward, top-to-bottom):
//   R32: m83, m84, m81, m82, m86, m88, m85, m87
//   R16: m93 (W:m83×m84), m94 (W:m81×m82), m95 (W:m86×m88), m96 (W:m85×m87)
//   QF:  m98 (W:m93×m94), m100 (W:m95×m96)
//   SF:  m102 (W:m98×m100)
//
// Center: Final (m104) + 3rd Place (m103)

const H = 560  // shared column height in px

function DesktopBracket({ fixtureMap, teamMap }: {
  fixtureMap: Record<string, SeedFixture>
  teamMap: Record<string, SeedTeam>
}) {
  const finalFix    = fixtureMap['m104']
  const finalResult = finalFix ? getResult(finalFix.id) : null
  const championId  =
    finalResult && finalResult.home_goals > finalResult.away_goals ? finalFix?.home_team_id :
    finalResult && finalResult.away_goals > finalResult.home_goals ? finalFix?.away_team_id :
    null
  const champion = championId ? teamMap[championId] : null

  const col = (label: string, ids: string[]) => (
    <RoundCol label={label} ids={ids} fixtureMap={fixtureMap} teamMap={teamMap} height={H} />
  )

  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-4 select-none">
      {/* LEFT SIDE — R32 → R16 → QF → SF */}
      {col('Round of 32', ['m74','m77','m73','m75','m76','m78','m79','m80'])}
      {col('Round of 16', ['m89','m90','m91','m92'])}
      {col('Quarter-Final', ['m97','m99'])}
      {col('Semi-Final', ['m101'])}

      {/* CENTER — Final + Champion + 3rd Place */}
      <div className="shrink-0 flex flex-col items-center" style={{ height: H }}>
        <div className="mb-1.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider text-center">Final</div>
        <div className="flex flex-col justify-around flex-1 w-full items-center gap-3">
          {fixtureMap['m104'] && <MatchupCard fix={fixtureMap['m104']} teamMap={teamMap} />}
          {champion ? (
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-semibold text-yellow-600 uppercase tracking-wider">🏆 Champion</div>
              <div className="rounded border-2 border-yellow-400 bg-yellow-50 px-2 py-2 text-center w-[108px]">
                <div className="text-xl">{champion.flag_url}</div>
                <div className="text-[10px] font-bold text-yellow-800 mt-0.5 leading-tight">{champion.name}</div>
              </div>
            </div>
          ) : (
            <div className="h-[60px]" />
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">3rd Place</div>
            {fixtureMap['m103'] && <MatchupCard fix={fixtureMap['m103']} teamMap={teamMap} />}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — SF → QF → R16 → R32 */}
      {col('Semi-Final', ['m102'])}
      {col('Quarter-Final', ['m98','m100'])}
      {col('Round of 16', ['m93','m94','m95','m96'])}
      {col('Round of 32', ['m83','m84','m81','m82','m86','m88','m85','m87'])}
    </div>
  )
}

// ── Mobile: stacked rounds ────────────────────────────────────────────────────

const MOBILE_ROUNDS = [
  { label: 'Round of 32',
    ids: ['m73','m74','m75','m76','m77','m78','m79','m80','m81','m82','m83','m84','m85','m86','m87','m88'] },
  { label: 'Round of 16',  ids: ['m89','m90','m91','m92','m93','m94','m95','m96'] },
  { label: 'Quarter-Finals', ids: ['m97','m98','m99','m100'] },
  { label: 'Semi-Finals',    ids: ['m101','m102'] },
  { label: '3rd Place',      ids: ['m103'] },
  { label: 'Final',          ids: ['m104'] },
]

// ── Main export ───────────────────────────────────────────────────────────────

export function KnockoutBracket() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams      = getTeams()
  const teamMap    = Object.fromEntries(teams.map(t => [t.id, t]))
  const fixtures   = getFixtures().filter(f => f.stage !== 'group')
  const fixtureMap = Object.fromEntries(fixtures.map(f => [f.id, f]))

  const finalFix    = fixtureMap['m104']
  const finalResult = finalFix ? getResult(finalFix.id) : null
  const championId  =
    finalResult && finalResult.home_goals > finalResult.away_goals ? finalFix?.home_team_id :
    finalResult && finalResult.away_goals > finalResult.home_goals ? finalFix?.away_team_id :
    null
  const champion = championId ? teamMap[championId] : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Real bracket — teams advance automatically from recorded results.
        Left side: M73–M80 → M89–M92 → M97/M99 → M101.
        Right side: M81–M88 → M93–M96 → M98/M100 → M102.
      </p>

      {/* Mobile: stacked rounds */}
      <div className="lg:hidden space-y-6">
        {MOBILE_ROUNDS.map(round => (
          <div key={round.label}>
            <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{round.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {round.ids.map(id => fixtureMap[id]
                ? <MatchupCard key={id} fix={fixtureMap[id]} teamMap={teamMap} />
                : null
              )}
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

      {/* Desktop: official FIFA two-sided bracket */}
      <div className="hidden lg:block">
        <DesktopBracket fixtureMap={fixtureMap} teamMap={teamMap} />
      </div>
    </div>
  )
}
