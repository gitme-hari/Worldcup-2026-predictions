// Squad adjustment layer — manual signals that modify xG / confidence before
// the recommendation engine runs. No scraping; all entries are manual.
// Every number here is visible and editable by the user.

import type { SeedPrediction } from './seed-data'
import type { Recommendation } from './recommendation-engine'

// ── Adjustment types ──────────────────────────────────────────────────────────

export type AdjustmentType =
  | 'key_player_missing'
  | 'key_player_returning'
  | 'rotated_squad'
  | 'full_strength'

export interface SquadAdjustment {
  id: string
  fixture_id: string
  /** 'home' or 'away' — which team in this fixture the adjustment applies to */
  team_side: 'home' | 'away'
  type: AdjustmentType
  /** Player name for key_player_missing / key_player_returning */
  player_name?: string
  /**
   * How much this team's own xG is multiplied.
   * 0.85 = −15%, 1.10 = +10%. Omit to use the type default.
   */
  attack_factor?: number
  /** Confidence shift: 'down' | 'none' | 'up'. Omit to use the type default. */
  confidence_shift?: 'down' | 'none' | 'up'
  created_at: string
}

// ── Defaults per type ─────────────────────────────────────────────────────────

interface TypeDefaults {
  attack_factor: number
  confidence_shift: 'down' | 'none' | 'up'
  label: string
  description: string
}

export const ADJUSTMENT_DEFAULTS: Record<AdjustmentType, TypeDefaults> = {
  key_player_missing: {
    attack_factor: 0.85,
    confidence_shift: 'down',
    label: 'Key player missing',
    description: 'Reduces attacking xG −15% and downgrades confidence.',
  },
  key_player_returning: {
    attack_factor: 1.10,
    confidence_shift: 'up',
    label: 'Key player returning',
    description: 'Boosts attacking xG +10% and upgrades confidence.',
  },
  rotated_squad: {
    attack_factor: 0.90,
    confidence_shift: 'down',
    label: 'Rotated squad',
    description: 'Reduces attacking xG −10% and downgrades confidence.',
  },
  full_strength: {
    attack_factor: 1.0,
    confidence_shift: 'up',
    label: 'Full strength',
    description: 'No xG change. Upgrades confidence (removes doubt).',
  },
}

// ── Confidence ladder ─────────────────────────────────────────────────────────

const CONFIDENCE_LADDER: Recommendation['confidence'][] = ['Low', 'Medium', 'High']

export function shiftConfidence(
  base: Recommendation['confidence'],
  shifts: Array<'down' | 'none' | 'up'>,
): Recommendation['confidence'] {
  let idx = CONFIDENCE_LADDER.indexOf(base)
  for (const s of shifts) {
    if (s === 'down') idx = Math.max(0, idx - 1)
    if (s === 'up')   idx = Math.min(2, idx + 1)
  }
  return CONFIDENCE_LADDER[idx]
}

// ── Apply adjustments to raw predictions ─────────────────────────────────────

/**
 * Returns a modified copy of `preds` with xG scaled by any squad adjustments
 * for this fixture, and a rationale string array explaining every change.
 */
export function applySquadAdjustments(
  preds: SeedPrediction[],
  adjustments: SquadAdjustment[],
): { adjustedPreds: SeedPrediction[]; rationale: string[] } {
  if (adjustments.length === 0) return { adjustedPreds: preds, rationale: [] }

  const rationale: string[] = []

  // Net factor per side
  let homeFactor = 1
  let awayFactor = 1

  for (const adj of adjustments) {
    const defaults = ADJUSTMENT_DEFAULTS[adj.type]
    const factor = adj.attack_factor ?? defaults.attack_factor
    const pct = Math.round((factor - 1) * 100)
    const sign = pct >= 0 ? '+' : ''

    if (adj.team_side === 'home') homeFactor *= factor
    else awayFactor *= factor

    const teamLabel = adj.team_side === 'home' ? 'Home' : 'Away'
    const playerPart = adj.player_name ? ` (${adj.player_name})` : ''

    if (factor !== 1) {
      rationale.push(
        `${teamLabel} ${defaults.label}${playerPart} → attack ${sign}${pct}%`,
      )
    } else {
      rationale.push(`${teamLabel} ${defaults.label}${playerPart}`)
    }
  }

  // Round factors to 3 dp to avoid floating-point noise
  const roundedHome = Math.round(homeFactor * 1000) / 1000
  const roundedAway = Math.round(awayFactor * 1000) / 1000

  const adjustedPreds: SeedPrediction[] = preds.map(pred => ({
    ...pred,
    home_goals: Math.max(0.1, Math.round(pred.home_goals * roundedHome * 100) / 100),
    away_goals: Math.max(0.1, Math.round(pred.away_goals * roundedAway * 100) / 100),
  }))

  return { adjustedPreds, rationale }
}

// ── Collect confidence shifts from adjustments ────────────────────────────────

export function collectConfidenceShifts(
  adjustments: SquadAdjustment[],
): Array<'down' | 'none' | 'up'> {
  return adjustments.map(adj => adj.confidence_shift ?? ADJUSTMENT_DEFAULTS[adj.type].confidence_shift)
}

// ── Readable summary for a single adjustment ──────────────────────────────────

export function adjSummary(adj: SquadAdjustment): string {
  const defaults = ADJUSTMENT_DEFAULTS[adj.type]
  const factor = adj.attack_factor ?? defaults.attack_factor
  const pct = Math.round((factor - 1) * 100)
  const sign = pct >= 0 ? '+' : ''
  const playerPart = adj.player_name ? ` · ${adj.player_name}` : ''
  return `${defaults.label}${playerPart}${factor !== 1 ? ` (${sign}${pct}% atk)` : ''}`
}
