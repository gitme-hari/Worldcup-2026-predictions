'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getPredictions, getResult, getOverride, getConfig, getBracketOverrides, saveBracketOverride } from '@/lib/store'
import { computeGroupStandings, getEffectivePrediction } from '@/lib/models'
import type { SeedTeam } from '@/lib/seed-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'

// Compute R32 matchups from group standings
// WC 2026: 12 groups → top 2 each + 8 best 3rd place = 32 teams
// For simplicity in V1: just use top 2 from each group in R32

function useGroupWinners() {
  const teams = getTeams()
  const fixtures = getFixtures()
  const predictions = getPredictions()
  const config = getConfig()

  const getScore = (fid: string) => {
    const ovr = getOverride(fid)
    if (ovr) return { home: ovr.home_goals, away: ovr.away_goals }
    const pred = getEffectivePrediction(predictions as any, fid, config.active_model, {
      a: config.weight_a, b: config.weight_b, c: config.weight_c
    })
    if (!pred) return null
    return { home: Math.round(pred.home_goals), away: Math.round(pred.away_goals) }
  }

  const standings = computeGroupStandings(fixtures as any, teams, getScore)
  const result: Record<string, { first: SeedTeam | null; second: SeedTeam | null }> = {}

  'ABCDEFGHIJKL'.split('').forEach(g => {
    const s = standings[g] ?? []
    result[g] = { first: s[0]?.team ?? null, second: s[1]?.team ?? null }
  })

  return result
}

// R32 bracket pairings (simplified WC 2026 bracket)
// The actual bracket is complex (best 3rd place etc.), simplified here to group 1st vs 2nd cross-group
const R32_MATCHUPS = [
  { id: 'r32-1', home: { group: 'A', rank: 1 }, away: { group: 'B', rank: 2 } },
  { id: 'r32-2', home: { group: 'C', rank: 1 }, away: { group: 'D', rank: 2 } },
  { id: 'r32-3', home: { group: 'E', rank: 1 }, away: { group: 'F', rank: 2 } },
  { id: 'r32-4', home: { group: 'G', rank: 1 }, away: { group: 'H', rank: 2 } },
  { id: 'r32-5', home: { group: 'I', rank: 1 }, away: { group: 'J', rank: 2 } },
  { id: 'r32-6', home: { group: 'K', rank: 1 }, away: { group: 'L', rank: 2 } },
  { id: 'r32-7', home: { group: 'B', rank: 1 }, away: { group: 'A', rank: 2 } },
  { id: 'r32-8', home: { group: 'D', rank: 1 }, away: { group: 'C', rank: 2 } },
  { id: 'r32-9', home: { group: 'F', rank: 1 }, away: { group: 'E', rank: 2 } },
  { id: 'r32-10', home: { group: 'H', rank: 1 }, away: { group: 'G', rank: 2 } },
  { id: 'r32-11', home: { group: 'J', rank: 1 }, away: { group: 'I', rank: 2 } },
  { id: 'r32-12', home: { group: 'L', rank: 1 }, away: { group: 'K', rank: 2 } },
  // 4 slots for 3rd place qualifiers (simplified: use group winners as placeholders)
  { id: 'r32-13', home: { group: 'A', rank: 1 }, away: { group: 'C', rank: 1 } },
  { id: 'r32-14', home: { group: 'B', rank: 1 }, away: { group: 'D', rank: 1 } },
  { id: 'r32-15', home: { group: 'E', rank: 1 }, away: { group: 'G', rank: 1 } },
  { id: 'r32-16', home: { group: 'F', rank: 1 }, away: { group: 'H', rank: 1 } },
]

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  final: 'Final',
}

interface SlotTeam {
  team: SeedTeam | null
  slotId: string
  winner?: boolean
}

