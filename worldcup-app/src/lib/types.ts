export type ModelKey = 'A' | 'B' | 'C' | 'D' | 'hybrid'
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
export type Role = 'admin' | 'viewer'

export interface Team {
  id: string
  name: string
  code: string
  group: string
  flag_url: string | null
  elo_rating: number
}

export interface Fixture {
  id: string
  home_team_id: string
  away_team_id: string
  group: string | null
  stage: Stage
  matchday: number | null
  kickoff_utc: string
  venue: string | null
  home_team?: Team
  away_team?: Team
}

export interface Prediction {
  id: string
  fixture_id: string
  model: 'A' | 'B' | 'C'
  home_goals: number
  away_goals: number
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
}

export interface ActualResult {
  id: string
  fixture_id: string
  home_goals: number
  away_goals: number
  entered_at: string
}

export interface Override {
  id: string
  fixture_id: string
  home_goals: number
  away_goals: number
}

export interface BracketSlot {
  id: string
  round: Stage
  slot_number: number
  team_id: string | null
  source_slot_a: number | null
  source_slot_b: number | null
  team?: Team
}

export interface ModelConfig {
  id: string
  active_model: ModelKey
  weight_a: number
  weight_b: number
  weight_c: number
}

export interface BonusPrediction {
  id: string
  model: ModelKey
  key: string
  team_id: string | null
  team?: Team
}

export interface ModelMetric {
  id: string
  model: 'A' | 'B' | 'C'
  stage: Stage
  fixture_id: string
  outcome_correct: boolean
  brier_score: number | null
  log_loss: number | null
  home_mae: number | null
  away_mae: number | null
}

export interface GroupStanding {
  team: { id: string; name: string; code: string; group: string; flag_url: string; elo_rating: number }
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
  points: number
}

export interface HumanPrediction {
  id: string
  fixture_id: string
  home_goals: number
  away_goals: number
  comment: string
  created_at: string
}

export interface HybridPrediction {
  fixture_id: string
  home_goals: number
  away_goals: number
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
}
