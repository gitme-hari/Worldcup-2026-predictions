// Regression tests freezing the exact netEffect sentence produced by buildDecisionSupport.
// These cover every branch in the netEffect derivation (8 distinct paths).
// If the verdict wording changes, these tests fail — that's the point.

import { describe, it, expect } from 'vitest'
import { buildDecisionSupport } from '@/lib/decision-support'
import type { Recommendation } from '@/lib/recommendation-engine'
import { makeTeam, makeStanding, makeAdj, makeMatchContext, QUAL_UNKNOWN, QUAL_MUST_WIN, QUAL_ROTATION, QUAL_ELIMINATED } from './test-factories'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRec(
  agreement: 'full' | 'majority' | 'split',
  confidence: 'High' | 'Medium' | 'Low' = 'High',
  scoreline = { home: 2, away: 0 },
): Recommendation {
  return {
    scoreline,
    confidence,
    rationale: [],
    alternatives: [],
    agreement,
    avgXgHome: 2.0,
    avgXgAway: 0.5,
    outcomeProbs: { home: 0.60, draw: 0.25, away: 0.15 },
    modelScorelines: {
      A: { h: scoreline.home, a: scoreline.away },
      B: agreement === 'split' ? { h: 0, a: 2 } : { h: scoreline.home, a: scoreline.away },
      C: agreement === 'full'  ? { h: scoreline.home, a: scoreline.away } : { h: 1, a: 1 },
    },
  }
}

const COL = makeTeam('col', 'COL', 1780, 'K')
const QAT = makeTeam('qat', 'QAT', 1550, 'B')
const CIV = makeTeam('civ', 'CIV', 1700, 'E')

// ── Path 1: Only model agreement, no other context ────────────────────────────
// full → support=['All 3 models agree']; challenge=[]; s=1, c=0, none, s<2
// → 'No strong context signals — rely on engine confidence alone.'

describe('netEffect: no strong context signals', () => {
  it('full agreement with no other context → no strong signals', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.netEffect).toBe(
      'No strong context signals — rely on engine confidence alone.',
    )
  })

  it('majority agreement with no other context → no strong signals', () => {
    const support = buildDecisionSupport({
      rec: makeRec('majority'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.netEffect).toBe(
      'No strong context signals — rely on engine confidence alone.',
    )
  })
})

// ── Path 2: No challenge, s >= 2, High confidence ─────────────────────────────
// full (s=1) + homeStanding confirms scoring (s=2); c=0; none; High
// → 'Context fully supports this pick — high confidence.'

describe('netEffect: context fully supports (High confidence)', () => {
  it('full agreement + strong home standing → context fully supports', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: makeStanding('col', 2, 2, 5, 0),  // avgGf=2.5, supports predH>=2
      awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.netEffect).toBe(
      'Context fully supports this pick — high confidence.',
    )
  })

  it('full agreement + must-win home + engine predicts home win → fully supports', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),   // scoreline 2-0
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_MUST_WIN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: COL, away: undefined,
    })
    expect(support.supportFactors).toHaveLength(2)
    expect(support.netEffect).toBe(
      'Context fully supports this pick — high confidence.',
    )
  })
})

// ── Path 3: No challenge, s >= 2, Medium/Low confidence ─────────────────────
// → 'Context supports the pick. No significant concerns.'

describe('netEffect: context supports (Medium confidence)', () => {
  it('full agreement + strong home standing + Medium confidence → supports without high confidence label', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'Medium'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: makeStanding('col', 2, 2, 5, 0),
      awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.netEffect).toBe(
      'Context supports the pick. No significant concerns.',
    )
  })
})

// ── Path 4: Minor challenge, s >= 2 ──────────────────────────────────────────
// full (s=1) + homeStanding (s=2) + rotation_risk (c=1); minor; s=2>=2
// → 'Context broadly supports the pick, but one factor deserves attention before locking.'

describe('netEffect: minor challenge with broad support', () => {
  it('strong support + single rotation_risk challenge → broadly supports with caveat', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: makeStanding('col', 2, 2, 5, 0),
      awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.challengeLevel).toBe('minor')
    expect(support.netEffect).toBe(
      'Context broadly supports the pick, but one factor deserves attention before locking.',
    )
  })
})

// ── Path 5: Minor challenge, s < 2 ───────────────────────────────────────────
// full (s=1) + rotation_risk (c=1); minor; s=1<2
// → 'One context factor challenges this pick — proceed with some caution.'

