'use client'

import { useState } from 'react'
import { buildTeamAdjustments, formatFactor } from '@/lib/learning-layer'
import type { TeamAdjustment } from '@/lib/learning-layer'
import type { SeedTeam, SeedFixture, SeedPrediction } from '@/lib/seed-data'
import type { ActualResult } from '@/lib/types'

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidencePip({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const cls =
    level === 'High'
      ? 'bg-emerald-500'
      : level === 'Medium'
        ? 'bg-amber-400'
        : 'bg-zinc-400'
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${cls} mr-1.5 flex-shrink-0`}
    />
  )
}

function FactorBadge({ label, factor }: { label: string; factor: number }) {
  const pct = Math.round((factor - 1) * 100)
  const text = formatFactor(factor)
  const color =
    pct > 10
      ? 'text-emerald-400'
      : pct < -10
        ? 'text-rose-400'
        : 'text-zinc-400'
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{text}</span>
    </span>
  )
}

function BreakdownRow({ c }: { c: TeamAdjustment['contributions'][0] }) {
  const atkPct = Math.round((c.actualScored - c.expectedScored) * 10) / 10
  const defPct = Math.round((c.actualConceded - c.expectedConceded) * 10) / 10
  return (
    <tr className="border-t border-zinc-800 text-xs">
      <td className="py-1 pr-3 text-zinc-400">MD{c.matchday} vs {c.opponent}</td>
      <td className="py-1 pr-3 tabular-nums text-right">
        {c.actualScored} <span className="text-zinc-600">(xG {c.expectedScored.toFixed(1)})</span>
        <span className={atkPct >= 0 ? 'text-emerald-400 ml-1' : 'text-rose-400 ml-1'}>
          {atkPct >= 0 ? '+' : ''}{atkPct}
        </span>
      </td>
      <td className="py-1 tabular-nums text-right">
        {c.actualConceded} <span className="text-zinc-600">(xGA {c.expectedConceded.toFixed(1)})</span>
        <span className={defPct <= 0 ? 'text-emerald-400 ml-1' : 'text-rose-400 ml-1'}>
          {defPct >= 0 ? '+' : ''}{defPct}
        </span>
      </td>
      <td className="py-1 pl-3 text-zinc-500 text-right">×{c.weight}</td>
    </tr>
  )
}

function TeamRow({ adj }: { adj: TeamAdjustment }) {
  const [open, setOpen] = useState(false)
  const atkPct = Math.round((adj.attackFactor - 1) * 100)
  const defPct = Math.round((adj.defenceFactor - 1) * 100)

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors text-left"
      >
        <span className="text-xl leading-none">{adj.flag}</span>
        <span className="flex-1 min-w-0">
          <span className="font-medium text-zinc-100 text-sm">{adj.teamName}</span>
          <span className="text-zinc-500 text-xs ml-2">{adj.matchesPlayed}G</span>
        </span>
        <span className="flex items-center gap-3 mr-2">
          <FactorBadge label="ATK" factor={adj.attackFactor} />
          <FactorBadge label="DEF" factor={adj.defenceFactor} />
        </span>
        <span className="flex items-center text-xs text-zinc-500">
          <ConfidencePip level={adj.confidence} />
          {adj.confidence}
        </span>
        <span className="ml-2 text-zinc-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 bg-zinc-900/60">
          <p className="text-xs text-zinc-500 mb-2">
            Attack {formatFactor(adj.attackFactor)} · Defence {formatFactor(adj.defenceFactor)} ·{' '}
            Confidence {adj.confidence} ({adj.matchesPlayed} match
            {adj.matchesPlayed !== 1 ? 'es' : ''}, recent matches weighted ×2)
          </p>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-600">
                <th className="text-left pb-1">Match</th>
                <th className="text-right pb-1">Scored (xG)</th>
                <th className="text-right pb-1">Conceded (xGA)</th>
                <th className="text-right pb-1 pl-3">Wt</th>
              </tr>
            </thead>
            <tbody>
              {adj.contributions.map(c => (
                <BreakdownRow key={c.fixtureId} c={c} />
              ))}
            </tbody>
          </table>
          <p className="text-xs text-zinc-600 mt-2">
            ATK factor = Σ(weight × actual scored) / Σ(weight × xG scored).{' '}
            DEF factor = Σ(weight × actual conceded) / Σ(weight × xGA conceded).{' '}
            Clamped to [0.5, 2.0].
          </p>
        </div>
      )}
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
  const adjustments = buildTeamAdjustments(teams, fixtures, results, predictions)

  if (adjustments.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 p-6 text-center text-sm text-zinc-500">
        No results entered yet — form factors will appear once matches are played.
      </div>
    )
  }

  const highDeviators = adjustments.filter(
    a => Math.abs(a.attackFactor - 1) >= 0.05 || Math.abs(a.defenceFactor - 1) >= 0.05,
  )
  const baseline = adjustments.filter(
    a => Math.abs(a.attackFactor - 1) < 0.05 && Math.abs(a.defenceFactor - 1) < 0.05,
  )

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="font-semibold text-zinc-100">Team Form</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Live attack / defence adjustments learned from actual results vs model xG.
          Recent matches weighted ×2. Click any row to inspect the calculation.
        </p>
      </div>

      <div className="p-4 space-y-2">
        {highDeviators.map(adj => (
          <TeamRow key={adj.teamId} adj={adj} />
        ))}

        {baseline.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-zinc-500 px-2 py-1 hover:text-zinc-400 list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              {baseline.length} team{baseline.length !== 1 ? 's' : ''} tracking at baseline (±5%)
            </summary>
            <div className="mt-2 space-y-2">
              {baseline.map(adj => (
                <TeamRow key={adj.teamId} adj={adj} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
