// Shared factory helpers for test data.
// All factories return fully typed objects matching the production interfaces.

import type { SeedTeam, SeedFixture, SeedPrediction } from '@/lib/seed-data'
import type { ActualResult, HumanPrediction } from '@/lib/types'
import type { LockedPrediction, PoolRecommendation } from '@/lib/store'
import type { QualificationStatus, GroupStanding } from '@/lib/team-stats'
import type { TeamAdjustment } from '@/lib/learning-layer'
import type { MatchContext } from '@/lib/match-context'

export { type QualificationStatus }

export const QUAL_UNKNOWN: QualificationStatus = 'unknown'
export const QUAL_MUST_WIN: QualificationStatus = 'must_win'
export const QUAL_ROTATION: QualificationStatus = 'rotation_risk'
export const QUAL_ELIMINATED: QualificationStatus = 'eliminated'
export const QUAL_LIKELY: QualificationStatus = 'likely_qualified'

export function makeTeam(id: string, code: string, elo = 1700, group = 'A'): SeedTeam {
  return { id, name: code, code, group, flag_url: '', elo_rating: elo }
}

export function makeFixture(id: string, home: string, away: string, matchday = 1): SeedFixture {
  return {
    id, home_team_id: home, away_team_id: away,
    group: 'A', stage: 'group', matchday,
    kickoff_utc: `2026-06-${String(14 + matchday).padStart(2, '0')}T18:00:00Z`,
    venue: 'Test Stadium',
  }
}

export function makePred(fixtureId: string, model: 'A' | 'B' | 'C', homeGoals: number, awayGoals: number): SeedPrediction {
  return {
    id: `${fixtureId}-${model}`,
    fixture_id: fixtureId, model,
    home_goals: homeGoals, away_goals: awayGoals,
    home_win_prob: homeGoals > awayGoals ? 0.60 : 0.25,
    draw_prob: 0.25,
    away_win_prob: awayGoals > homeGoals ? 0.60 : 0.15,
  }
}

export function makeAllPreds(fixtureId: string, homeGoals: number, awayGoals: number): SeedPrediction[] {
  return (['A', 'B', 'C'] as const).map(m => makePred(fixtureId, m, homeGoals, awayGoals))
}

export function makeResult(fixtureId: string, home: number, away: number): ActualResult {
  return { id: `r-${fixtureId}`, fixture_id: fixtureId, home_goals: home, away_goals: away, entered_at: '' }
}

export function makeLocked(fixtureId: string, home: number, away: number, custom = false, overrideReason?: string): LockedPrediction {
  return {
    fixture_id: fixtureId,
    model: 'A',
    home_goals: home, away_goals: away,
    home_win_prob: 0.55, draw_prob: 0.25, away_win_prob: 0.20,
    locked_at: '2026-06-15T10:00:00Z',
    pick_source: custom ? 'custom' : 'pool_recommendation',
    override_reason: overrideReason,
  }
}

export function makePoolRec(fixtureId: string, home: number, away: number): PoolRecommendation {
  return {
    fixture_id: fixtureId,
    recommended_home: home,
    recommended_away: away,
    recommended_model: 'A',
    recommendation_reason: 'Model A selected',
    generated_at: '2026-06-15T08:00:00Z',
  }
}

export function makeHumanPred(fixtureId: string, home: number, away: number, comment: string): HumanPrediction {
  return {
    id: `hp-${fixtureId}`,
    fixture_id: fixtureId,
    home_goals: home, away_goals: away,
    comment,
    created_at: '2026-06-15T09:00:00Z',
  }
}

export function makeStanding(teamId: string, played: number, won: number, gf: number, ga: number): GroupStanding {
  const drawn = 0, lost = played - won - drawn
  return { teamId, position: 1, played, won, drawn, lost, gf, ga, gd: gf - ga, pts: won * 3 }
}

export function makeAdj(teamId: string, attackFactor: number, defenceFactor: number): TeamAdjustment {
  return {
    teamId, teamName: teamId, teamCode: teamId.toUpperCase(), flag: '',
    attackFactor, defenceFactor,
    confidence: 'High', matchesPlayed: 3, contributions: [],
  }
}

export function makeMatchContext(fixtureId: string, homeAbsences: string[], awayAbsences: string[]): MatchContext {
  return {
    fixture_id: fixtureId,
    source: 'manual',
    fetched_at: '2026-06-15T08:00:00Z',
    home_lineup_status: 'unknown',
    away_lineup_status: 'unknown',
    home_absences: homeAbsences,
    away_absences: awayAbsences,
    home_suspensions: [],
    away_suspensions: [],
    home_form: [],
    away_form: [],
    impact_signal: 'none',
    impact_notes: [],
  }
}
