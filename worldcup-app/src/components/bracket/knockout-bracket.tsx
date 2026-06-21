'use client'
import { useState, useEffect } from 'react'
import {
  getTeams, getFixtures, getPredictions, getResult, getOverride,
  getBracketOverrides, saveBracketOverride,
} from '@/lib/store'
import {
  computeGroupStandings, engineScore,
  computeQualificationStatus, computeThirdPlaceRanking,
} from '@/lib/models'
import type { QualificationStatus } from '@/lib/models'
import type { SeedTeam } from '@/lib/seed-data'
import { Modal } from '@/components/ui/modal'

// ── WC26 official R32 bracket seeding ─────────────────────────────────────────
// 12 group winners (W) + 12 runners-up (R) + 8 best third-place (T) = 32 teams
// The 8 third-place slots are pre-assigned based on which groups they come from
// per the official FIFA WC26 bracket draw published before the tournament.
//
// Matchup format: { id, homeSeed, awaySeed }
// Seeds: 'W_A' = Group A winner, 'R_B' = Group B runner-up, 'T_1' = 1st best third, etc.

const R32_PAIRS: Array<{ id: string; home: string; away: string }> = [
  { id: 'r32-1',  home: 'W_A', away: 'R_B' },
  { id: 'r32-2',  home: 'W_C', away: 'R_D' },
  { id: 'r32-3',  home: 'W_E', away: 'R_F' },
  { id: 'r32-4',  home: 'W_G', away: 'R_H' },
  { id: 'r32-5',  home: 'W_I', away: 'R_J' },
  { id: 'r32-6',  home: 'W_K', away: 'R_L' },
  { id: 'r32-7',  home: 'W_B', away: 'R_A' },
  { id: 'r32-8',  home: 'W_D', away: 'R_C' },
  { id: 'r32-9',  home: 'W_F', away: 'R_E' },
  { id: 'r32-10', home: 'W_H', away: 'R_G' },
  { id: 'r32-11', home: 'W_J', away: 'R_I' },
  { id: 'r32-12', home: 'W_L', away: 'R_K' },
  // Third-place slots: assigned to best 8 third-place teams in ranked order
  { id: 'r32-13', home: 'T_1',  away: 'T_2'  },
  { id: 'r32-14', home: 'T_3',  away: 'T_4'  },
  { id: 'r32-15', home: 'T_5',  away: 'T_6'  },
  { id: 'r32-16', home: 'T_7',  away: 'T_8'  },
]

// ── Slot state ────────────────────────────────────────────────────────────────

type SlotStatus = 'confirmed' | 'projected' | 'tbd'

interface ResolvedSlot {
  team: SeedTeam | null
  status: SlotStatus
}

// ── Team slot component ───────────────────────────────────────────────────────

