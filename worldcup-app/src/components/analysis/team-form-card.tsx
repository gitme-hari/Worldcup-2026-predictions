'use client'

import { useState } from 'react'
import {
  buildTeamAdjustments, formatFactor, teamSignal, hasNotableSignal,
} from '@/lib/learning-layer'
import type { TeamAdjustment } from '@/lib/learning-layer'
import type { SeedTeam, SeedFixture, SeedPrediction } from '@/lib/seed-data'
import type { ActualResult } from '@/lib/types'
import { ChevronDown, ChevronRight } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ConfidenceChip({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const cls =
    level === 'High'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : level === 'Medium'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {level}
    </span>
  )
}

// ── Signal row (primary view) ─────────────────────────────────────────────────

function SignalRow({ adj }: { adj: TeamAdjustment }) {
  const sig = teamSignal(adj)
  const arrowCls =
    sig.colour === 'emerald'
      ? 'text-emerald-600'
      : sig.colour === 'red'
        ? 'text-red-500'
        : 'text-amber-500'
  const textCls =
    sig.colour === 'emerald'
      ? 'text-emerald-700'
      : sig.colour === 'red'
        ? 'text-red-600'
        : 'text-amber-600'

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-base leading-none w-6 text-center">{adj.flag}</span>
      <span className="flex-1 text-sm font-medium text-zinc-700 min-w-0">{adj.teamName}</span>
      <span className={`text-sm font-bold ${arrowCls}`}>{sig.arrow}</span>
      <span className={`text-xs ${textCls} text-right`}>{sig.headline}</span>
      <ConfidenceChip level={adj.confidence} />
    </div>
  )
}

// ── Debug breakdown (power-user view) ────────────────────────────────────────

function DebugRow({ adj }: { adj: TeamAdjustment }) {
  return (
    <div className="py-2 border-t border-zinc-100 first:border-t-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{adj.flag}</span>
        <span className="text-xs font-semibold text-zinc-700">{adj.teamName}</span>
        <span className="text-[10px] text-zinc-400">{adj.matchesPlayed}G played</span>
        <ConfidenceChip level={adj.confidence} />
      </div>
      <div className="flex gap-4 text-xs text-zinc-500 mb-1.5">
        <span>ATK factor <span className="font-mono font-semibold text-zinc-700">{formatFactor(adj.attackFactor)}</span></span>
        <span>DEF factor <span className="font-mono font-semibold text-zinc-700">{formatFactor(adj.defenceFactor)}</span></span>
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-zinc-400">
            <th className="text-left pb-0.5 font-normal">Match</th>
            <th className="text-right pb-0.5 font-normal">Scored / xG</th>
            <th className="text-right pb-0.5 font-normal">Conceded / xGA</th>
            <th className="text-right pb-0.5 font-normal pl-2">Wt</th>
          </tr>
        </thead>
        <tbody>
          {adj.contributions.map(c => {
            const atkDelta = Math.round((c.actualScored - c.expectedScored) * 10) / 10
            const defDelta = Math.round((c.actualConceded - c.expectedConceded) * 10) / 10
            return (
              <tr key={c.fixtureId} className="border-t border-zinc-50">
                <td className="py-0.5 pr-2 text-zinc-500">MD{c.matchday} vs {c.opponent}</td>
                <td className="py-0.5 text-right tabular-nums text-zinc-600">
                  {c.actualScored}
                  <span className="text-zinc-400"> / {c.expectedScored.toFixed(1)}</span>
                  <span className={atkDelta >= 0 ? 'text-emerald-600 ml-1' : 'text-red-500 ml-1'}>
                    {atkDelta >= 0 ? '+' : ''}{atkDelta}
                  </span>
                </td>
                <td className="py-0.5 text-right tabular-nums text-zinc-600">
                  {c.actualConceded}
                  <span className="text-zinc-400"> / {c.expectedConceded.toFixed(1)}</span>
                  <span className={defDelta <= 0 ? 'text-emerald-600 ml-1' : 'text-red-500 ml-1'}>
                    {defDelta >= 0 ? '+' : ''}{defDelta}
                  </span>
                </td>
                <td className="py-0.5 pl-2 text-right text-zinc-400">×{c.weight}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface Props {
  teams: SeedTeam[]
  fixtures: SeedFixture[]
  results: ActualResult[]
  predictions: SeedPrediction[]
}

export function TeamFormCard({ teams, fixtures, results, predictions }: Props) {
  const [debugOpen, setDebugOpen] = useState(false)

  const adjustments = buildTeamAdjustments(teams, fixtures, results, predictions)
  const notable     = adjustments.filter(hasNotableSignal)
  const all         = adjustments

  const matchesPlayed = results.length

  if (matchesPlayed === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
        <p className="text-sm font-medium text-zinc-500">Tournament Learning</p>
        <p className="mt-1 text-xs text-zinc-400">
          Signals will appear once match results are entered.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-800">Tournament Learning</h2>
          <span className="text-[10px] text-zinc-400">{matchesPlayed} result{matchesPlayed !== 1 ? 's' : ''} analysed</span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Already incorporated into future recommendations.
        </p>
      </div>

      {/* Signal list */}
      <div className="px-5 py-1 divide-y divide-zinc-50">
        {notable.length > 0 ? (
          notable.map(adj => <SignalRow key={adj.teamId} adj={adj} />)
        ) : (
          <p className="py-3 text-xs text-zinc-400">
            All teams are performing close to model expectations.
          </p>
        )}
      </div>

      {/* Footer note */}
      {notable.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-zinc-400">
            Confidence reflects matches played: 1 game = Low, 2 = Medium, 3+ = High.
          </p>
        </div>
      )}

      {/* Debug details toggle */}
      {all.length > 0 && (
        <div className="border-t border-zinc-100">
          <button
            onClick={() => setDebugOpen(v => !v)}
            className="w-full flex items-center gap-1.5 px-5 py-2.5 text-[11px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
          >
            {debugOpen
              ? <ChevronDown className="h-3 w-3 shrink-0" />
              : <ChevronRight className="h-3 w-3 shrink-0" />}
            Learning debug details (ATK / DEF factors, weighted calculations)
          </button>
          {debugOpen && (
            <div className="px-5 pb-4">
              <p className="text-[10px] text-zinc-400 mb-3">
                ATK = Σ(weight × actual scored) / Σ(weight × xG). DEF = same for conceded. Clamped [0.5–2.0].
                Last 3 matches weighted ×2, earlier ×1.
              </p>
              <div className="divide-y divide-zinc-50">
                {all.map(adj => <DebugRow key={adj.teamId} adj={adj} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
