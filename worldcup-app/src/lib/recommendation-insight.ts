// RecommendationInsight — the single shared context object consumed by
// Dashboard, Matches, and Performance. Built once per fixture, persisted
// as a snapshot, and read by all three pages.

import type { Recommendation } from './recommendation-engine'
import type { DecisionSupport } from './decision-support'

// ── Freshness ─────────────────────────────────────────────────────────────────

export type InsightFreshness = 'Fresh' | 'Refreshing' | 'Stale'

export interface FreshnessMetadata {
  status: InsightFreshness
  generatedAt: string
  lastCheckedAt: string
  staleSince?: string
}

const FRESH_TTL_MS  = 30 * 60 * 1000   // 30 min
const STALE_TTL_MS  =  6 * 60 * 60 * 1000  // 6 h

export function computeFreshness(generatedAt: string, now = new Date().toISOString()): InsightFreshness {
  const age = new Date(now).getTime() - new Date(generatedAt).getTime()
  if (age < FRESH_TTL_MS) return 'Fresh'
  if (age < STALE_TTL_MS) return 'Refreshing'
  return 'Stale'
}

// ── Applied Learning ──────────────────────────────────────────────────────────

export interface AppliedLearning {
  signalId: string
  lesson: string
  strength: 'Strong' | 'Moderate'     // Weak signals are never applied
  source: 'tournament_form' | 'override_history' | 'blind_spot' | 'qualification_pressure'
  adjustmentDescription: string        // "Away xG increased by 12%"
  adjustmentMagnitude: number          // fraction e.g. 0.12
  confidence: 'High' | 'Medium'
}

// ── Changelog ─────────────────────────────────────────────────────────────────

export type ChangelogEvent =
  | 'created'
  | 'learning_applied'
  | 'api_context_updated'
  | 'scoreline_changed'
  | 'locked'

export interface ChangelogEntry {
  timestamp: string
  event: ChangelogEvent
  description: string                  // "Away goals increased from 0 to 1"
  driver: string                       // "Defensive momentum signal (Strong)"
  scorelineBefore?: { home: number; away: number }
  scorelineAfter?: { home: number; away: number }
  confidenceBefore?: string
  confidenceAfter?: string
}

// ── API Context Summary ───────────────────────────────────────────────────────

export interface ApiContextSummary {
  homeAbsences: number
  awayAbsences: number
  lineupConfirmed: boolean
  notes: string[]
}

// ── RecommendationInsight (main type) ────────────────────────────────────────

export interface RecommendationInsight {
  fixtureId: string
  scoreline: { home: number; away: number }
  confidence: 'High' | 'Medium' | 'Low'

  // Dashboard: one sentence only
  summary: string

  // Matches + Performance: full detail
  confidenceReasons: string[]
  supportFactors: string[]
  challengeFactors: string[]
  challengeLevel: 'none' | 'minor' | 'significant'
  appliedLearning: AppliedLearning[]
  netXgAdjustment: { home: number; away: number }
  apiContext: ApiContextSummary | null
  recommendationNotes: string[]
  changelog: ChangelogEntry[]          // newest first
  freshness: FreshnessMetadata
  snapshotVersion: number
}

// ── Builder ───────────────────────────────────────────────────────────────────

export interface BuildInsightParams {
  fixtureId: string
  rec: Recommendation
  support: DecisionSupport
  appliedLearning?: AppliedLearning[]
  apiContext?: ApiContextSummary | null
  priorChangelog?: ChangelogEntry[]
  snapshotVersion?: number
  now?: string
}

export function buildRecommendationInsight({
  fixtureId,
  rec,
  support,
  appliedLearning = [],
  apiContext = null,
  priorChangelog = [],
  snapshotVersion = 1,
  now = new Date().toISOString(),
}: BuildInsightParams): RecommendationInsight {
  const netXgAdjustment = appliedLearning.reduce(
    (acc, s) => {
      // Convention: positive magnitude on 'away' signals boosts away xG, home signals boost home
      if (s.source === 'tournament_form' && s.signalId.includes('away')) {
        return { ...acc, away: +(acc.away + s.adjustmentMagnitude).toFixed(3) }
      }
      if (s.source === 'tournament_form' && s.signalId.includes('home')) {
        return { ...acc, home: +(acc.home + s.adjustmentMagnitude).toFixed(3) }
      }
      return acc
    },
    { home: 0, away: 0 },
  )

  const summary = buildSummary(support, appliedLearning, apiContext)

  const freshness: FreshnessMetadata = {
    status: computeFreshness(now, now),
    generatedAt: now,
    lastCheckedAt: now,
  }

  return {
    fixtureId,
    scoreline: rec.scoreline,
    confidence: rec.confidence,
    summary,
    confidenceReasons: support.confidenceReasons,
    supportFactors: support.supportFactors,
    challengeFactors: support.challengeFactors,
    challengeLevel: support.challengeLevel,
    appliedLearning,
    netXgAdjustment,
    apiContext,
    recommendationNotes: support.netEffect ? [support.netEffect] : [],
    changelog: priorChangelog,
    freshness,
    snapshotVersion,
  }
}

// Derives the one-sentence Dashboard summary from available signals.
function buildSummary(
  support: DecisionSupport,
  applied: AppliedLearning[],
  apiCtx: ApiContextSummary | null,
): string {
  // Significant challenge wins — user needs to see it
  if (support.challengeLevel === 'significant' && support.challengeFactors.length > 0) {
    const factor = support.challengeFactors[0].toLowerCase()
    return `Context challenges this pick — ${factor}.`
  }

  // Strong learning applied + supporting context
  const strongSignal = applied.find(s => s.strength === 'Strong')
  if (strongSignal && support.supportFactors.length >= 1) {
    return `${strongSignal.lesson.toLowerCase().replace(/\.$/, '')} supports this recommendation.`
  }

  // API context confirms lineup
  if (apiCtx?.lineupConfirmed && support.challengeLevel === 'none') {
    return 'Lineup confirmed — no significant concerns with this recommendation.'
  }

  // Net effect from decision support
  if (support.netEffect) return support.netEffect

  return 'No strong context signals — rely on engine confidence.'
}
