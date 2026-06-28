// Generates a structured post-match review for every completed fixture.
// Source data: localStorage (locked predictions, pool recommendations, results).
// Output is consumed by the Performance page (Decision Review tab) and
// written to the match_reviews Supabase table via learning-repository.ts.

import type { SeedFixture, SeedTeam } from './seed-data'
import type { ActualResult } from './types'
import type { LockedPrediction, PoolRecommendation } from './store'
import type { TeamAdjustment } from './learning-layer'
import type { QualificationStatus } from './team-stats'
import { classifyEngineFailure, type BlindSpotCategory } from './failure-classifier'

// ── Pool scoring (canonical implementation) ───────────────────────────────────

export function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (Math.round(predH) === actH && Math.round(predA) === actA) return 4
  const predGD = predH - predA
  const actGD  = actH  - actA
  const predW  = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW   = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && Math.round(predGD) === actGD) return 2
  if (predW === actW) return 1
  return 0
}

// ── Impact verdict ────────────────────────────────────────────────────────────

export type ImpactVerdict =
  | 'Override succeeded'
  | 'Override failed'
  | 'Accepted rec'
  | 'Both matched'
  | 'Both missed'
  | 'No rec available'

function deriveVerdict(
  overridden: boolean,
  myPts: number,
  enginePts: number | null,
): ImpactVerdict {
  if (enginePts === null) return 'No rec available'
  if (!overridden) {
    return myPts === enginePts
      ? (myPts >= 2 ? 'Both matched' : 'Both missed')
      : 'Accepted rec'         // shouldn't differ if not overridden, but guard anyway
  }
  if (myPts > enginePts)  return 'Override succeeded'
  if (myPts < enginePts)  return 'Override failed'
  return myPts >= 2 ? 'Both matched' : 'Both missed'
}

// ── Evidence bullets ──────────────────────────────────────────────────────────

function buildEvidence(
  homeCode: string,
  awayCode: string,
  homeAdj: TeamAdjustment | undefined,
  awayAdj: TeamAdjustment | undefined,
  homeQual: QualificationStatus,
  awayQual: QualificationStatus,
): string[] {
  const bullets: string[] = []

  if (homeAdj) {
    const pct = Math.round(Math.abs(homeAdj.attackFactor - 1) * 100)
    if (homeAdj.attackFactor >= 1.10)
      bullets.push(`${homeCode} scoring ${pct}% above model expectation`)
    else if (homeAdj.attackFactor <= 0.90)
      bullets.push(`${homeCode} scoring ${pct}% below model expectation`)
    if (homeAdj.defenceFactor <= 0.88)
      bullets.push(`${homeCode} defence conceding ${Math.round((1 - homeAdj.defenceFactor) * 100)}% less than expected`)
    else if (homeAdj.defenceFactor >= 1.20)
      bullets.push(`${homeCode} defence conceding ${Math.round((homeAdj.defenceFactor - 1) * 100)}% more than expected`)
  }

  if (awayAdj) {
    const pct = Math.round(Math.abs(awayAdj.attackFactor - 1) * 100)
    if (awayAdj.attackFactor >= 1.10)
      bullets.push(`${awayCode} scoring ${pct}% above model expectation`)
    else if (awayAdj.attackFactor <= 0.90)
      bullets.push(`${awayCode} scoring ${pct}% below model expectation`)
  }

  if (homeQual === 'must_win') bullets.push(`${homeCode} needed a win — motivation elevated`)
  if (awayQual === 'must_win') bullets.push(`${awayCode} needed a win — motivation elevated`)
  if (homeQual === 'rotation_risk') bullets.push(`${homeCode} already qualified — rotation likely`)
  if (awayQual === 'rotation_risk') bullets.push(`${awayCode} already qualified — rotation likely`)
  if (homeQual === 'eliminated') bullets.push(`${homeCode} already eliminated`)
  if (awayQual === 'eliminated') bullets.push(`${awayCode} already eliminated`)

  return bullets.slice(0, 4)
}

// ── Lesson generator ──────────────────────────────────────────────────────────

function deriveLessonFromBlindSpot(
  category: BlindSpotCategory,
  verdict: ImpactVerdict,
  homeCode: string,
  awayCode: string,
): string {
  if (verdict === 'Override succeeded') {
    return `Override was correct — context signals the engine missed improved the prediction`
  }
  if (verdict === 'Override failed') {
    return `Override did not improve the result — engine baseline was closer to actual`
  }
  switch (category) {
    case 'away_attack_underestimated':
      return `${awayCode} attack outperformed engine expectation — away xG weight may need increasing`
    case 'home_attack_underestimated':
      return `${homeCode} attack outperformed engine expectation — home xG weight may need increasing`
    case 'defensive_improvement_ignored':
      return `Defensive form improvement was underweighted — concessions lower than engine forecast`
    case 'qualification_pressure_ignored':
      return `Must-win pressure drove a better performance than engine predicted`
    case 'favourite_overestimated':
      return `Engine overestimated the favourite — tournament context created an upset`
    case 'random_variance':
      return `No systematic signal identified — outcome was within normal variance`
    default:
      return `Engine prediction aligned with actual result`
  }
}

