// Regression tests for bugs that must never reappear.
// Each test is paired with a comment pointing to the original bug.

import { describe, it, expect } from 'vitest'
import { poolScore, generateMatchReview } from '@/lib/match-review'
import { classifyEngineFailure } from '@/lib/failure-classifier'
import { generateLearningSignals } from '@/lib/learning-signals'
import { makeTeam, makeFixture, makeResult, makeLocked, makePoolRec, makeHumanPred, QUAL_UNKNOWN, QUAL_MUST_WIN } from './test-factories'

// ── Bug: float comparison in poolScore (Phase A2) ─────────────────────────────

describe('poolScore float rounding (regression)', () => {
  it('scores 4 when fractional rec rounds to exact result', () => {
    expect(poolScore(1.6, 0.4, 2, 0)).toBe(4)
    expect(poolScore(2.49, 0.51, 2, 1)).toBe(4)
  })

  it('scores correct GD when rounded values share goal difference', () => {
    expect(poolScore(1.6, 0.6, 2, 0)).toBe(1)
  })
})

// ── Bug: overrideReason always null (Phase A2, bug fix 1) ────────────────────

describe('overrideReason fallback to humanPred.comment (regression)', () => {
  const fixture = makeFixture('col-civ', 'col', 'civ')

  it('overrideReason is populated from humanPred.comment when locked has no reason', () => {
    const review = generateMatchReview({
      fixture, home: undefined, away: undefined,
      locked: makeLocked('col-civ', 1, 1, true),  // custom, no override_reason
      rec: makePoolRec('col-civ', 2, 0),
      result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      humanPred: makeHumanPred('col-civ', 1, 1, 'COL/CIV both fatigued from previous match'),
    })
    expect(review.overrideReason).toBe('COL/CIV both fatigued from previous match')
  })

  it('overrideReason is null when no source provides a reason', () => {
    const review = generateMatchReview({
      fixture, home: undefined, away: undefined,
      locked: makeLocked('col-civ', 1, 1, true),
      rec: makePoolRec('col-civ', 2, 0),
      result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.overrideReason).toBeNull()
  })
})

// ── Bug: all engine failures classified as random_variance (Phase A2, bug fix 2) ──

describe('over_predicted_goals classification (regression)', () => {
  it('classifies same-winner, fewer-actual-goals as over_predicted_goals', () => {
    expect(classifyEngineFailure({
      recH: 2, recA: 1, actualH: 1, actualA: 0,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })).toBe('over_predicted_goals')
  })

  it('does not fall to random_variance when over-prediction pattern fits', () => {
    const result = classifyEngineFailure({
      recH: 3, recA: 1, actualH: 2, actualA: 0,
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(result).not.toBe('random_variance')
    expect(result).toBe('over_predicted_goals')
  })
})

// ── Bug: random_variance appliedToRecs = true (Phase A2, bug fix 3) ──────────

describe('random_variance never appliedToRecs (regression)', () => {
  it('random_variance is never applied regardless of occurrence count or avgPts', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => ({
      fixtureId: `f${i}`,
      homeCode: 'A', awayCode: 'B',
      engineH: 2, engineA: 0, myH: 2, myA: 0,
      actualH: 1, actualA: 1, myPts: 0, enginePts: 0,
      overridden: false, overrideReason: null,
      evidence: [], verdict: 'Both missed' as const,
      lesson: '', blindSpot: 'random_variance' as const,
      deltaVsEngine: 1,
    }))

    const signals = generateLearningSignals(reviews)
    const rv = signals.find(s => s.category === 'random_variance')
    expect(rv?.appliedToRecs).toBe(false)
  })
})

// ── Bug: over_predicted_goals missing lesson (Phase A2 + validation, bug fix 7) ──

describe('over_predicted_goals has a lesson string (regression)', () => {
  it('lesson contains "lower scorelines" for over_predicted_goals blind spot', () => {
    const review = generateMatchReview({
      fixture: makeFixture('sui-can', 'sui', 'can'),
      home: makeTeam('sui', 'SUI', 1840, 'B'),
      away: makeTeam('can', 'CAN', 1720, 'B'),
      locked: makeLocked('sui-can', 2, 1),
      rec: makePoolRec('sui-can', 2, 1),
      result: makeResult('sui-can', 1, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.blindSpot).toBe('over_predicted_goals')
    expect(review.lesson).toContain('lower scorelines')
  })
})
