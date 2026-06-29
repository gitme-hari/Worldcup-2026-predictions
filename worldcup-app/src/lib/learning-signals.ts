// Derives structured learning signals from completed match reviews.
// No database table — signals are computed at read time from match_reviews.
// Only Strong and Moderate signals are applied to recommendations.
// Weak signals are returned but flagged as inactive.

import type { MatchReview } from './match-review'
import type { BlindSpotCategory } from './failure-classifier'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LearningStrength = 'Strong' | 'Moderate' | 'Weak'

export interface LearningSignal {
  id: string                        // stable key e.g. 'away_attack_underestimated'
  lesson: string                    // human-readable lesson
  category: BlindSpotCategory
  occurrences: number
  avgPtsImprovement: number         // avg(myPts - enginePts) for reviews matching this category
  confidence: 'High' | 'Medium' | 'Low'
  strength: LearningStrength
  appliedToRecs: boolean            // true only for Strong or Moderate
}

// ── Strength thresholds ───────────────────────────────────────────────────────

function computeStrength(
  confidence: 'High' | 'Medium' | 'Low',
  occurrences: number,
  avgPts: number,
): LearningStrength {
  if (confidence === 'High' && occurrences >= 5 && avgPts > 0.3) return 'Strong'
  if (confidence !== 'Low'  && occurrences >= 3 && avgPts > 0.1) return 'Moderate'
  return 'Weak'
}

function computeConfidence(occurrences: number): 'High' | 'Medium' | 'Low' {
  if (occurrences >= 6) return 'High'
  if (occurrences >= 3) return 'Medium'
  return 'Low'
}

// ── Lesson strings ────────────────────────────────────────────────────────────

const LESSONS: Record<string, string> = {
  away_attack_underestimated:    'Away team attacks are consistently underestimated',
  home_attack_underestimated:    'Home team attacks are consistently underestimated',
  defensive_improvement_ignored: 'Defensive improvements are underweighted in predictions',
  qualification_pressure_ignored:'Must-win pressure boosts team performance beyond engine baseline',
  favourite_overestimated:       'Heavy favourites are over-predicted — upsets are more common than modelled',
  random_variance:               'Outcomes without identifiable signals — within normal variance',
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateLearningSignals(reviews: MatchReview[]): LearningSignal[] {
  // Only include reviews where engine rec exists and failed (0 or 1 pt)
  const relevant = reviews.filter(
    r => r.enginePts !== null && r.blindSpot !== 'correct',
  )

  // Group by blind spot category
  const groups: Partial<Record<BlindSpotCategory, MatchReview[]>> = {}
  for (const r of relevant) {
    if (!groups[r.blindSpot]) groups[r.blindSpot] = []
    groups[r.blindSpot]!.push(r)
  }

  const signals: LearningSignal[] = []

  for (const [category, categoryReviews] of Object.entries(groups) as [BlindSpotCategory, MatchReview[]][]) {
    const occurrences = categoryReviews.length
    const avgPtsImprovement = categoryReviews
      .filter(r => r.deltaVsEngine !== null)
      .reduce((sum, r, _, arr) => sum + (r.deltaVsEngine ?? 0) / arr.length, 0)

    const confidence = computeConfidence(occurrences)
    const strength   = computeStrength(confidence, occurrences, avgPtsImprovement)

    signals.push({
      id: category,
      lesson: LESSONS[category] ?? category,
      category,
      occurrences,
      avgPtsImprovement: Math.round(avgPtsImprovement * 100) / 100,
      confidence,
      strength,
      appliedToRecs: strength !== 'Weak',
    })
  }

  // Sort: Strong first, then Moderate, then Weak; ties by occurrences desc
  return signals.sort((a, b) => {
    const order: Record<LearningStrength, number> = { Strong: 0, Moderate: 1, Weak: 2 }
    const od = order[a.strength] - order[b.strength]
    return od !== 0 ? od : b.occurrences - a.occurrences
  })
}

// Convenience: only return signals that should influence recommendations
export function getApplicableSignals(signals: LearningSignal[]): LearningSignal[] {
  return signals.filter(s => s.appliedToRecs)
}
