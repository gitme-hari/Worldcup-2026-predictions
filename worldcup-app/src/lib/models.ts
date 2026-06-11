import type { Prediction, ModelKey, GroupStanding, Fixture } from './types'

// Compute hybrid prediction by blending A/B/C with given weights
export function computeHybrid(
  predictions: Prediction[],
  fixtureId: string,
  weights: { a: number; b: number; c: number }
): { home_goals: number; away_goals: number; home_win_prob: number; draw_prob: number; away_win_prob: number } | null {
  const byModel: Record<string, Prediction> = {}
  predictions.filter(p => p.fixture_id === fixtureId).forEach(p => { byModel[p.model] = p })

  const total = weights.a + weights.b + weights.c
  if (total === 0) return null

  const wa = weights.a / total
  const wb = weights.b / total
  const wc = weights.c / total

  const blend = (key: keyof Omit<Prediction, 'id' | 'fixture_id' | 'model'>) => {
    return (byModel['A']?.[key] ?? 0) * wa +
           (byModel['B']?.[key] ?? 0) * wb +
           (byModel['C']?.[key] ?? 0) * wc
  }

  return {
    home_goals: Math.round(blend('home_goals') * 10) / 10,
    away_goals: Math.round(blend('away_goals') * 10) / 10,
    home_win_prob: Math.round(blend('home_win_prob') * 100) / 100,
    draw_prob: Math.round(blend('draw_prob') * 100) / 100,
    away_win_prob: Math.round(blend('away_win_prob') * 100) / 100,
  }
}

// Get the effective prediction for a fixture given active model + weights
export function getEffectivePrediction(
  predictions: Prediction[],
  fixtureId: string,
  activeModel: ModelKey,
  weights: { a: number; b: number; c: number }
) {
  if (activeModel === 'hybrid') {
    return computeHybrid(predictions, fixtureId, weights)
  }
  return predictions.find(p => p.fixture_id === fixtureId && p.model === activeModel.toUpperCase()) ?? null
}

// Compute group standings from fixtures + a score source
export function computeGroupStandings(
  fixtures: Array<{ id: string; home_team_id: string; away_team_id: string; group: string | null; stage: string }>,
  teams: Array<{ id: string; name: string; code: string; group: string; flag_url: string; elo_rating: number }>,
  getScore: (fixtureId: string) => { home: number; away: number } | null
): Record<string, GroupStanding[]> {
  const groups: Record<string, GroupStanding[]> = {}

  teams.forEach(team => {
    if (!groups[team.group]) groups[team.group] = []
    groups[team.group].push({
      team: { ...team, flag_url: team.flag_url },
      played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0,
    })
  })

  fixtures.filter(f => f.stage === 'group').forEach(f => {
    const score = getScore(f.id)
    if (!score) return

    const group = f.group
    if (!group || !groups[group]) return

    const homeStanding = groups[group].find(s => s.team.id === f.home_team_id)
    const awayStanding = groups[group].find(s => s.team.id === f.away_team_id)
    if (!homeStanding || !awayStanding) return

    const { home, away } = score

    homeStanding.played++
    awayStanding.played++
    homeStanding.gf += home; homeStanding.ga += away
    awayStanding.gf += away; awayStanding.ga += home
    homeStanding.gd = homeStanding.gf - homeStanding.ga
    awayStanding.gd = awayStanding.gf - awayStanding.ga

    if (home > away) {
      homeStanding.wins++; homeStanding.points += 3
      awayStanding.losses++
    } else if (home === away) {
      homeStanding.draws++; homeStanding.points++
      awayStanding.draws++; awayStanding.points++
    } else {
      awayStanding.wins++; awayStanding.points += 3
      homeStanding.losses++
    }
  })

  // Sort each group
  Object.keys(groups).forEach(g => {
    groups[g].sort((a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf
    )
  })

  return groups
}

// Compute Brier score: sum of (p_i - o_i)^2 for outcomes {home_win, draw, away_win}
export function brierScore(
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number,
  actualHome: number,
  actualAway: number
): number {
  const homeWin = actualHome > actualAway ? 1 : 0
  const draw = actualHome === actualAway ? 1 : 0
  const awayWin = actualAway > actualHome ? 1 : 0
  return (
    Math.pow(homeWinProb - homeWin, 2) +
    Math.pow(drawProb - draw, 2) +
    Math.pow(awayWinProb - awayWin, 2)
  ) / 3
}

// Log loss for 3-class outcome
export function logLoss(
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number,
  actualHome: number,
  actualAway: number
): number {
  const eps = 1e-7
  const clamp = (p: number) => Math.max(eps, Math.min(1 - eps, p))
  if (actualHome > actualAway) return -Math.log(clamp(homeWinProb))
  if (actualHome === actualAway) return -Math.log(clamp(drawProb))
  return -Math.log(clamp(awayWinProb))
}

// Get outcome string
export function getOutcome(homeGoals: number, awayGoals: number): 'H' | 'D' | 'A' {
  if (homeGoals > awayGoals) return 'H'
  if (homeGoals === awayGoals) return 'D'
  return 'A'
}
