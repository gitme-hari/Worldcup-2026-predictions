// Shared data computation for the Performance page.
// All functions are synchronous localStorage reads — safe to call in render.

import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations, getHumanPredictions, getPredictions, computeCalibration } from '@/lib/store'
import { generateAllReviews, poolScore, type MatchReview } from '@/lib/match-review'
import { generateLearningSignals, type LearningSignal } from '@/lib/learning-signals'
import { buildBlindSpotProfile, type BlindSpotProfile } from '@/lib/failure-classifier'
import { buildExactScoreProfile, type ExactScoreProfile } from '@/lib/exact-score-analysis'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { computeGroupStandings, computeQualificationStatus, type QualificationStatus } from '@/lib/team-stats'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'
import type { ModelCalibration } from '@/lib/store'

export interface UpcomingFixture {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  homeQual: QualificationStatus
  awayQual: QualificationStatus
}

export interface PerformanceData {
  reviews: MatchReview[]
  signals: LearningSignal[]
  activeSignals: LearningSignal[]
  blindSpotProfile: BlindSpotProfile[]
  exactScore: ExactScoreProfile
  qualMap: Record<string, QualificationStatus>
  teams: SeedTeam[]
  fixtures: SeedFixture[]
  calibration: ModelCalibration[]
  upcoming: UpcomingFixture[]
}

export function computePerformanceData(): PerformanceData {
  const fixtures = getFixtures()
  const teams = getTeams()
  const results = getResults()
  const locked = getLockedPredictions()
  const recs = getPoolRecommendations()
  const human = getHumanPredictions()
  const preds = getPredictions()
  const calibration = computeCalibration()

  const adjustments = buildTeamAdjustments(teams, fixtures, results, preds)
  const standings = computeGroupStandings(fixtures, results)

  const qualMap: Record<string, QualificationStatus> = {}
  for (const ts of Object.values(standings)) {
    for (const s of ts) qualMap[s.teamId] = computeQualificationStatus(s.teamId, ts, s.played)
  }

  const reviews = generateAllReviews({
    fixtures, teams, lockedPredictions: locked,
    poolRecommendations: recs, results, adjustments, qualMap, humanPredictions: human,
  })

  const signals = generateLearningSignals(reviews)
  const activeSignals = signals.filter(s => s.appliedToRecs)
  const blindSpotProfile = buildBlindSpotProfile(reviews.map(r => ({ category: r.blindSpot })))
  const exactScore = buildExactScoreProfile(reviews)

  const resultedIds = new Set(results.map(r => r.fixture_id))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const upcoming: UpcomingFixture[] = fixtures
    .filter(f => !resultedIds.has(f.id))
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .map(f => ({
      fixture: f,
      home: teamMap[f.home_team_id],
      away: teamMap[f.away_team_id],
      homeQual: qualMap[f.home_team_id] ?? 'unknown',
      awayQual: qualMap[f.away_team_id] ?? 'unknown',
    }))

  return { reviews, signals, activeSignals, blindSpotProfile, exactScore, qualMap, teams, fixtures, calibration, upcoming }
}

export { poolScore }

export const BLIND_SPOT_LABELS: Record<string, string> = {
  over_predicted_goals:           'Over-predicted goals',
  favourite_overestimated:        'Favourite overestimated',
  qualification_pressure_ignored: 'Qualification pressure',
  away_attack_underestimated:     'Away attack underestimated',
  home_attack_underestimated:     'Home attack underestimated',
  defensive_improvement_ignored:  'Defensive improvement',
  random_variance:                'Unexplained results',
  correct:                        'Correct',
}

export const SIGNAL_RECOMMENDATIONS: Record<string, string> = {
  over_predicted_goals:           'When the engine predicts 3+ total goals, consider whether the 2-goal version of the same result is more credible. Trust lower scorelines.',
  favourite_overestimated:        'Check if underdog teams have motivation factors (must-win, home advantage, recent form) before accepting a heavy favourite prediction.',
  qualification_pressure_ignored: 'Before locking picks involving must-win or must-not-lose teams, consider a more competitive scoreline than the engine predicts.',
  away_attack_underestimated:     'Give extra credit to away teams with strong attack factors — the engine may undervalue their scoring threat.',
  home_attack_underestimated:     'Give extra credit to home teams with strong attack factors — the engine may undervalue their scoring threat.',
  defensive_improvement_ignored:  'When a team has shown recent defensive improvement, consider lower-scoring outcomes than the engine predicts.',
  random_variance:                'No consistent pattern yet — continue accumulating match data.',
}
