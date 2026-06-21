'use client'

import { useState } from 'react'
import { ADJUSTMENT_DEFAULTS, adjSummary } from '@/lib/squad-adjustments'
import type { AdjustmentType, SquadAdjustment } from '@/lib/squad-adjustments'
import { saveSquadAdjustment, deleteSquadAdjustment } from '@/lib/store'
import { X, Plus, Users } from 'lucide-react'
import type { SeedTeam } from '@/lib/seed-data'

interface Props {
  fixtureId: string
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  adjustments: SquadAdjustment[]
  onChange: () => void
}

const TYPES: AdjustmentType[] = [
  'key_player_missing',
  'key_player_returning',
  'rotated_squad',
  'full_strength',
]

const DEFAULT_FACTORS: Record<AdjustmentType, number> = {
  key_player_missing: 0.85,
  key_player_returning: 1.10,
  rotated_squad: 0.90,
  full_strength: 1.0,
}

function pctLabel(factor: number) {
  const pct = Math.round((factor - 1) * 100)
  return pct === 0 ? 'no change' : (pct > 0 ? `+${pct}%` : `${pct}%`)
}

export function SquadAdjustmentEditor({ fixtureId, home, away, adjustments, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [side, setSide]           = useState<'home' | 'away'>('home')
  const [type, setType]           = useState<AdjustmentType>('key_player_missing')
  const [playerName, setPlayerName] = useState('')
  const [customFactor, setCustomFactor] = useState<string>('')

  function handleAdd() {
    const factor = customFactor !== '' ? parseFloat(customFactor) : undefined
    if (factor !== undefined && (isNaN(factor) || factor <= 0 || factor > 3)) return
    saveSquadAdjustment({
      fixture_id: fixtureId,
      team_side: side,
      type,
      player_name: playerName.trim() || undefined,
      attack_factor: factor,
    })
    setPlayerName('')
    setCustomFactor('')
    onChange()
  }

  function handleDelete(id: string) {
    deleteSquadAdjustment(id)
    onChange()
  }

  const sideLabel = (s: 'home' | 'away') =>
    s === 'home' ? (home?.name ?? 'Home') : (away?.name ?? 'Away')

  return (
    <div className="border-t border-zinc-100 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <Users className="h-3.5 w-3.5" />
        Squad Notes
        {adjustments.length > 0 && (
          <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-700">
            {adjustments.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Existing adjustments */}
          {adjustments.length > 0 && (
            <ul className="space-y-1">
              {adjustments.map(adj => (
                <li
                  key={adj.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1.5"
                >
                  <span className="text-xs text-amber-800 leading-snug">
                    <span className="font-semibold">{sideLabel(adj.team_side)}</span>{' '}
                    — {adjSummary(adj)}
                  </span>
                  <button
                    onClick={() => handleDelete(adj.id)}
                    className="shrink-0 text-amber-400 hover:text-red-500 transition-colors"
                    aria-label="Remove adjustment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add form */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-2.5">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
              Add adjustment
            </p>

            {/* Team side */}
            <div className="flex gap-2">
              {(['home', 'away'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    side === s
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {sideLabel(s)}
                </button>
              ))}
            </div>

            {/* Type picker */}
            <div className="space-y-1">
              {TYPES.map(t => {
                const d = ADJUSTMENT_DEFAULTS[t]
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`w-full flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                      type === t
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <span className="text-xs font-medium text-zinc-700">{d.label}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      atk {pctLabel(DEFAULT_FACTORS[t])}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Player name (only for player-level types) */}
            {(type === 'key_player_missing' || type === 'key_player_returning') && (
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Player name (optional)"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-400"
              />
            )}

            {/* Custom factor override */}
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">
                Custom attack factor (optional, default: {DEFAULT_FACTORS[type]})
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="3"
                value={customFactor}
                onChange={e => setCustomFactor(e.target.value)}
                placeholder={`${DEFAULT_FACTORS[type]} (leave blank for default)`}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-400"
              />
              <p className="text-[10px] text-zinc-400 mt-0.5">
                e.g. 0.80 = −20%, 1.15 = +15%
              </p>
            </div>

            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {/* Transparency note */}
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            These adjustments scale xG before the recommendation engine runs.
            Confidence is also shifted up/down automatically.
            All changes are listed in the recommendation rationale.
          </p>
        </div>
      )}
    </div>
  )
}
