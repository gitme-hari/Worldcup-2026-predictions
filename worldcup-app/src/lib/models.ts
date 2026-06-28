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

// ── Engine-native score source ────────────────────────────────────────────────
// Average of all 3 model predictions — decoupled from active_model setting.
// User overrides still take priority when provided.
export function engineScore(
  predictions: Array<{ fixture_id: string; home_goals: number; away_goals: number }>,
  fixtureId: string,
): { home: number; away: number } | null {
  const fp = predictions.filter(p => p.fixture_id === fixtureId)
  if (fp.length === 0) return null
  const home = Math.round(fp.reduce((s, p) => s + p.home_goals, 0) / fp.length)
  const away = Math.round(fp.reduce((s, p) => s + p.away_goals, 0) / fp.length)
  return { home, away }
}

// ── WC26 Qualification ────────────────────────────────────────────────────────

export type QualificationStatus =
  | 'confirmed'        // mathematically cannot be overtaken
  | 'projected_top2'   // currently top 2, games remaining
  | 'best_third'       // currently best third-place across all groups
  | 'in_contention'    // 3rd/4th, still alive
  | 'eliminated'       // cannot mathematically qualify

// WC26: 12 groups × 4 teams, 3 group-stage matches each
// Top 2 from each group qualify + 8 best third-place teams = 32 total
const MATCHES_PER_TEAM = 3
const POINTS_PER_WIN = 3

export function computeQualificationStatus(
  standings: Record<string, GroupStanding[]>,
): Record<string, QualificationStatus> {
  const status: Record<string, QualificationStatus> = {}

  // Compute third-place teams for each group
  const thirdPlace: GroupStanding[] = []
  Object.values(standings).forEach(group => {
    if (group[2]) thirdPlace.push(group[2])
  })
  // Best 8 third-place teams by points → GD → GF
  const best8Third = [...thirdPlace]
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8)
    .map(s => s.team.id)

  Object.entries(standings).forEach(([, group]) => {
    const teamCount = group.length // 4 per group
    if (teamCount === 0) return

    group.forEach((s, rank) => {
      const remaining = MATCHES_PER_TEAM - s.played
      const maxPossiblePts = s.points + remaining * POINTS_PER_WIN

      // Can anyone above overtake them? (simplified: compare to the 2nd-place team's max)
      const secondPlace = group[1]

      if (rank === 0 || rank === 1) {
        // Check if confirmed: can 3rd place catch them in remaining games?
        const thirdTeam = group[2]
        if (thirdTeam) {
          const thirdMax = thirdTeam.points + (MATCHES_PER_TEAM - thirdTeam.played) * POINTS_PER_WIN
          if (s.played === MATCHES_PER_TEAM && (rank === 0 || (secondPlace && secondPlace.played === MATCHES_PER_TEAM))) {
            status[s.team.id] = 'confirmed'
          } else if (thirdMax < s.points - 0) {
            // Third place can't reach current points even with all wins
            status[s.team.id] = 'confirmed'
          } else {
            status[s.team.id] = 'projected_top2'
          }
        } else {
          status[s.team.id] = rank < 2 ? 'projected_top2' : 'in_contention'
        }
      } else if (rank === 2) {
        // Third place: check if they can still reach top 2, or qualify as best third
        const secondMax = secondPlace ? secondPlace.points + (MATCHES_PER_TEAM - secondPlace.played) * POINTS_PER_WIN : 0
        if (maxPossiblePts < (secondPlace?.points ?? 0) && maxPossiblePts < (group[3]?.points ?? 0)) {
          // Can't reach 2nd place and 4th can't be worse
          status[s.team.id] = 'eliminated'
        } else if (best8Third.includes(s.team.id)) {
          status[s.team.id] = 'best_third'
        } else {
          status[s.team.id] = 'in_contention'
        }
      } else {
        // 4th place: need all wins and other results to go their way
        if (maxPossiblePts < (group[1]?.points ?? 0)) {
          status[s.team.id] = 'eliminated'
        } else {
          status[s.team.id] = 'in_contention'
        }
      }
    })
  })

  return status
}

export function computeThirdPlaceRanking(
  standings: Record<string, GroupStanding[]>,
): Array<GroupStanding & { group: string; qualifies: boolean }> {
  const thirds: Array<GroupStanding & { group: string; qualifies: boolean }> = []

  Object.entries(standings).forEach(([group, groupStandings]) => {
    const third = groupStandings[2]
    if (third) thirds.push({ ...third, group, qualifies: false })
  })

  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
  return thirds.map((t, i) => ({ ...t, qualifies: i < 8 }))
}
