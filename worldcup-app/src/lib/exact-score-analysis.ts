// Analyses exact score prediction performance to surface patterns that
// help maximise 4-point outcomes. Consumed by the Engine Learning tab
// on the Performance page.

import type { MatchReview } from './match-review'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PointDistribution {
  exact: number     // 4 pts
  gdWin: number     // 2 pts
  winOnly: number   // 1 pt
  miss: number      // 0 pts
  total: number
}

export interface MissedPattern {
  predicted: string   // e.g. "2–0"
  actual: string      // e.g. "2–1"
  count: number
}

export interface ExactScoreProfile {
  distribution: PointDistribution
  avgPts: number
  homeGoalBias: number    // avg(myH - actualH); negative = under-predicting home goals
  awayGoalBias: number
  missedPatterns: MissedPattern[]
  topMissedPattern: string | null   // plain-English summary of the most common miss
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildExactScoreProfile(reviews: MatchReview[]): ExactScoreProfile {
  const dist: PointDistribution = { exact: 0, gdWin: 0, winOnly: 0, miss: 0, total: reviews.length }

  let totalPts = 0
  let homeGolBiasSum = 0
  let awayGolBiasSum = 0

  const patternCounts: Record<string, number> = {}

  for (const r of reviews) {
    totalPts        += r.myPts
    homeGolBiasSum  += r.myH - r.actualH
    awayGolBiasSum  += r.myA - r.actualA

    switch (r.myPts) {
      case 4: dist.exact++;   break
      case 2: dist.gdWin++;   break
      case 1: dist.winOnly++; break
      default: dist.miss++;   break
    }

    // Track miss patterns where we had an engine rec to compare against
    if (r.myPts < 4 && r.engineH !== null && r.engineA !== null) {
      const key = `${r.engineH}–${r.engineA}→${r.actualH}–${r.actualA}`
      patternCounts[key] = (patternCounts[key] ?? 0) + 1
    }
  }

  const n = reviews.length || 1

  const missedPatterns: MissedPattern[] = Object.entries(patternCounts)
    .map(([key, count]) => {
      const [predicted, actual] = key.split('→')
      return { predicted, actual, count }
    })
    .filter(p => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topMissedPattern = buildTopMissedSummary(missedPatterns, homeGolBiasSum / n, awayGolBiasSum / n)

  return {
    distribution: dist,
    avgPts: Math.round((totalPts / n) * 100) / 100,
    homeGoalBias: Math.round((homeGolBiasSum / n) * 100) / 100,
    awayGoalBias: Math.round((awayGolBiasSum / n) * 100) / 100,
    missedPatterns,
    topMissedPattern,
  }
}

function buildTopMissedSummary(
  patterns: MissedPattern[],
  homeGoalBias: number,
  awayGoalBias: number,
): string | null {
  if (patterns.length === 0 && Math.abs(homeGoalBias) < 0.15 && Math.abs(awayGoalBias) < 0.15) {
    return null
  }

  const parts: string[] = []

  if (patterns.length > 0) {
    const top = patterns[0]
    parts.push(`Engine frequently predicts ${top.predicted}, actual often becomes ${top.actual} (${top.count}×)`)
  }

  if (homeGoalBias < -0.25) {
    parts.push(`Home goals under-predicted by ${Math.abs(homeGoalBias).toFixed(1)} on average`)
  } else if (homeGoalBias > 0.25) {
    parts.push(`Home goals over-predicted by ${homeGoalBias.toFixed(1)} on average`)
  }

  if (awayGoalBias < -0.25) {
    parts.push(`Away goals under-predicted by ${Math.abs(awayGoalBias).toFixed(1)} on average`)
  } else if (awayGoalBias > 0.25) {
    parts.push(`Away goals over-predicted by ${awayGoalBias.toFixed(1)} on average`)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}
