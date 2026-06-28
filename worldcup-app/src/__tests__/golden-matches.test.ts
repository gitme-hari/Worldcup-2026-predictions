// Golden match tests — frozen expected outputs for representative World Cup 2026 fixtures.
// These tests use realistic tournament data to verify the pipeline produces stable,
// expected outputs. A failure here means behaviour changed unexpectedly.

import { describe, it, expect } from 'vitest'
import { buildRecommendation } from '@/lib/recommendation-engine'
import { generateMatchReview, poolScore } from '@/lib/match-review'
import { classifyEngineFailure } from '@/lib/failure-classifier'
import { generateLearningSignals } from '@/lib/learning-signals'
import { buildRecommendationInsight } from '@/lib/recommendation-insight'
import { buildDecisionSupport } from '@/lib/decision-support'
import { makeTeam, makeFixture, makeAllPreds, makeResult, makeLocked, makePoolRec, makeHumanPred, QUAL_UNKNOWN, QUAL_MUST_WIN, QUAL_ELIMINATED } from './test-factories'

// ── Golden Match 1: Colombia vs Côte d'Ivoire ────────────────────────────────
// Engine 2-0. User overrides to 1-1. Actual 1-1. Override succeeds.
// Key regression: overrideReason from humanPred.comment, not locked.override_reason.

describe("Golden: Colombia vs Côte d'Ivoire", () => {
  const fix = makeFixture('col-civ', 'col', 'civ')
  const col = makeTeam('col', 'COL', 1780, 'K')
  const civ = makeTeam('civ', 'CIV', 1700, 'E')
  const rec = buildRecommendation(makeAllPreds('col-civ', 2.1, 0.4))!

  it('engine recommends 2-0 Colombia win with High confidence', () => {
    expect(rec.scoreline).toEqual({ home: 2, away: 0 })
    expect(rec.confidence).toBe('High')
    expect(rec.agreement).toBe('full')
  })

  it('pool points: exact 2-0 for 2-0 result → 4pts', () => {
    expect(poolScore(2, 0, 2, 0)).toBe(4)
  })

  it('pool points: 1-1 prediction for 1-1 result → 4pts (exact override)', () => {
    expect(poolScore(1, 1, 1, 1)).toBe(4)
  })

  it('pool points: engine 2-0 vs actual 1-1 → 0pts (wrong outcome)', () => {
    expect(poolScore(2, 0, 1, 1)).toBe(0)
  })

  it('full review: override to 1-1 succeeds when actual is 1-1', () => {
    const review = generateMatchReview({
      fixture: fix, home: col, away: civ,
      locked: makeLocked('col-civ', 1, 1, true),
      rec: makePoolRec('col-civ', 2, 0),
      result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      humanPred: makeHumanPred('col-civ', 1, 1, 'CIV never easy'),
    })
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(0)
    expect(review.verdict).toBe('Override succeeded')
    expect(review.deltaVsEngine).toBe(4)
    expect(review.overrideReason).toBe('CIV never easy')
    expect(review.overridden).toBe(true)
    expect(review.homeCode).toBe('COL')
    expect(review.awayCode).toBe('CIV')
    expect(review.blindSpot).toBe('favourite_overestimated')
  })

  it('blind spot: engine 2-0 vs actual 1-1 → favourite_overestimated', () => {
    expect(classifyEngineFailure({
      recH: 2, recA: 0, actualH: 1, actualA: 1,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })).toBe('favourite_overestimated')
  })
})

// ── Golden Match 2: Germany vs Côte d'Ivoire ─────────────────────────────────
// Engine 3-0 Germany. CIV must win. Actual 1-1. qualification_pressure_ignored.

describe('Golden: Germany vs Côte d\'Ivoire (must-win CIV)', () => {
  const fix = makeFixture('ger-civ', 'ger', 'civ')
  const ger = makeTeam('ger', 'GER', 1980, 'E')
  const civ = makeTeam('civ', 'CIV', 1700, 'E')
  const rec = buildRecommendation(makeAllPreds('ger-civ', 3.1, 0.3))!

  it('engine recommends 3-0 Germany win (xG 3.1/0.3 → mode 3-0)', () => {
    expect(rec.scoreline).toEqual({ home: 3, away: 0 })
    expect(rec.confidence).toBe('High')
  })

  it('blind spot: must-win CIV draws → qualification_pressure_ignored', () => {
    expect(classifyEngineFailure({
      recH: 3, recA: 0, actualH: 1, actualA: 1,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_MUST_WIN,
    })).toBe('qualification_pressure_ignored')
  })

  it('review: engine wrong, user accepted rec → Both missed', () => {
    const review = generateMatchReview({
      fixture: fix, home: ger, away: civ,
      locked: makeLocked('ger-civ', 3, 0),
      rec: makePoolRec('ger-civ', 3, 0),
      result: makeResult('ger-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_MUST_WIN,
    })
    expect(review.myPts).toBe(0)
    expect(review.enginePts).toBe(0)
    expect(review.verdict).toBe('Both missed')
    expect(review.blindSpot).toBe('qualification_pressure_ignored')
    expect(review.evidence.some(e => e.includes('motivation elevated'))).toBe(true)
  })

  it('decision support: must-win away with home-win prediction → challenge', () => {
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_MUST_WIN,
      apiCtx: undefined, home: ger, away: civ,
    })
    expect(support.challengeFactors.some(f => f.includes('must win'))).toBe(true)
    expect(['minor', 'significant']).toContain(support.challengeLevel)
  })
})

