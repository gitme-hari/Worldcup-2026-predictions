import { describe, it, expect } from 'vitest'
import { generateLearningSignals, getApplicableSignals } from '@/lib/learning-signals'
import type { MatchReview } from '@/lib/match-review'

function makeReview(overrides: Partial<MatchReview>): MatchReview {
  return {
    fixtureId: 'f1',
    homeCode: 'A',
    awayCode: 'B',
    engineH: 2,
    engineA: 0,
    myH: 2,
    myA: 0,
    actualH: 0,
    actualA: 2,
    myPts: 0,
    enginePts: 0,
    overridden: false,
    overrideReason: null,
    evidence: [],
    verdict: 'Both missed',
    lesson: '',
    blindSpot: 'random_variance',
    deltaVsEngine: 0,
    ...overrides,
  }
}

function makeReviews(
  blindSpot: MatchReview['blindSpot'],
  count: number,
  delta = 1,
): MatchReview[] {
  return Array.from({ length: count }, (_, i) =>
    makeReview({ fixtureId: `f${i}`, blindSpot, deltaVsEngine: delta, enginePts: 0, myPts: delta }),
  )
}

describe('generateLearningSignals', () => {
  it('returns empty array for no reviews', () => {
    expect(generateLearningSignals([])).toEqual([])
  })

  it('excludes reviews where enginePts is null', () => {
    const reviews = [makeReview({ enginePts: null, blindSpot: 'favourite_overestimated' })]
    expect(generateLearningSignals(reviews)).toHaveLength(0)
  })

  it('excludes correct predictions', () => {
    const reviews = makeReviews('correct', 10)
    expect(generateLearningSignals(reviews)).toHaveLength(0)
  })

  it('groups by blind spot category', () => {
    const reviews = [
      ...makeReviews('random_variance', 3),
      ...makeReviews('over_predicted_goals', 4),
    ]
    const signals = generateLearningSignals(reviews)
    expect(signals).toHaveLength(2)
  })

  it('computes correct occurrence count', () => {
    const reviews = makeReviews('away_attack_underestimated', 5, 1)
    const signals = generateLearningSignals(reviews)
    expect(signals[0].occurrences).toBe(5)
  })

  it('computes avgPtsImprovement correctly', () => {
    const reviews = [
      makeReview({ blindSpot: 'over_predicted_goals', deltaVsEngine: 2, enginePts: 0, myPts: 2 }),
      makeReview({ fixtureId: 'f2', blindSpot: 'over_predicted_goals', deltaVsEngine: 0, enginePts: 1, myPts: 1 }),
    ]
    const signals = generateLearningSignals(reviews)
    expect(signals[0].avgPtsImprovement).toBe(1)
  })

  it('Strong signal: occurrences >= 5, High confidence, avgPts > 0.3', () => {
    const reviews = makeReviews('away_attack_underestimated', 6, 1)
    const signals = generateLearningSignals(reviews)
    expect(signals[0].strength).toBe('Strong')
    expect(signals[0].confidence).toBe('High')
  })

  it('Moderate signal: occurrences >= 3, non-Low confidence, avgPts > 0.1', () => {
    const reviews = makeReviews('home_attack_underestimated', 3, 0.5)
    const signals = generateLearningSignals(reviews)
    expect(signals[0].strength).toBe('Moderate')
  })

  it('Weak signal: occurrences < 3', () => {
    const reviews = makeReviews('favourite_overestimated', 2, 2)
    const signals = generateLearningSignals(reviews)
    expect(signals[0].strength).toBe('Weak')
  })

  it('random_variance is never appliedToRecs (regression: bug fix 3)', () => {
    const reviews = makeReviews('random_variance', 10, 2)
    const signals = generateLearningSignals(reviews)
    const rv = signals.find(s => s.category === 'random_variance')!
    expect(rv.appliedToRecs).toBe(false)
  })

  it('negative avgPtsImprovement means appliedToRecs = false', () => {
    const reviews = makeReviews('over_predicted_goals', 6, -1)
    const signals = generateLearningSignals(reviews)
    expect(signals[0].appliedToRecs).toBe(false)
  })

  it('sorts Strong before Moderate before Weak', () => {
    const reviews = [
      ...makeReviews('away_attack_underestimated', 6, 1),   // Strong
      ...makeReviews('home_attack_underestimated', 3, 0.5), // Moderate
      ...makeReviews('favourite_overestimated', 1, 2),      // Weak
    ]
    const signals = generateLearningSignals(reviews)
    expect(signals[0].strength).toBe('Strong')
    expect(signals[1].strength).toBe('Moderate')
    expect(signals[2].strength).toBe('Weak')
  })
})

describe('getApplicableSignals', () => {
  it('returns only Strong and Moderate signals that are appliedToRecs', () => {
    const reviews = [
      ...makeReviews('away_attack_underestimated', 6, 1),
      ...makeReviews('favourite_overestimated', 1, 2),
    ]
    const all = generateLearningSignals(reviews)
    const applicable = getApplicableSignals(all)
    expect(applicable.every(s => s.appliedToRecs)).toBe(true)
    expect(applicable.some(s => s.strength === 'Weak')).toBe(false)
  })
})
