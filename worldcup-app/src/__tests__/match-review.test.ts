import { describe, it, expect } from 'vitest'
import { poolScore, generateMatchReview, generateAllReviews } from '@/lib/match-review'
import { makeTeam, makeFixture, makeResult, makeLocked, makePoolRec, makeHumanPred, QUAL_UNKNOWN, QUAL_MUST_WIN, QUAL_ROTATION } from './test-factories'

const fix = makeFixture('col-civ', 'col', 'civ')
const home = makeTeam('col', 'COL', 1780, 'K')
const away = makeTeam('civ', 'CIV', 1700, 'E')
const rec = makePoolRec('col-civ', 2, 0)

// ── poolScore ─────────────────────────────────────────────────────────────────

describe('poolScore', () => {
  it('returns 4 for exact score', () => {
    expect(poolScore(2, 1, 2, 1)).toBe(4)
  })

  it('returns 4 when float prediction rounds to exact', () => {
    expect(poolScore(1.6, 0.4, 2, 0)).toBe(4)
  })

  it('returns 2 for correct winner and correct goal difference', () => {
    expect(poolScore(3, 1, 2, 0)).toBe(2)  // both home by 2
  })

  it('returns 1 for correct winner only', () => {
    expect(poolScore(1, 0, 3, 1)).toBe(1)  // home wins, GD differs (pred 1 vs actual 2)
  })

  it('returns 0 for completely wrong prediction', () => {
    expect(poolScore(2, 0, 0, 2)).toBe(0)
  })

  it('returns 2 for correct draw prediction — GD is 0 in both cases', () => {
    expect(poolScore(1, 1, 2, 2)).toBe(2)
  })

  it('returns 2 for draw with exact GD (both 0)', () => {
    expect(poolScore(0, 0, 1, 1)).toBe(2)  // GD = 0 in both cases
  })
})

// ── generateMatchReview ───────────────────────────────────────────────────────

describe('generateMatchReview', () => {
  it('accepted rec: exact match gives 4pts, Both matched verdict', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(4)
    expect(review.verdict).toBe('Both matched')
    expect(review.overridden).toBe(false)
  })

  it('accepted rec: engine and user both miss → Both missed', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 0, 2),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.verdict).toBe('Both missed')
    expect(review.myPts).toBe(0)
    expect(review.enginePts).toBe(0)
  })

  it('successful override: user beats engine', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 1, 1, true, 'CIV strong'),
      rec, result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.overridden).toBe(true)
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(0)
    expect(review.verdict).toBe('Override succeeded')
    expect(review.deltaVsEngine).toBe(4)
  })

  it('failed override: engine beats user', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 1, 1, true),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.verdict).toBe('Override failed')
    expect(review.myPts).toBe(0)
    expect(review.enginePts).toBe(4)
    expect(review.deltaVsEngine).toBe(-4)
  })

  it('no rec: verdict is No rec available, enginePts null', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec: undefined, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.verdict).toBe('No rec available')
    expect(review.enginePts).toBeNull()
    expect(review.deltaVsEngine).toBeNull()
  })

  it('override reason falls back to humanPred.comment when locked has none', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 1, 1, true),  // no overrideReason
      rec, result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      humanPred: makeHumanPred('col-civ', 1, 1, 'Key player injured'),
    })
    expect(review.overrideReason).toBe('Key player injured')
  })

  it('override reason from locked takes precedence over humanPred.comment', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 1, 1, true, 'Both teams look tired'),
      rec, result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      humanPred: makeHumanPred('col-civ', 1, 1, 'different reason'),
    })
    expect(review.overrideReason).toBe('Both teams look tired')
  })

  it('returns null overrideReason when engine pick and no humanPred', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.overrideReason).toBeNull()
  })

  it('includes homeCode and awayCode from team codes', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.homeCode).toBe('COL')
    expect(review.awayCode).toBe('CIV')
  })

  it('falls back to uppercased team_id when team not found', () => {
    const review = generateMatchReview({
      fixture: fix, home: undefined, away: undefined,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.homeCode).toBe('COL')
    expect(review.awayCode).toBe('CIV')
  })

  it('evidence includes must_win motivation bullet', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_MUST_WIN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.evidence.some(e => e.includes('motivation elevated'))).toBe(true)
  })

  it('evidence includes rotation risk bullet', () => {
    const review = generateMatchReview({
      fixture: fix, home, away,
      locked: makeLocked('col-civ', 2, 0),
      rec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
    })
    expect(review.evidence.some(e => e.includes('rotation likely'))).toBe(true)
  })
})

// ── generateAllReviews ────────────────────────────────────────────────────────

describe('generateAllReviews', () => {
  const fixtures = [fix]
  const teams = [home, away]
  const results = [makeResult('col-civ', 2, 0)]
  const locked = [makeLocked('col-civ', 2, 0)]
  const recs = [rec]

  it('generates one review for completed fixtures with locked prediction', () => {
    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results,
      adjustments: [],
      qualMap: {},
    })
    expect(reviews).toHaveLength(1)
    expect(reviews[0].fixtureId).toBe('col-civ')
  })

  it('skips fixtures without a result', () => {
    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results: [],
      adjustments: [],
      qualMap: {},
    })
    expect(reviews).toHaveLength(0)
  })

  it('skips fixtures without a locked prediction', () => {
    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: [],
      poolRecommendations: recs,
      results,
      adjustments: [],
      qualMap: {},
    })
    expect(reviews).toHaveLength(0)
  })

  it('passes humanPredictions override reason through', () => {
    const reviews = generateAllReviews({
      fixtures, teams,
      lockedPredictions: [makeLocked('col-civ', 1, 1, true)],
      poolRecommendations: recs,
      results,
      adjustments: [],
      qualMap: {},
      humanPredictions: [makeHumanPred('col-civ', 1, 1, 'Gut feeling')],
    })
    expect(reviews[0].overrideReason).toBe('Gut feeling')
  })
})
