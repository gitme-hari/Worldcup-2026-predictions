// End-to-end integration tests for the full recommendation pipeline.
// Pipeline:
//   SeedPredictions
//     → buildRecommendation()        → Recommendation
//     → buildTeamAdjustments()       → TeamAdjustment[]
//     → buildDecisionSupport()       → DecisionSupport
//     → generateMatchReview()        → MatchReview  (after result known)
//     → generateLearningSignals()    → LearningSignal[]
//     → buildRecommendationInsight() → RecommendationInsight

import { describe, it, expect } from 'vitest'
import { buildRecommendation } from '@/lib/recommendation-engine'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { buildDecisionSupport } from '@/lib/decision-support'
import { generateMatchReview, generateAllReviews } from '@/lib/match-review'
import { generateLearningSignals, getApplicableSignals } from '@/lib/learning-signals'
import { buildRecommendationInsight, computeFreshness } from '@/lib/recommendation-insight'
import { makeTeam, makeFixture, makeAllPreds, makeResult, makeLocked, makePoolRec, QUAL_UNKNOWN, QUAL_MUST_WIN, QUAL_ROTATION, QUAL_ELIMINATED } from './test-factories'

// ── Shared test data ──────────────────────────────────────────────────────────

const teamA = makeTeam('col', 'COL', 1780, 'K')
const teamB = makeTeam('civ', 'CIV', 1700, 'E')
const teamC = makeTeam('ger', 'GER', 1980, 'E')
const allTeams = [teamA, teamB, teamC]

const fix1 = makeFixture('col-civ', 'col', 'civ')
const predictions = makeAllPreds('col-civ', 2.1, 0.4)

// ── Stage 1: buildRecommendation ──────────────────────────────────────────────

describe('Stage 1 — buildRecommendation', () => {
  it('returns non-null recommendation from three models', () => {
    expect(buildRecommendation(predictions)).not.toBeNull()
  })

  it('recommendation has correct shape', () => {
    const rec = buildRecommendation(predictions)!
    expect(rec).toMatchObject({
      scoreline: expect.objectContaining({ home: expect.any(Number), away: expect.any(Number) }),
      confidence: expect.stringMatching(/^(High|Medium|Low)$/),
      agreement: expect.stringMatching(/^(full|majority|split)$/),
      alternatives: expect.any(Array),
      rationale: expect.any(Array),
    })
  })

  it('three identical predictions produce full agreement and High confidence', () => {
    const rec = buildRecommendation(predictions)!
    expect(rec.agreement).toBe('full')
    expect(rec.confidence).toBe('High')
  })

  it('mode scoreline is 2-0 when all xG inputs are 2.1-0.4', () => {
    const rec = buildRecommendation(predictions)!
    expect(rec.scoreline).toEqual({ home: 2, away: 0 })
  })

  it('returns null for empty predictions', () => {
    expect(buildRecommendation([])).toBeNull()
  })

  it('split predictions produce Low or Medium confidence', () => {
    const split = [
      { ...predictions[0], home_goals: 2.1, away_goals: 0.4 },
      { ...predictions[1], home_goals: 0.4, away_goals: 2.1 },
      { ...predictions[2], home_goals: 0.9, away_goals: 0.9 },
    ]
    const rec = buildRecommendation(split)!
    expect(rec.agreement).toBe('split')
    expect(['Low', 'Medium']).toContain(rec.confidence)
  })
})

// ── Stage 2: buildTeamAdjustments ────────────────────────────────────────────

describe('Stage 2 — buildTeamAdjustments', () => {
  const fixtures = [fix1]
  const results = [makeResult('col-civ', 3, 0)]

  it('produces adjustments for teams with results', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    expect(adjs.length).toBeGreaterThan(0)
  })

  it('COL attackFactor > 1 when they scored more than expected', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    const col = adjs.find(a => a.teamId === 'col')!
    expect(col).toBeDefined()
    expect(col.attackFactor).toBeGreaterThan(1)
  })

  it('CIV defenceFactor > 1 when they conceded more than expected', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    const civ = adjs.find(a => a.teamId === 'civ')!
    expect(civ.defenceFactor).toBeGreaterThan(1)
  })

  it('adjustment factors are clamped to [0.5, 2.0]', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    for (const adj of adjs) {
      expect(adj.attackFactor).toBeGreaterThanOrEqual(0.5)
      expect(adj.attackFactor).toBeLessThanOrEqual(2.0)
      expect(adj.defenceFactor).toBeGreaterThanOrEqual(0.5)
      expect(adj.defenceFactor).toBeLessThanOrEqual(2.0)
    }
  })

  it('confidence is Low after 1 match', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    const col = adjs.find(a => a.teamId === 'col')!
    expect(col.matchesPlayed).toBe(1)
    expect(col.confidence).toBe('Low')
  })

  it('teams with no results are excluded', () => {
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    expect(adjs.find(a => a.teamId === 'ger')).toBeUndefined()
  })
})

// ── Stage 3: buildDecisionSupport ────────────────────────────────────────────