function TeamSlot({ team, slotId, winner, onOverride }: SlotTeam & { onOverride: (slotId: string) => void }) {
  return (
    <div
      onClick={() => onOverride(slotId)}
      className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1.5 text-xs transition-colors hover:border-blue-400 hover:bg-blue-50 ${
        winner ? 'border-green-300 bg-green-50' : 'border-zinc-200 bg-white'
      }`}
    >
      {team ? (
        <>
          <span>{team.flag_url}</span>
          <span className={`font-medium ${winner ? 'text-green-700' : 'text-zinc-900'}`}>{team.code}</span>
        </>
      ) : (
        <span className="text-zinc-300 italic">TBD</span>
      )}
    </div>
  )
}

function MatchupSlot({
  homeTeam,
  awayTeam,
  homeSlotId,
  awaySlotId,
  winnerId,
  onOverride,
}: {
  homeTeam: SeedTeam | null
  awayTeam: SeedTeam | null
  homeSlotId: string
  awaySlotId: string
  winnerId: string | null
  onOverride: (slotId: string) => void
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-1 min-w-[120px]">
      <TeamSlot
        team={homeTeam}
        slotId={homeSlotId}
        winner={winnerId === homeTeam?.id}
        onOverride={onOverride}
      />
      <div className="my-0.5 border-t border-zinc-100" />
      <TeamSlot
        team={awayTeam}
        slotId={awaySlotId}
        winner={winnerId === awayTeam?.id}
        onOverride={onOverride}
      />
    </div>
  )
}

export function KnockoutBracket() {
  const [mounted, setMounted] = useState(false)
  const [overrideSlot, setOverrideSlot] = useState<string | null>(null)
  const [bracketOverrides, setBracketOverrides] = useState<Record<string, string>>({})
  const [teams, setTeams] = useState<SeedTeam[]>([])
  const [groupWinners, setGroupWinners] = useState<Record<string, { first: SeedTeam | null; second: SeedTeam | null }>>({})

  useEffect(() => {
    setMounted(true)
    setBracketOverrides(getBracketOverrides())
    setTeams(getTeams())
  }, [])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const computedWinners = mounted ? useGroupWinners() : {}

  useEffect(() => {
    if (mounted) setGroupWinners(computedWinners)
  }, [mounted])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const getTeamForSlot = (slotId: string): SeedTeam | null => {
    if (bracketOverrides[slotId]) {
      return teams.find(t => t.id === bracketOverrides[slotId]) ?? null
    }
    return null
  }

  const getGroupSlotTeam = (group: string, rank: 1 | 2): SeedTeam | null => {
    return rank === 1 ? groupWinners[group]?.first ?? null : groupWinners[group]?.second ?? null
  }

  const handleOverride = (slotId: string) => setOverrideSlot(slotId)

  const handleSetOverride = (teamId: string) => {
    if (!overrideSlot) return
    saveBracketOverride(overrideSlot, teamId)
    setBracketOverrides(prev => ({ ...prev, [overrideSlot]: teamId }))
    setOverrideSlot(null)
  }

  // Build R32 matchup teams
  const r32Matchups = R32_MATCHUPS.map(m => {
    const homeSlotId = `${m.id}-home`
    const awaySlotId = `${m.id}-away`
    const homeTeam = getTeamForSlot(homeSlotId) ?? getGroupSlotTeam(m.home.group, m.home.rank as 1 | 2)
    const awayTeam = getTeamForSlot(awaySlotId) ?? getGroupSlotTeam(m.away.group, m.away.rank as 1 | 2)
    const winnerSlot = `${m.id}-winner`
    const winnerId = bracketOverrides[winnerSlot] ?? null
    return { ...m, homeTeam, awayTeam, homeSlotId, awaySlotId, winnerSlot, winnerId }
  })

  // Build progressive rounds from R32 winners
  type RoundMatchup = {
    id: string; homeTeam: SeedTeam | null; awayTeam: SeedTeam | null
    homeSlotId: string; awaySlotId: string; winnerSlot: string; winnerId: string | null
  }

  function buildRound(prevMatchups: Array<{ winnerId: string | null; id: string }>, roundName: string): RoundMatchup[] {
    const result: RoundMatchup[] = []
    for (let i = 0; i < prevMatchups.length; i += 2) {
      const a = prevMatchups[i]
      const b = prevMatchups[i + 1]
      if (!a || !b) break
      const id = `${roundName}-${Math.floor(i / 2) + 1}`
      const homeSlotId = `${id}-home`
      const awaySlotId = `${id}-away`
      const homeTeam = getTeamForSlot(homeSlotId) ??
        (a.winnerId ? teams.find(t => t.id === a.winnerId) ?? null : null)
      const awayTeam = getTeamForSlot(awaySlotId) ??
        (b.winnerId ? teams.find(t => t.id === b.winnerId) ?? null : null)
      const winnerSlot = `${id}-winner`
      const winnerId = bracketOverrides[winnerSlot] ?? null
      result.push({ id, homeTeam, awayTeam, homeSlotId, awaySlotId, winnerSlot, winnerId })
    }
    return result
  }

  const r16Matchups = buildRound(r32Matchups, 'r16')
  const qfMatchups = buildRound(r16Matchups, 'qf')
  const sfMatchups = buildRound(qfMatchups, 'sf')
  const finalMatchup = buildRound(sfMatchups, 'final')

  const rounds = [
    { label: 'Round of 32', matchups: r32Matchups },
    { label: 'Round of 16', matchups: r16Matchups },
    { label: 'Quarter-Finals', matchups: qfMatchups },
    { label: 'Semi-Finals', matchups: sfMatchups },
    { label: 'Final', matchups: finalMatchup },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">Click any team slot to set the advancing team. Winners propagate automatically through the bracket.</p>

      {/* Mobile: stacked rounds */}
      <div className="lg:hidden space-y-6">
        {rounds.map(round => (
          <div key={round.label}>
            <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{round.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {round.matchups.map(m => (
                <MatchupSlot
                  key={m.id}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeSlotId={m.homeSlotId}
                  awaySlotId={m.awaySlotId}
                  winnerId={m.winnerId}
                  onOverride={handleOverride}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal bracket */}
      <div className="hidden lg:flex items-start gap-4 overflow-x-auto pb-4">
        {rounds.map((round, ri) => (
          <div key={round.label} className="shrink-0">
            <div className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{round.label}</div>
            <div className="space-y-4" style={{ marginTop: ri > 0 ? `${Math.pow(2, ri - 1) * 24}px` : 0 }}>
              {round.matchups.map(m => (
                <MatchupSlot
                  key={m.id}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeSlotId={m.homeSlotId}
                  awaySlotId={m.awaySlotId}
                  winnerId={m.winnerId}
                  onOverride={handleOverride}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Champion display */}
        {finalMatchup[0]?.winnerId && (
          <div className="shrink-0">
            <div className="mb-2 text-xs font-semibold text-yellow-600 uppercase tracking-wide">🏆 Champion</div>
            <div className="rounded border-2 border-yellow-400 bg-yellow-50 px-3 py-4 text-center min-w-[100px]">
              {(() => {
                const t = teams.find(t => t.id === finalMatchup[0].winnerId)
                return t ? (
                  <>
                    <div className="text-2xl">{t.flag_url}</div>
                    <div className="text-xs font-bold text-yellow-800 mt-1">{t.name}</div>
                  </>
                ) : null
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Override modal */}
      <Modal
        open={!!overrideSlot}
        onClose={() => setOverrideSlot(null)}
        title="Select advancing team"
      >
        <div className="max-h-80 overflow-y-auto space-y-1">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => handleSetOverride(t.id)}
              className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm text-left hover:bg-zinc-100"
            >
              <span className="text-lg">{t.flag_url}</span>
              <span className="font-medium">{t.name}</span>
              <span className="text-zinc-400 text-xs ml-auto">Grp {t.group}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
