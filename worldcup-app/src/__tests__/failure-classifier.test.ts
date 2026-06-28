import { describe, it, expect } from 'vitest'
import { classifyEngineFailure, buildBlindSpotProfile } from '@/lib/failure-classifier'
import { makeAdj, QUAL_UNKNOWN, QUAL_MUST_WIN } from './test-factories'

const BASE = {
  homeAdj: undefined,
  awayAdj: undefined,
  homeQual: QUAL_UNKNOWN,
  awayQual: QUAL_UNKNOWN,
}

describe('classifyEngineFailure', () => {
  it('returns correct when exact score matches', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 2, recA: 1, actualH: 2, actualA: 1 })).toBe('correct')
  })

  it('returns correct with floating-point rec that rounds correctly', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 1.6, recA: 0.4, actualH: 2, actualA: 0 })).toBe('correct')
  })

  it('returns away_attack_underestimated when away scored 2+ more and attackFactor high', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 2, recA: 0, actualH: 2, actualA: 3,
      awayAdj: makeAdj('X', 1.20, 1.0),
    })).toBe('away_attack_underestimated')
  })

  it('does NOT return away_attack_underestimated when shortfall < 2', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 2, recA: 0, actualH: 2, actualA: 1,
      awayAdj: makeAdj('X', 1.20, 1.0),
    })).not.toBe('away_attack_underestimated')
  })

  it('returns home_attack_underestimated when home scored 2+ more and attackFactor high', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 0, recA: 2, actualH: 3, actualA: 2,
      homeAdj: makeAdj('Y', 1.15, 1.0),
    })).toBe('home_attack_underestimated')
  })

  it('returns defensive_improvement_ignored when total goals lower by 2+ and good defence', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 3, recA: 2, actualH: 1, actualA: 1,
      homeAdj: makeAdj('Y', 1.0, 0.80),
    })).toBe('defensive_improvement_ignored')
  })

  it('returns qualification_pressure_ignored for must-win home team that outperformed', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 0, recA: 1, actualH: 2, actualA: 1,
      homeQual: QUAL_MUST_WIN,
    })).toBe('qualification_pressure_ignored')
  })

  it('returns qualification_pressure_ignored for must-win away team', () => {
    expect(classifyEngineFailure({
      ...BASE,
      recH: 2, recA: 0, actualH: 1, actualA: 2,
      awayQual: QUAL_MUST_WIN,
    })).toBe('qualification_pressure_ignored')
  })

  it('returns favourite_overestimated when margin >= 2 and outcome differs', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 3, recA: 0, actualH: 1, actualA: 1 })).toBe('favourite_overestimated')
  })

  it('returns over_predicted_goals when same winner but total goals over-predicted by 1+', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 2, recA: 1, actualH: 1, actualA: 0 })).toBe('over_predicted_goals')
  })

  it('over_predicted_goals: fires when predicted 3-1 actual 2-0 (same winner, 2 less goals)', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 3, recA: 1, actualH: 2, actualA: 0 })).toBe('over_predicted_goals')
  })

  it('does NOT return over_predicted_goals when winner differs', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 2, recA: 1, actualH: 0, actualA: 1 })).not.toBe('over_predicted_goals')
  })

  it('returns random_variance as fallback when no pattern fits', () => {
    expect(classifyEngineFailure({ ...BASE, recH: 1, recA: 1, actualH: 0, actualA: 1 })).toBe('random_variance')
  })
})

describe('buildBlindSpotProfile', () => {
  it('excludes correct predictions from profile', () => {
    const entries = [
      { category: 'correct' as const },
      { category: 'random_variance' as const },
    ]
    const profile = buildBlindSpotProfile(entries)
    expect(profile.find(p => p.category === 'correct')).toBeUndefined()
    expect(profile).toHaveLength(1)
  })

  it('calculates percentages correctly', () => {
    const entries = [
      { category: 'random_variance' as const },
      { category: 'random_variance' as const },
      { category: 'over_predicted_goals' as const },
    ]
    const profile = buildBlindSpotProfile(entries)
    const rv = profile.find(p => p.category === 'random_variance')!
    expect(rv.count).toBe(2)
    expect(rv.pct).toBe(67)
  })

  it('returns empty array for empty input', () => {
    expect(buildBlindSpotProfile([])).toEqual([])
  })

  it('sorts by count descending', () => {
    const entries = [
      { category: 'over_predicted_goals' as const },
      { category: 'random_variance' as const },
      { category: 'random_variance' as const },
      { category: 'random_variance' as const },
    ]
    const profile = buildBlindSpotProfile(entries)
    expect(profile[0].category).toBe('random_variance')
    expect(profile[1].category).toBe('over_predicted_goals')
  })
})
