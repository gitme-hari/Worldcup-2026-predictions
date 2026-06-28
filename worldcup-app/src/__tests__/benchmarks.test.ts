// Performance benchmarks for the learning pipeline.
// Targets:
//   buildRecommendationInsight() < 10 ms
//   generateLearningSignals(100) < 50 ms
//   generateAllReviews(100)      < 200 ms
//   buildRecommendation()×100    < 100 ms

import { describe, it, expect } from 'vitest'
import { buildRecommendation } from '@/lib/recommendation-engine'
import { generateAllReviews } from '@/lib/match-review'
import { generateLearningSignals } from '@/lib/learning-signals'
import { buildRecommendationInsight } from '@/lib/recommendation-insight'
import { buildDecisionSupport } from '@/lib/decision-support'
import { makeTeam, makeFixture, makeAllPreds, makeResult, makeLocked, makePoolRec, QUAL_UNKNOWN } from './test-factories'
import type { MatchReview } from '@/lib/match-review'

// ── Data factories ────────────────────────────────────────────────────────────

function makeFixtures(n: number) {
  return Array.from({ length: n }, (_, i) => makeFixture(`fix${i}`, `team${i % 32}`, `team${(i + 1) % 32}`, Math.floor(i / 16) + 1))
}

function makeTeams(n = 32) {
  return Array.from({ length: n }, (_, i) => makeTeam(`team${i}`, `T${i}`, 1500 + i))
}

function makePredictions(fixtures: ReturnType<typeof makeFixtures>) {
  return fixtures.flatMap(f => makeAllPreds(f.id, 1.5, 1.0))
}

function makeResults(fixtures: ReturnType<typeof makeFixtures>) {
  return fixtures.map((f, i) => makeResult(f.id, i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0, i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2))
}

function makeLockedMany(fixtures: ReturnType<typeof makeFixtures>) {
  return fixtures.map((f, i) => makeLocked(f.id, i % 2 === 0 ? 2 : 1, i % 2 === 0 ? 0 : 1, i % 5 === 0))
}

function makePoolRecs(fixtures: ReturnType<typeof makeFixtures>) {
  return fixtures.map(f => makePoolRec(f.id, 2, 0))
}

function makeReviews(n: number): MatchReview[] {
  const blindSpots: MatchReview['blindSpot'][] = ['over_predicted_goals', 'random_variance', 'favourite_overestimated', 'away_attack_underestimated', 'correct']
  return Array.from({ length: n }, (_, i) => ({
    fixtureId: `f${i}`, homeCode: 'A', awayCode: 'B',
    engineH: 2, engineA: 0, myH: 2, myA: 0,
    actualH: 1, actualA: 0, myPts: 1, enginePts: 1,
    overridden: false, overrideReason: null,
    evidence: [], verdict: 'Both missed' as const,
    lesson: '', blindSpot: blindSpots[i % blindSpots.length],
    deltaVsEngine: i % 3 === 0 ? 1 : 0,
  }))
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

describe('Performance: buildRecommendation', () => {
  it('runs 100 recommendations in < 100 ms', () => {
    const preds = makeAllPreds('f1', 1.5, 1.0)
    const start = performance.now()
    for (let i = 0; i < 100; i++) buildRecommendation(preds)
    const elapsed = performance.now() - start
    console.log(`buildRecommendation ×100: ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('Performance: generateAllReviews', () => {
  it('100 fixtures processed in < 200 ms', () => {
    const fixtures = makeFixtures(100)
    const teams = makeTeams(32)
    const results = makeResults(fixtures)
    const locked = makeLockedMany(fixtures)
    const recs = makePoolRecs(fixtures)

    const start = performance.now()
    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results, adjustments: [], qualMap: {},
    })
    const elapsed = performance.now() - start

    console.log(`generateAllReviews(100): ${elapsed.toFixed(1)} ms → ${reviews.length} reviews`)
    expect(reviews).toHaveLength(100)
    expect(elapsed).toBeLessThan(200)
  })
})

describe('Performance: generateLearningSignals', () => {
  it('100 reviews processed in < 50 ms', () => {
    const reviews = makeReviews(100)
    const start = performance.now()
    const signals = generateLearningSignals(reviews)
    const elapsed = performance.now() - start
    console.log(`generateLearningSignals(100): ${elapsed.toFixed(1)} ms → ${signals.length} signals`)
    expect(elapsed).toBeLessThan(50)
  })

  it('500 reviews (tournament scale) processed in < 200 ms', () => {
    const reviews = makeReviews(500)
    const start = performance.now()
    generateLearningSignals(reviews)
    const elapsed = performance.now() - start
    console.log(`generateLearningSignals(500): ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(200)
  })
})

describe('Performance: buildRecommendationInsight', () => {
  it('single insight built in < 10 ms', () => {
    const preds = makeAllPreds('f1', 1.5, 1.0)
    const rec = buildRecommendation(preds)!
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })

    const start = performance.now()
    buildRecommendationInsight({ fixtureId: 'f1', rec, support, now: '2026-06-15T10:00:00Z' })
    const elapsed = performance.now() - start
    console.log(`buildRecommendationInsight: ${elapsed.toFixed(2)} ms`)
    expect(elapsed).toBeLessThan(10)
  })

  it('48 insights (full group stage) built in < 100 ms', () => {
    const preds = makeAllPreds('f1', 1.5, 1.0)
    const rec = buildRecommendation(preds)!
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })

    const start = performance.now()
    for (let i = 0; i < 48; i++) {
      buildRecommendationInsight({ fixtureId: `f${i}`, rec, support, now: '2026-06-15T10:00:00Z' })
    }
    const elapsed = performance.now() - start
    console.log(`buildRecommendationInsight ×48: ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('Performance: full pipeline end-to-end (48 fixtures)', () => {
  it('recommendation + review + signals + insight for 48 fixtures < 500 ms', () => {
    const fixtures = makeFixtures(48)
    const teams = makeTeams(32)
    const results = makeResults(fixtures)
    const locked = makeLockedMany(fixtures)
    const poolRecs = makePoolRecs(fixtures)
    const preds = makePredictions(fixtures)

    const start = performance.now()

    const fixturePreds = fixtures.map(f => preds.filter(p => p.fixture_id === f.id))
    const recs = fixturePreds.map(fp => buildRecommendation(fp)).filter(Boolean)

    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: locked,
      poolRecommendations: poolRecs,
      results, adjustments: [], qualMap: {},
    })

    const signals = generateLearningSignals(reviews)

    recs.forEach((rec, i) => {
      const support = buildDecisionSupport({
        rec: rec!, homeAdj: undefined, awayAdj: undefined,
        homeStanding: undefined, awayStanding: undefined,
        homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
        apiCtx: undefined, home: undefined, away: undefined,
      })
      buildRecommendationInsight({ fixtureId: `fix${i}`, rec: rec!, support, now: '2026-06-15T10:00:00Z' })
    })

    const elapsed = performance.now() - start
    console.log(`Full pipeline (48 fixtures): ${elapsed.toFixed(1)} ms, ${signals.length} signals`)
    expect(elapsed).toBeLessThan(500)
  })
})