describe('Stage 3 — buildDecisionSupport', () => {
  const rec = buildRecommendation(predictions)!

  it('produces DecisionSupport with expected shape', () => {
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    expect(support).toMatchObject({
      engineConfidence: expect.stringMatching(/^(High|Medium|Low)$/),
      contextConfidence: expect.any(String),
      supportFactors: expect.any(Array),
      challengeFactors: expect.any(Array),
      challengeLevel: expect.stringMatching(/^(none|minor|significant)$/),
    })
  })

  it('must_win home team with engine predicting home win → support factor added', () => {
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_MUST_WIN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    expect(support.supportFactors.some(f => f.includes('must win'))).toBe(true)
  })

  it('must_win away team with engine predicting home win → challenge factor added', () => {
    const support = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_MUST_WIN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    expect(support.challengeFactors.some(f => f.includes('must win'))).toBe(true)
  })

  it('rotation_risk steps down context confidence', () => {
    const baseSupport = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    const rotSupport = buildDecisionSupport({
      rec, homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    const order = ['High', 'Medium-High', 'Medium', 'Medium-Low', 'Low']
    expect(order.indexOf(rotSupport.contextConfidence)).toBeGreaterThan(
      order.indexOf(baseSupport.contextConfidence)
    )
  })
})

// ── Stage 4: generateMatchReview ─────────────────────────────────────────────

describe('Stage 4 — generateMatchReview (post-result)', () => {
  const rec = buildRecommendation(predictions)!
  const poolRec = makePoolRec('col-civ', rec.scoreline.home, rec.scoreline.away)

  it('accepted rec exact match: 4pts, Both matched, no override', () => {
    const review = generateMatchReview({
      fixture: fix1, home: teamA, away: teamB,
      locked: makeLocked('col-civ', 2, 0),
      rec: poolRec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(4)
    expect(review.verdict).toBe('Both matched')
    expect(review.overridden).toBe(false)
    expect(review.deltaVsEngine).toBe(0)
    expect(review.blindSpot).toBe('correct')
  })

  it('override that succeeded: user 1-1, engine 2-0, actual 1-1', () => {
    const review = generateMatchReview({
      fixture: fix1, home: teamA, away: teamB,
      locked: makeLocked('col-civ', 1, 1, true, 'CIV strong'),
      rec: poolRec, result: makeResult('col-civ', 1, 1),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.verdict).toBe('Override succeeded')
    expect(review.myPts).toBe(4)
    expect(review.enginePts).toBe(0)
    expect(review.deltaVsEngine).toBe(4)
    expect(review.overrideReason).toBe('CIV strong')
  })

  it('override that failed: user 1-1, engine 2-0, actual 2-0', () => {
    const review = generateMatchReview({
      fixture: fix1, home: teamA, away: teamB,
      locked: makeLocked('col-civ', 1, 1, true),
      rec: poolRec, result: makeResult('col-civ', 2, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.verdict).toBe('Override failed')
    expect(review.deltaVsEngine).toBe(-4)
  })

  it('over_predicted_goals: engine 2-0, actual 1-0', () => {
    const review = generateMatchReview({
      fixture: fix1, home: teamA, away: teamB,
      locked: makeLocked('col-civ', 2, 0),
      rec: poolRec, result: makeResult('col-civ', 1, 0),
      homeAdj: undefined, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.blindSpot).toBe('over_predicted_goals')
    expect(review.myPts).toBe(1)
  })
})

// ── Stage 5: generateLearningSignals ─────────────────────────────────────────

describe('Stage 5 — generateLearningSignals from pipeline reviews', () => {
  it('pipeline: reviews → signals → applicable signals chain works end-to-end', () => {
    const opg = Array.from({ length: 6 }, (_, i) => ({
      fixtureId: `f${i}`, homeCode: 'A', awayCode: 'B',
      engineH: 2, engineA: 0, myH: 1, myA: 0,
      actualH: 1, actualA: 0, myPts: 2, enginePts: 1,
      overridden: true, overrideReason: 'Took lower score',
      evidence: [], verdict: 'Override succeeded' as const,
      lesson: '', blindSpot: 'over_predicted_goals' as const,
      deltaVsEngine: 1,
    }))
    const rv = {
      fixtureId: 'f99', homeCode: 'X', awayCode: 'Y',
      engineH: 1, engineA: 1, myH: 1, myA: 1,
      actualH: 0, actualA: 2, myPts: 0, enginePts: 0,
      overridden: false, overrideReason: null,
      evidence: [], verdict: 'Both missed' as const,
      lesson: '', blindSpot: 'random_variance' as const,
      deltaVsEngine: 0,
    }

    const all = generateLearningSignals([...opg, rv])
    const applicable = getApplicableSignals(all)

    expect(all.find(s => s.category === 'random_variance')?.appliedToRecs).toBe(false)
    expect(applicable.every(s => s.category !== 'random_variance')).toBe(true)
    expect(applicable.some(s => s.category === 'over_predicted_goals')).toBe(true)
  })
})

// ── Stage 6: buildRecommendationInsight ──────────────────────────────────────

describe('Stage 6 — buildRecommendationInsight from pipeline outputs', () => {
  const rec = buildRecommendation(predictions)!
  const support = buildDecisionSupport({
    rec, homeAdj: undefined, awayAdj: undefined,
    homeStanding: undefined, awayStanding: undefined,
    homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    apiCtx: undefined, home: teamA, away: teamB,
  })

  it('insight has all expected fields populated', () => {
    const insight = buildRecommendationInsight({
      fixtureId: 'col-civ', rec, support, now: '2026-06-15T08:00:00Z',
    })
    expect(insight.fixtureId).toBe('col-civ')
    expect(insight.scoreline).toEqual({ home: 2, away: 0 })
    expect(insight.confidence).toBe('High')
    expect(insight.freshness.status).toBe('Fresh')
    expect(typeof insight.summary).toBe('string')
  })

  it('freshness transitions: Fresh → Refreshing → Stale', () => {
    const gen = '2026-06-15T08:00:00Z'
    expect(computeFreshness(gen, '2026-06-15T08:20:00Z')).toBe('Fresh')
    expect(computeFreshness(gen, '2026-06-15T10:00:00Z')).toBe('Refreshing')
    expect(computeFreshness(gen, '2026-06-15T16:00:00Z')).toBe('Stale')
  })
})

// ── Full chain: Fixture → Insight ─────────────────────────────────────────────

describe('Full pipeline chain test', () => {
  it('runs all 6 stages in sequence and verifies chain correctness', () => {
    const rec = buildRecommendation(predictions)
    expect(rec).not.toBeNull()

    const fixtures = [fix1]
    const results = [makeResult('col-civ', 3, 0)]
    const adjs = buildTeamAdjustments(allTeams, fixtures, results, predictions)
    const colAdj = adjs.find(a => a.teamId === 'col')
    expect(colAdj!.attackFactor).toBeGreaterThan(1)

    const support = buildDecisionSupport({
      rec: rec!, homeAdj: colAdj, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: teamA, away: teamB,
    })
    expect(support.engineConfidence).toBe(rec!.confidence)

    const review = generateMatchReview({
      fixture: fix1, home: teamA, away: teamB,
      locked: makeLocked('col-civ', rec!.scoreline.home, rec!.scoreline.away),
      rec: makePoolRec('col-civ', rec!.scoreline.home, rec!.scoreline.away),
      result: makeResult('col-civ', 3, 0),
      homeAdj: colAdj, awayAdj: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
    })
    expect(review.myPts).toBe(1)  // 2-0 vs 3-0: winner correct, GD differs

    const moreReviews = Array.from({ length: 5 }, (_, i) => ({
      ...review, fixtureId: `f${i}`,
      blindSpot: 'home_attack_underestimated' as const,
      deltaVsEngine: 1, myPts: 2, enginePts: 1,
    }))
    const signals = generateLearningSignals(moreReviews)
    expect(signals.length).toBeGreaterThan(0)

    const applicable = getApplicableSignals(signals)
    const insight = buildRecommendationInsight({
      fixtureId: 'col-civ', rec: rec!, support,
      appliedLearning: applicable.map(s => ({
        signalId: s.id, lesson: s.lesson,
        strength: s.strength as 'Strong' | 'Moderate',
        source: 'tournament_form' as const,
        adjustmentDescription: `Adjustment`,
        adjustmentMagnitude: 0.1,
        confidence: s.confidence as 'High' | 'Medium',
      })),
      now: '2026-06-15T08:00:00Z',
    })
    expect(insight.fixtureId).toBe('col-civ')
    expect(insight.freshness.status).toBe('Fresh')
  })
})

// ── generateAllReviews integration ────────────────────────────────────────────

describe('generateAllReviews integration', () => {
  const fixtures = [
    fix1,
    makeFixture('col-ger', 'col', 'ger', 2),
  ]
  const results = [
    makeResult('col-civ', 2, 0),
    makeResult('col-ger', 1, 2),
  ]
  const locked = [
    makeLocked('col-civ', 2, 0),
    makeLocked('col-ger', 2, 1, true, 'GER strong away'),
  ]
  const recs = [
    makePoolRec('col-civ', 2, 0),
    makePoolRec('col-ger', 1, 1),
  ]

  it('generates correct number of reviews', () => {
    const reviews = generateAllReviews({
      fixtures, teams: allTeams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results, adjustments: [], qualMap: {},
    })
    expect(reviews).toHaveLength(2)
  })

  it('each review has correct fixtureId', () => {
    const reviews = generateAllReviews({
      fixtures, teams: allTeams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results, adjustments: [], qualMap: {},
    })
    const ids = reviews.map(r => r.fixtureId).sort()
    expect(ids).toEqual(['col-civ', 'col-ger'].sort())
  })

  it('override reason is preserved in review', () => {
    const reviews = generateAllReviews({
      fixtures, teams: allTeams,
      lockedPredictions: locked,
      poolRecommendations: recs,
      results, adjustments: [], qualMap: {},
    })
    const colGer = reviews.find(r => r.fixtureId === 'col-ger')!
    expect(colGer.overridden).toBe(true)
    expect(colGer.overrideReason).toBe('GER strong away')
  })
})
