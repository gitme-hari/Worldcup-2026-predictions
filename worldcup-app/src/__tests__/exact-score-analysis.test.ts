import { describe, it, expect } from 'vitest'
import { buildExactScoreProfile } from '@/lib/exact-score-analysis'
import type { MatchReview } from '@/lib/match-review'

function makeReview(myH: number, myA: number, actualH: number, actualA: number, myPts: number, engineH: number | null = null, engineA: number | null = null): MatchReview {
  return {
    fixtureId: 'f1',
    homeCode: 'A', awayCode: 'B',
    engineH, engineA,
    myH, myA, actualH, actualA,
    myPts, enginePts: null,
    overridden: false, overrideReason: null,
    evidence: [], verdict: 'Both missed', lesson: '',
    blindSpot: 'random_variance', deltaVsEngine: null,
  }
}

describe('buildExactScoreProfile', () => {
  it('returns zero distribution for empty reviews', () => {
    const profile = buildExactScoreProfile([])
    expect(profile.distribution.total).toBe(0)
    expect(profile.avgPts).toBe(0)
  })

  it('correctly counts point distribution', () => {
    const reviews = [
      makeReview(2, 1, 2, 1, 4),
      makeReview(3, 1, 2, 0, 2),
      makeReview(1, 0, 3, 1, 1),
      makeReview(2, 0, 0, 2, 0),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.distribution.exact).toBe(1)
    expect(profile.distribution.gdWin).toBe(1)
    expect(profile.distribution.winOnly).toBe(1)
    expect(profile.distribution.miss).toBe(1)
    expect(profile.distribution.total).toBe(4)
  })

  it('computes avgPts correctly', () => {
    const reviews = [
      makeReview(2, 1, 2, 1, 4),
      makeReview(2, 0, 0, 2, 0),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.avgPts).toBe(2)
  })

  it('homeGoalBias: positive means over-predicting home goals', () => {
    // Predicted 2, actual 1 → bias = +1
    const reviews = [
      makeReview(2, 0, 1, 0, 1),
      makeReview(2, 0, 1, 0, 1),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.homeGoalBias).toBe(1)
  })

  it('awayGoalBias: negative means under-predicting away goals', () => {
    // Predicted 0, actual 2 → bias = -2
    const reviews = [
      makeReview(1, 0, 1, 2, 1),
      makeReview(1, 0, 1, 2, 1),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.awayGoalBias).toBe(-2)
  })

  it('tracks missed patterns when engine rec exists', () => {
    const reviews = [
      makeReview(1, 0, 2, 1, 1, 1, 0),
      makeReview(1, 0, 2, 1, 1, 1, 0),
      makeReview(1, 0, 2, 1, 1, 1, 0),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.missedPatterns).toHaveLength(1)
    expect(profile.missedPatterns[0].count).toBe(3)
    expect(profile.missedPatterns[0].predicted).toBe('1–0')
    expect(profile.missedPatterns[0].actual).toBe('2–1')
  })

  it('does not include patterns with count < 2', () => {
    const reviews = [makeReview(1, 0, 2, 1, 1, 1, 0)]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.missedPatterns).toHaveLength(0)
  })

  it('topMissedPattern is null when no patterns and low bias', () => {
    const reviews = [makeReview(1, 1, 1, 1, 4)]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.topMissedPattern).toBeNull()
  })

  it('topMissedPattern includes over-prediction bias text', () => {
    const reviews = [
      makeReview(3, 0, 1, 0, 1),
      makeReview(3, 0, 1, 0, 1),
      makeReview(3, 0, 1, 0, 1),
    ]
    const profile = buildExactScoreProfile(reviews)
    expect(profile.homeGoalBias).toBe(2)
    expect(profile.topMissedPattern).toContain('over-predicted')
  })
})