// ── Main types ────────────────────────────────────────────────────────────────

export interface MatchReview {
  fixtureId: string
  homeCode: string
  awayCode: string
  engineH: number | null
  engineA: number | null
  myH: number
  myA: number
  actualH: number
  actualA: number
  myPts: number
  enginePts: number | null
  overridden: boolean
  overrideReason: string | null
  evidence: string[]
  verdict: ImpactVerdict
  lesson: string
  blindSpot: BlindSpotCategory
  deltaVsEngine: number | null   // myPts - enginePts; null if no rec
}

export interface GenerateReviewParams {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  locked: LockedPrediction
  rec: PoolRecommendation | undefined
  result: ActualResult
  homeAdj: TeamAdjustment | undefined
  awayAdj: TeamAdjustment | undefined
  homeQual: QualificationStatus
  awayQual: QualificationStatus
}

export function generateMatchReview({
  fixture, home, away, locked, rec, result,
  homeAdj, awayAdj, homeQual, awayQual,
}: GenerateReviewParams): MatchReview {
  const homeCode = home?.code ?? fixture.home_team_id.toUpperCase()
  const awayCode = away?.code ?? fixture.away_team_id.toUpperCase()

  const myH = locked.home_goals
  const myA = locked.away_goals
  const actualH = result.home_goals
  const actualA = result.away_goals

  const engineH = rec ? rec.recommended_home : null
  const engineA = rec ? rec.recommended_away : null

  const myPts     = poolScore(myH, myA, actualH, actualA)
  const enginePts = (engineH !== null && engineA !== null)
    ? poolScore(engineH, engineA, actualH, actualA)
    : null

  const overridden = locked.pick_source === 'custom'
  const overrideReason = locked.override_reason ?? null

  const verdict  = deriveVerdict(overridden, myPts, enginePts)
  const evidence = buildEvidence(homeCode, awayCode, homeAdj, awayAdj, homeQual, awayQual)

  const blindSpot = classifyEngineFailure({
    recH: engineH ?? myH,
    recA: engineA ?? myA,
    actualH,
    actualA,
    homeAdj,
    awayAdj,
    homeQual,
    awayQual,
  })

  const lesson = deriveLessonFromBlindSpot(blindSpot, verdict, homeCode, awayCode)

  return {
    fixtureId: fixture.id,
    homeCode,
    awayCode,
    engineH,
    engineA,
    myH,
    myA,
    actualH,
    actualA,
    myPts,
    enginePts,
    overridden,
    overrideReason,
    evidence,
    verdict,
    lesson,
    blindSpot,
    deltaVsEngine: enginePts !== null ? myPts - enginePts : null,
  }
}

// Generates reviews for all completed fixtures that have a locked prediction.
export function generateAllReviews(params: {
  fixtures: SeedFixture[]
  teams: SeedTeam[]
  lockedPredictions: LockedPrediction[]
  poolRecommendations: PoolRecommendation[]
  results: ActualResult[]
  adjustments: TeamAdjustment[]
  qualMap: Record<string, QualificationStatus>
}): MatchReview[] {
  const { fixtures, teams, lockedPredictions, poolRecommendations, results, adjustments, qualMap } = params
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))
  const resultMap = Object.fromEntries(results.map(r => [r.fixture_id, r]))
  const recMap    = Object.fromEntries(poolRecommendations.map(r => [r.fixture_id, r]))
  const adjMap    = Object.fromEntries(adjustments.map(a => [a.teamId, a]))
  const lockedMap = Object.fromEntries(lockedPredictions.map(p => [p.fixture_id, p]))

  const reviews: MatchReview[] = []
  for (const fixture of fixtures) {
    const result = resultMap[fixture.id]
    if (!result) continue
    const locked = lockedMap[fixture.id]
    if (!locked) continue

    reviews.push(generateMatchReview({
      fixture,
      home: teamMap[fixture.home_team_id],
      away: teamMap[fixture.away_team_id],
      locked,
      rec: recMap[fixture.id],
      result,
      homeAdj: adjMap[fixture.home_team_id],
      awayAdj: adjMap[fixture.away_team_id],
      homeQual: qualMap[fixture.home_team_id] ?? 'alive',
      awayQual: qualMap[fixture.away_team_id] ?? 'alive',
    }))
  }
  return reviews
}