describe('netEffect: minor challenge with limited support', () => {
  it('full agreement only + rotation_risk → one factor caution', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.challengeLevel).toBe('minor')
    expect(support.supportFactors).toHaveLength(1)
    expect(support.netEffect).toBe(
      'One context factor challenges this pick — proceed with some caution.',
    )
  })

  it('full agreement + must-win mismatch (engine predicts away win) → caution', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High', { home: 0, away: 2 }),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_MUST_WIN, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: COL, away: undefined,
    })
    expect(support.challengeFactors.some(f => f.includes('must win'))).toBe(true)
    expect(support.challengeLevel).toBe('minor')
    expect(support.netEffect).toBe(
      'One context factor challenges this pick — proceed with some caution.',
    )
  })
})

// ── Path 6: Significant challenge, non-Low/Medium-Low contextConfidence ───────
// split (c=1) + eliminated away (c=2); no rotation_risk; High rec base → Medium after 2 step-downs
// → 'Multiple context factors argue against this scoreline — review alternatives before locking.'

describe('netEffect: significant challenge — review alternatives', () => {
  it('significant challenge with non-Low contextConfidence → review alternatives', () => {
    const support = buildDecisionSupport({
      rec: makeRec('split', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_ELIMINATED,
      apiCtx: undefined, home: undefined, away: QAT,
    })
    expect(support.challengeLevel).toBe('significant')
    expect(support.contextConfidence).not.toMatch(/^(Low|Medium-Low)$/)
    expect(support.netEffect).toBe(
      'Multiple context factors argue against this scoreline — review alternatives before locking.',
    )
  })
})

// ── Path 7: Significant challenge, Low/Medium-Low contextConfidence ───────────
// → 'Context strongly challenges this pick — lean toward an alternative or lower your stake.'

describe('netEffect: significant challenge — strongly challenges', () => {
  it('Low rec confidence + significant challenge → strongly challenges', () => {
    const support = buildDecisionSupport({
      rec: makeRec('split', 'Low'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.challengeLevel).toBe('significant')
    expect(support.contextConfidence).toMatch(/^(Low|Medium-Low)$/)
    expect(support.netEffect).toBe(
      'Context strongly challenges this pick — lean toward an alternative or lower your stake.',
    )
  })

  it('Medium rec + significant challenge + rotation_risk → Low conf → strongly challenges', () => {
    const support = buildDecisionSupport({
      rec: makeRec('split', 'Medium'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_ELIMINATED,
      apiCtx: undefined, home: undefined, away: QAT,
    })
    expect(support.challengeLevel).toBe('significant')
    expect(support.contextConfidence).toMatch(/^(Low|Medium-Low)$/)
    expect(support.netEffect).toBe(
      'Context strongly challenges this pick — lean toward an alternative or lower your stake.',
    )
  })
})

// ── Rotation risk scenarios ───────────────────────────────────────────────────

describe('netEffect: rotation risk scenarios', () => {
  it('home rotation risk alone → minor challenge → proceed with caution', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_UNKNOWN,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.challengeFactors.some(f => f.includes('rotation'))).toBe(true)
    expect(support.challengeLevel).toBe('minor')
    expect(support.netEffect).toBe(
      'One context factor challenges this pick — proceed with some caution.',
    )
  })

  it('both teams rotation risk → significant challenge', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_ROTATION, awayQual: QUAL_ROTATION,
      apiCtx: undefined, home: undefined, away: undefined,
    })
    expect(support.challengeLevel).toBe('significant')
    expect(support.contextConfidence).toMatch(/^(Low|Medium-Low)$/)
    expect(support.netEffect).toBe(
      'Context strongly challenges this pick — lean toward an alternative or lower your stake.',
    )
  })
})

// ── API context — absences ────────────────────────────────────────────────────

describe('netEffect: API context — absences', () => {
  it('2+ home absences add challenge factor → minor challenge', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: makeMatchContext('f1', ['player1', 'player2'], []),
      home: COL, away: undefined,
    })
    expect(support.challengeFactors.some(f => f.includes('missing'))).toBe(true)
    expect(support.challengeLevel).toBe('minor')
    expect(support.netEffect).toBe(
      'One context factor challenges this pick — proceed with some caution.',
    )
  })

  it('absences on both sides → significant challenge', () => {
    const support = buildDecisionSupport({
      rec: makeRec('full', 'High'),
      homeAdj: undefined, awayAdj: undefined,
      homeStanding: undefined, awayStanding: undefined,
      homeQual: QUAL_UNKNOWN, awayQual: QUAL_UNKNOWN,
      apiCtx: makeMatchContext('f1', ['p1', 'p2'], ['p3', 'p4']),
      home: COL, away: CIV,
    })
    expect(support.challengeLevel).toBe('significant')
    expect(support.netEffect).toMatch(/(review alternatives|lean toward an alternative)/)
  })
})
