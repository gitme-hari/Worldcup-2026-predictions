// Classifies engine failures into named blind-spot categories.
// Uses current form factors (retroactive) — not form at prediction time.
// The UI surfaces a disclaimer where this limitation matters.

import type { TeamAdjustment } from './learning-layer'
import type { QualificationStatus } from './team-stats'

export type BlindSpotCategory =
  | 'away_attack_underestimated'
  | 'home_attack_underestimated'
  | 'defensive_improvement_ignored'
  | 'qualification_pressure_ignored'
  | 'favourite_overestimated'
  | 'random_variance'
  | 'correct'

export interface BlindSpotProfile {
  category: BlindSpotCategory
  label: string
  count: number
  pct: number
}

const LABELS: Record<BlindSpotCategory, string> = {
  away_attack_underestimated:    'Away attacks underestimated',
  home_attack_underestimated:    'Home attacks underestimated',
  defensive_improvement_ignored: 'Defensive improvements ignored',
  qualification_pressure_ignored:'Qualification pressure ignored',
  favourite_overestimated:       'Favourite overestimated',
  random_variance:               'Random variance',
  correct:                       'Correct prediction',
}

export interface ClassifyParams {
  recH: number
  recA: number
  actualH: number
  actualA: number
  homeAdj: TeamAdjustment | undefined
  awayAdj: TeamAdjustment | undefined
  homeQual: QualificationStatus
  awayQual: QualificationStatus
}

export function classifyEngineFailure({
  recH, recA, actualH, actualA,
  homeAdj, awayAdj,
  homeQual, awayQual,
}: ClassifyParams): BlindSpotCategory {
  // 4-point exact match — engine was correct
  if (Math.round(recH) === actualH && Math.round(recA) === actualA) return 'correct'

  const awayGoalShortfall  = actualA - recA   // positive = actual exceeded prediction
  const homeGoalShortfall  = actualH - recH

  // Away attack significantly under-predicted + away form supports it
  if (awayGoalShortfall >= 2 && awayAdj && awayAdj.attackFactor >= 1.10) {
    return 'away_attack_underestimated'
  }

  // Home attack significantly under-predicted + home form supports it
  if (homeGoalShortfall >= 2 && homeAdj && homeAdj.attackFactor >= 1.10) {
    return 'home_attack_underestimated'
  }

  // Total goals much lower than predicted — defensive improvement ignored
  const predTotal   = recH + recA
  const actualTotal = actualH + actualA
  if (
    predTotal - actualTotal >= 2 &&
    (
      (homeAdj && homeAdj.defenceFactor <= 0.88) ||
      (awayAdj && awayAdj.defenceFactor <= 0.88)
    )
  ) {
    return 'defensive_improvement_ignored'
  }

  // Must-win team predicted to lose/draw but they actually performed as must-win
  const mustWinSide =
    homeQual === 'must_win' ? 'home' :
    awayQual === 'must_win' ? 'away' : null

  if (mustWinSide === 'home' && actualH > recH && recH <= recA) {
    return 'qualification_pressure_ignored'
  }
  if (mustWinSide === 'away' && actualA > recA && recA <= recH) {
    return 'qualification_pressure_ignored'
  }

  // Favourite predicted to win by 2+ but drew or lost
  const recOutcome    = recH > recA ? 'H' : recH < recA ? 'A' : 'D'
  const actualOutcome = actualH > actualA ? 'H' : actualH < actualA ? 'A' : 'D'
  const recMargin     = Math.abs(recH - recA)

  if (recMargin >= 2 && recOutcome !== actualOutcome) {
    return 'favourite_overestimated'
  }

  return 'random_variance'
}

export function buildBlindSpotProfile(
  entries: Array<{ category: BlindSpotCategory }>,
): BlindSpotProfile[] {
  const counts: Partial<Record<BlindSpotCategory, number>> = {}
  let total = 0

  for (const { category } of entries) {
    if (category === 'correct') continue   // don't include successes in failure profile
    counts[category] = (counts[category] ?? 0) + 1
    total++
  }

  if (total === 0) return []

  return (Object.entries(counts) as [BlindSpotCategory, number][])
    .map(([category, count]) => ({
      category,
      label: LABELS[category],
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}
