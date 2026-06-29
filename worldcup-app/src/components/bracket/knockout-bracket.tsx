'use client'
import { useState, useEffect } from 'react'
import {
  getTeams, getFixtures, getResult, getBracketOverrides, saveBracketOverride,
} from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'
import { stageLabel } from '@/lib/seed-data'
import { Modal } from '@/components/ui/modal'

// ── Team slot component ───────────────────────────────────────────────────────

type SlotStatus = 'confirmed' | 'projected' | 'tbd'

interface ResolvedSlot {
  team: SeedTeam | null
  status: SlotStatus
}

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
  fix,
  homeSlot,
  awaySlot,
  winnerId,
  onOverride,
}: {
  fix: SeedFixture
  homeSlot: ResolvedSlot
  awaySlot: ResolvedSlot
  winnerId: string | null
  onOverride: (fixtureId: string, slot: 'home' | 'away') => void
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-1 min-w-[120px]">
      <TeamSlot slot={homeSlot} isWinner={winnerId === homeSlot.team?.id} onClick={() => onOverride(fix.id, 'home')} />
      <div className="my-0.5 border-t border-zinc-100" />
      <TeamSlot slot={awaySlot} isWinner={winnerId === awaySlot.team?.id} onClick={() => onOverride(fix.id, 'away')} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const

export function KnockoutBracket() {
  const [mounted, setMounted]           = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<{ fixtureId: string; slot: 'home' | 'away' } | null>(null)
  const [bracketOverrides, setBracketOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
    setBracketOverrides(getBracketOverrides())
  }, [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))
  const fixtures = getFixtures()

  const knockoutFixtures = fixtures.filter(f => f.stage !== 'group')

  function resolveSlot(fixtureId: string, slot: 'home' | 'away'): ResolvedSlot {
    const key = `${fixtureId}:${slot}`
    if (bracketOverrides[key]) {
      const t = teamMap[bracketOverrides[key]] ?? null
      return { team: t, status: 'confirmed' }
    }
    const fix = knockoutFixtures.find(f => f.id === fixtureId)
    if (!fix) return { team: null, status: 'tbd' }
    const teamId = slot === 'home' ? fix.home_team_id : fix.away_team_id
    if (!teamId) return { team: null, status: 'tbd' }
    const team = teamMap[teamId] ?? null
    // R32 teams are known from draw; later rounds are confirmed only after a result is entered
    const hasResult = !!getResult(fixtureId)
    const status: SlotStatus = fix.stage === 'r32' ? 'projected' : hasResult ? 'confirmed' : 'projected'
    return { team, status }
  }

  function getWinnerId(fix: SeedFixture): string | null {
    // Actual result wins
    const result = getResult(fix.id)
    if (result) {
      if (result.home_goals > result.away_goals) return fix.home_team_id || null
      if (result.away_goals > result.home_goals) return fix.away_team_id || null
      return null // draw (AET/pens — user sets manually)
    }
    // Fall back to manual bracket pick
    return bracketOverrides[`${fix.id}:winner`] ?? null
  }

  const rounds = STAGE_ORDER.map(stage => ({
    label: stageLabel(stage),
    matchups: knockoutFixtures.filter(f => f.stage === stage),
  })).filter(r => r.matchups.length > 0)

  // Add third-place if present
  const thirdPlace = knockoutFixtures.filter(f => f.stage === 'third_place')
  if (thirdPlace.length) {
    rounds.splice(rounds.length - 1, 0, { label: stageLabel('third_place'), matchups: thirdPlace })
  }

  const handleOverride = (fixtureId: string, slot: 'home' | 'away') =>
    setOverrideTarget({ fixtureId, slot })

  const handleSetTeam = (teamId: string) => {
    if (!overrideTarget) return
    const key = `${overrideTarget.fixtureId}:${overrideTarget.slot}`
    saveBracketOverride(key, teamId)
    setBracketOverrides(prev => ({ ...prev, [key]: teamId }))
    setOverrideTarget(null)
  }

  const finalFix  = knockoutFixtures.find(f => f.stage === 'final')
  const championId = finalFix ? getWinnerId(finalFix) : null
  const champion   = championId ? teamMap[championId] : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Click any slot to manually set the advancing team. Results entered in Matches auto-advance winners.
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
              {round.matchups.map(fix => (
                <MatchupCard
                  key={fix.id}
                  fix={fix}
                  homeSlot={resolveSlot(fix.id, 'home')}
                  awaySlot={resolveSlot(fix.id, 'away')}
                  winnerId={getWinnerId(fix)}
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
              {round.matchups.map(fix => (
                <MatchupCard
                  key={fix.id}
                  fix={fix}
                  homeSlot={resolveSlot(fix.id, 'home')}
                  awaySlot={resolveSlot(fix.id, 'away')}
                  winnerId={getWinnerId(fix)}
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
      <Modal open={!!overrideTarget} onClose={() => setOverrideTarget(null)} title="Select advancing team">
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