// ── Golden Match 3: England vs Ghana (accurate high-score prediction) ─────────

describe('Golden: England vs Ghana (high-score accurate prediction)', () => {
  const fix = makeFixture('eng-gha', 'eng', 'gha', 2)
  const eng = makeTeam('eng', 'ENG', 1970, 'L')
  const gha = makeTeam('gha', 'GHA', 1610, 'L')
  const rec = buildRecommendation(makeAllPreds('eng-gha', 3.1, 1.1))!

  it('engine recommends 3-1 England win (xG 3.1/1.1 → mode 3-1)', () => {
    expect(rec.scoreline).toEqual({ home: 3, away: 1 })
  })

  it('pool points: exact 3-1 for 3-1 result → 4pts', () => {
    expect(poolScore(3, 1, 3, 1)).toBe(4)
  })

  it('review: exact match → correct blind spot, 4pts each', () => {
    const review = generateMatchReview({
      fixture: fix, home: eng, away: gha,
      locked: makeLocked('eng-gha', 3, 1),
      rec: makePoolRec('eng-gha', 3, 1),
      result: makeResult('eng-gha', 3, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(4)
    expect(review.blindSpot).toBe('correct')
    expect(review.verdict).toBe('Both matched')
    expect(review.deltaVsEngine).toBe(0)
  })
})

// ── Golden Match 4: Switzerland vs Canada (over-predicted goals) ─────────────
// Engine 2-1. Actual 1-0. Same winner (+1 GD both) → 2pts, over_predicted_goals.

describe('Golden: Switzerland vs Canada (over-predicted goals)', () => {
  const fix = makeFixture('sui-can', 'sui', 'can', 2)
  const sui = makeTeam('sui', 'SUI', 1840, 'B')
  const can = makeTeam('can', 'CAN', 1720, 'B')
  const rec = buildRecommendation(makeAllPreds('sui-can', 2.1, 1.1))!

  it('engine recommends 2-1 Switzerland win (xG 2.1/1.1 → mode 2-1)', () => {
    expect(rec.scoreline).toEqual({ home: 2, away: 1 })
  })

  it('pool points: 2-1 prediction for 1-0 actual → 2pts (same winner AND same GD=+1)', () => {
    expect(poolScore(2, 1, 1, 0)).toBe(2)
  })

  it('blind spot: 2-1 vs 1-0 → over_predicted_goals (same winner, 2 fewer total)', () => {
    expect(classifyEngineFailure({
      recH: 2, recA: 1, actualH: 1, actualA: 0,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })).toBe('over_predicted_goals')
  })

  it('review captures over_predicted_goals and correct lesson', () => {
    const review = generateMatchReview({
      fixture: fix, home: sui, away: can,
      locked: makeLocked('sui-can', 2, 1),
      rec: makePoolRec('sui-can', 2, 1),
      result: makeResult('sui-can', 1, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.blindSpot).toBe('over_predicted_goals')
    expect(review.myPts).toBe(2)  // same winner, same GD (+1)
    expect(review.lesson).toContain('lower scorelines')
  })
})

// ── Golden Match 5: Bosnia vs Qatar (elimination context) ──────────────────

describe('Golden: Bosnia vs Qatar (eliminated team)', () => {
  const fix = makeFixture('bih-qat', 'bih', 'qat', 3)
  const bih = makeTeam('bih', 'BIH', 1640, 'B')
  const qat = makeTeam('qat', 'QAT', 1550, 'B')
  const rec = buildRecommendation(makeAllPreds('bih-qat', 3.1, 0.2))!

  it('engine recommends 3-0 Bosnia win (xG 3.1/0.2 → mode 3-0)', () => {
    expect(rec.scoreline).toEqual({ home: 3, away: 0 })
  })

  it('eliminated status adds challenge factor in decision support', () => {
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_ELIMINATED,
      apiCtx: undefined, home: bih, away: qat,
    })
    expect(support.challengeFactors.some(f => f.includes('eliminated'))).toBe(true)
  })

  it('blind spot: 3-0 vs 2-0 → over_predicted_goals', () => {
    expect(classifyEngineFailure({
      recH: 3, recA: 0, actualH: 2, actualA: 0,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_ELIMINATED,
    })).toBe('over_predicted_goals')
  })

  it('pool points: 3-0 for 2-0 → 1pt (winner correct, GD differs)', () => {
    expect(poolScore(3, 0, 2, 0)).toBe(1)
  })

  it('review: evidence includes QAT eliminated bullet', () => {
    const review = generateMatchReview({
      fixture: fix, home: bih, away: qat,
      locked: makeLocked('bih-qat', 3, 0),
      rec: makePoolRec('bih-qat', 3, 0),
      result: makeResult('bih-qat', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_ELIMINATED,
    })
    expect(review.evidence.some(e => e.includes('eliminated'))).toBe(true)
    expect(review.blindSpot).toBe('over_predicted_goals')
  })
})

// ── Cross-match: Learning signal accumulation ─────────────────────────────────

describe('Golden: Learning signals from multiple over-predicted matches', () => {
  it('6 over_predicted_goals failures (avg positive delta) → Strong signal, appliedToRecs', () => {
    const reviews: import('@/lib/match-review').MatchReview[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        fixtureId: `f${i}`, homeCode: 'A', awayCode: 'B',
        engineH: 2, engineA: 1, myH: 1, myA: 0, actualH: 1, actualA: 0,
        myPts: 4, enginePts: 1, overridden: true, overrideReason: 'took lower' as string | null,
        evidence: [], verdict: 'Override succeeded' as const,
        lesson: '', blindSpot: 'over_predicted_goals' as const, deltaVsEngine: 3,
      })),
      {
        fixtureId: 'f5', homeCode: 'C', awayCode: 'D',
        engineH: 3, engineA: 0, myH: 3, myA: 0, actualH: 2, actualA: 0,
        myPts: 1, enginePts: 1, overridden: false, overrideReason: null,
        evidence: [], verdict: 'Both missed' as const,
        lesson: '', blindSpot: 'over_predicted_goals' as const, deltaVsEngine: 0,
      },
    ]
    const signals = generateLearningSignals(reviews)
    const sig = signals.find(s => s.category === 'over_predicted_goals')!
    expect(sig.occurrences).toBe(6)
    expect(sig.confidence).toBe('High')
    expect(sig.avgPtsImprovement).toBeGreaterThan(0.3)
    expect(sig.strength).toBe('Strong')
    expect(sig.appliedToRecs).toBe(true)
  })

  it('5 over_predicted_goals failures → Moderate signal (below Strong threshold)', () => {
    const reviews = Array.from({ length: 5 }, (_, i) => ({
      fixtureId: `f${i}`, homeCode: 'A', awayCode: 'B',
      engineH: 2, engineA: 0, myH: 1, myA: 0, actualH: 1, actualA: 0,
      myPts: 2, enginePts: 1, overridden: false, overrideReason: null,
      evidence: [], verdict: 'Both missed' as const,
      lesson: '', blindSpot: 'over_predicted_goals' as const, deltaVsEngine: 1,
    }))
    const signals = generateLearningSignals(reviews)
    const sig = signals.find(s => s.category === 'over_predicted_goals')!
    expect(sig.occurrences).toBe(5)
    expect(sig.confidence).toBe('Medium')
    expect(sig.strength).toBe('Moderate')
    expect(sig.appliedToRecs).toBe(true)
  })

  it('RecommendationInsight with over_predicted_goals signal has appliedLearning', () => {
    const rec = buildRecommendation(makeAllPreds('next-fix', 2.1, 0.8))!
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    const insight = buildRecommendationInsight({
      fixtureId: 'next-fix', rec, support,
      appliedLearning: [{
        signalId: 'over_predicted_goals',
        lesson: 'Engine consistently predicts more goals than materialise — trust lower scorelines',
        strength: 'Strong',
        source: 'blind_spot',
        adjustmentDescription: 'Scoreline adjusted to lower total',
        adjustmentMagnitude: 0.1,
        confidence: 'High',
      }],
      now: '2026-06-20T10:00:00Z',
    })
    expect(insight.appliedLearning).toHaveLength(1)
    expect(insight.appliedLearning[0].signalId).toBe('over_predicted_goals')
  })
})