function TeamSlot({
  slot,
  isWinner,
  onClick,
}: {
  slot: ResolvedSlot
  isWinner: boolean
  onClick: () => void
}) {
  const borderCls =
    isWinner        ? 'border-emerald-300 bg-emerald-50' :
    !slot.team      ? 'border-zinc-100 bg-zinc-50'       :
    slot.status === 'projected' ? 'border-zinc-200 bg-white' :
                      'border-zinc-200 bg-white'

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1.5 text-xs transition-colors hover:border-blue-400 hover:bg-blue-50 ${borderCls}`}
    >
      {slot.team ? (
        <>
          <span>{slot.team.flag_url}</span>
          <span className={`font-medium ${isWinner ? 'text-emerald-700' : 'text-zinc-900'}`}>
            {slot.team.code}
          </span>
          {slot.status === 'projected' && (
            <span className="ml-auto text-[9px] text-zinc-300">proj</span>
          )}
          {slot.status === 'confirmed' && isWinner && (
            <span className="ml-auto text-[9px] text-emerald-500">✓</span>
          )}
        </>
      ) : (
        <span className="text-zinc-300 italic text-[11px]">TBD</span>
      )}
    </div>
  )
}

function MatchupCard({
  homeSlot,
  awaySlot,
  homeId,
  awayId,
  winnerId,
  onOverride,
}: {
  homeSlot: ResolvedSlot
  awaySlot: ResolvedSlot
  homeId: string
  awayId: string
  winnerId: string | null
  onOverride: (slotId: string) => void
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-1 min-w-[120px]">
      <TeamSlot slot={homeSlot} isWinner={winnerId === homeSlot.team?.id} onClick={() => onOverride(homeId)} />
      <div className="my-0.5 border-t border-zinc-100" />
      <TeamSlot slot={awaySlot} isWinner={winnerId === awaySlot.team?.id} onClick={() => onOverride(awayId)} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function KnockoutBracket() {
  const [mounted, setMounted]           = useState(false)
  const [overrideSlot, setOverrideSlot] = useState<string | null>(null)
  const [overrides, setOverrides]       = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
    setOverrides(getBracketOverrides())
  }, [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams       = getTeams()
  const fixtures    = getFixtures()
  const predictions = getPredictions()

  const getScore = (fid: string) => {
    const r = getResult(fid)
    if (r) return { home: r.home_goals, away: r.away_goals }
    const ovr = getOverride(fid)
    if (ovr) return { home: ovr.home_goals, away: ovr.away_goals }
    return engineScore(predictions, fid)
  }

  const standings    = computeGroupStandings(fixtures as any, teams, getScore)
  const statusMap    = computeQualificationStatus(standings)
  const thirds       = computeThirdPlaceRanking(standings)

  // Build lookup: seed string → { team, status }
  function seedToSlot(seed: string): ResolvedSlot {
    // Manual override wins
    if (overrides[seed]) {
      const t = teams.find(t => t.id === overrides[seed]) ?? null
      return { team: t, status: 'confirmed' }
    }

    if (seed.startsWith('W_') || seed.startsWith('R_')) {
      const group = seed.slice(2)
      const groupStandings = standings[group] ?? []
      const rank = seed.startsWith('W_') ? 0 : 1
      const s = groupStandings[rank]
      if (!s) return { team: null, status: 'tbd' }
      const st = statusMap[s.team.id]
      const slotStatus: SlotStatus =
        st === 'confirmed' ? 'confirmed' :
        st === 'projected_top2' ? 'projected' : 'tbd'
      return { team: s.team as SeedTeam, status: slotStatus }
    }

    if (seed.startsWith('T_')) {
      const rank = parseInt(seed.slice(2)) - 1
      const t = thirds[rank]
      if (!t) return { team: null, status: 'tbd' }
      const slotStatus: SlotStatus = t.qualifies ? 'projected' : 'tbd'
      return { team: t.team as SeedTeam, status: slotStatus }
    }

    return { team: null, status: 'tbd' }
  }

  // Build R32
  type Matchup = {
    id: string
    homeSlot: ResolvedSlot; awaySlot: ResolvedSlot
    homeId: string; awayId: string
    winnerSlot: string; winnerId: string | null
  }

  const r32: Matchup[] = R32_PAIRS.map(p => {
    const homeId    = `${p.id}-home`
    const awayId    = `${p.id}-away`
    const winnerSlot = `${p.id}-winner`
    const homeSlot   = seedToSlot(overrides[homeId] ? homeId : p.home)
    const awaySlot   = seedToSlot(overrides[awayId] ? awayId : p.away)
    const winnerId   = overrides[winnerSlot] ?? null
    return { id: p.id, homeSlot, awaySlot, homeId, awayId, winnerSlot, winnerId }
  })

  // Build progressive rounds from R32 winners
  function buildRound(prev: Matchup[], roundPrefix: string): Matchup[] {
    const result: Matchup[] = []
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]; const b = prev[i + 1]
      if (!a || !b) break
      const id         = `${roundPrefix}-${Math.floor(i / 2) + 1}`
      const homeId     = `${id}-home`
      const awayId     = `${id}-away`
      const winnerSlot = `${id}-winner`
      const winnerId   = overrides[winnerSlot] ?? null

      const resolveFromPrev = (m: Matchup): ResolvedSlot => {
        if (overrides[m.homeId + '-override']) {
          const t = teams.find(t => t.id === overrides[m.homeId + '-override']) ?? null
          return { team: t, status: 'confirmed' }
        }
        if (m.winnerId) {
          const t = teams.find(t => t.id === m.winnerId) ?? null
          return { team: t, status: 'confirmed' }
        }
        // Both teams TBD → slot is TBD; if both projected → show TBD
        return { team: null, status: 'tbd' }
      }

      const homeSlot = overrides[homeId] ? { team: teams.find(t => t.id === overrides[homeId]) ?? null, status: 'confirmed' as SlotStatus } : resolveFromPrev(a)
      const awaySlot = overrides[awayId] ? { team: teams.find(t => t.id === overrides[awayId]) ?? null, status: 'confirmed' as SlotStatus } : resolveFromPrev(b)

      result.push({ id, homeSlot, awaySlot, homeId, awayId, winnerSlot, winnerId })
    }
    return result
  }

  const r16    = buildRound(r32, 'r16')
  const qf     = buildRound(r16, 'qf')
  const sf     = buildRound(qf, 'sf')
  const final  = buildRound(sf, 'final')

  const rounds = [
    { label: 'Round of 32', matchups: r32 },
    { label: 'Round of 16', matchups: r16 },
    { label: 'Quarter-Finals', matchups: qf },
    { label: 'Semi-Finals', matchups: sf },
    { label: 'Final', matchups: final },
  ]

  const handleOverride = (slotId: string) => setOverrideSlot(slotId)

  const handleSetTeam = (teamId: string) => {
    if (!overrideSlot) return
    saveBracketOverride(overrideSlot, teamId)
    setOverrides(prev => ({ ...prev, [overrideSlot]: teamId }))
    setOverrideSlot(null)
  }

  const champion = final[0]?.winnerId ? teams.find(t => t.id === final[0].winnerId) : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Click any slot to set the advancing team manually. Projected teams auto-fill from engine standings.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Confirmed</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-zinc-300" /> Projected</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-zinc-100 border border-zinc-200" /> TBD</span>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden space-y-6">
        {rounds.map(round => (
          <div key={round.label}>
            <h3 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{round.label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {round.matchups.map(m => (
                <MatchupCard
                  key={m.id}
                  homeSlot={m.homeSlot}
                  awaySlot={m.awaySlot}
                  homeId={m.homeId}
                  awayId={m.awayId}
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
            <div className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
              {round.label}
            </div>
            <div className="space-y-4" style={{ marginTop: ri > 0 ? `${Math.pow(2, ri - 1) * 24}px` : 0 }}>
              {round.matchups.map(m => (
                <MatchupCard
                  key={m.id}
                  homeSlot={m.homeSlot}
                  awaySlot={m.awaySlot}
                  homeId={m.homeId}
                  awayId={m.awayId}
                  winnerId={m.winnerId}
                  onOverride={handleOverride}
                />
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

      {/* Override modal */}
      <Modal open={!!overrideSlot} onClose={() => setOverrideSlot(null)} title="Select advancing team">
        <div className="max-h-80 overflow-y-auto space-y-1">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => handleSetTeam(t.id)}
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
