// World Cup 2026 seed data — 48 teams across 12 groups

export interface SeedTeam {
  id: string
  name: string
  code: string
  group: string
  flag_url: string
  elo_rating: number
}

export const SEED_TEAMS: SeedTeam[] = [
  // Group A
  { id: 'usa', name: 'United States', code: 'USA', group: 'A', flag_url: '🇺🇸', elo_rating: 1800 },
  { id: 'uru', name: 'Uruguay', code: 'URU', group: 'A', flag_url: '🇺🇾', elo_rating: 1850 },
  { id: 'pan', name: 'Panama', code: 'PAN', group: 'A', flag_url: '🇵🇦', elo_rating: 1620 },
  { id: 'bol', name: 'Bolivia', code: 'BOL', group: 'A', flag_url: '🇧🇴', elo_rating: 1520 },
  // Group B
  { id: 'arg', name: 'Argentina', code: 'ARG', group: 'B', flag_url: '🇦🇷', elo_rating: 2050 },
  { id: 'chi', name: 'Chile', code: 'CHI', group: 'B', flag_url: '🇨🇱', elo_rating: 1680 },
  { id: 'per', name: 'Peru', code: 'PER', group: 'B', flag_url: '🇵🇪', elo_rating: 1640 },
  { id: 'pol', name: 'Poland', code: 'POL', group: 'B', flag_url: '🇵🇱', elo_rating: 1780 },
  // Group C
  { id: 'bra', name: 'Brazil', code: 'BRA', group: 'C', flag_url: '🇧🇷', elo_rating: 2020 },
  { id: 'col', name: 'Colombia', code: 'COL', group: 'C', flag_url: '🇨🇴', elo_rating: 1750 },
  { id: 'ecu', name: 'Ecuador', code: 'ECU', group: 'C', flag_url: '🇪🇨', elo_rating: 1690 },
  { id: 'par', name: 'Paraguay', code: 'PAR', group: 'C', flag_url: '🇵🇾', elo_rating: 1610 },
  // Group D
  { id: 'fra', name: 'France', code: 'FRA', group: 'D', flag_url: '🇫🇷', elo_rating: 2010 },
  { id: 'bel', name: 'Belgium', code: 'BEL', group: 'D', flag_url: '🇧🇪', elo_rating: 1920 },
  { id: 'tun', name: 'Tunisia', code: 'TUN', group: 'D', flag_url: '🇹🇳', elo_rating: 1590 },
  { id: 'mar', name: 'Morocco', code: 'MAR', group: 'D', flag_url: '🇲🇦', elo_rating: 1810 },
  // Group E
  { id: 'ger', name: 'Germany', code: 'GER', group: 'E', flag_url: '🇩🇪', elo_rating: 1980 },
  { id: 'esp', name: 'Spain', code: 'ESP', group: 'E', flag_url: '🇪🇸', elo_rating: 1990 },
  { id: 'den', name: 'Denmark', code: 'DEN', group: 'E', flag_url: '🇩🇰', elo_rating: 1820 },
  { id: 'tur', name: 'Turkey', code: 'TUR', group: 'E', flag_url: '🇹🇷', elo_rating: 1760 },
  // Group F
  { id: 'eng', name: 'England', code: 'ENG', group: 'F', flag_url: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', elo_rating: 1970 },
  { id: 'ned', name: 'Netherlands', code: 'NED', group: 'F', flag_url: '🇳🇱', elo_rating: 1900 },
  { id: 'irn', name: 'Iran', code: 'IRN', group: 'F', flag_url: '🇮🇷', elo_rating: 1660 },
  { id: 'wal', name: 'Wales', code: 'WAL', group: 'F', flag_url: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', elo_rating: 1680 },
  // Group G
  { id: 'por', name: 'Portugal', code: 'POR', group: 'G', flag_url: '🇵🇹', elo_rating: 1970 },
  { id: 'cro', name: 'Croatia', code: 'CRO', group: 'G', flag_url: '🇭🇷', elo_rating: 1830 },
  { id: 'ksa', name: 'Saudi Arabia', code: 'KSA', group: 'G', flag_url: '🇸🇦', elo_rating: 1620 },
  { id: 'aus', name: 'Australia', code: 'AUS', group: 'G', flag_url: '🇦🇺', elo_rating: 1650 },
  // Group H
  { id: 'ita', name: 'Italy', code: 'ITA', group: 'H', flag_url: '🇮🇹', elo_rating: 1890 },
  { id: 'sui', name: 'Switzerland', code: 'SUI', group: 'H', flag_url: '🇨🇭', elo_rating: 1840 },
  { id: 'nga', name: 'Nigeria', code: 'NGA', group: 'H', flag_url: '🇳🇬', elo_rating: 1690 },
  { id: 'kor', name: 'South Korea', code: 'KOR', group: 'H', flag_url: '🇰🇷', elo_rating: 1700 },
  // Group I
  { id: 'jpn', name: 'Japan', code: 'JPN', group: 'I', flag_url: '🇯🇵', elo_rating: 1800 },
  { id: 'sen', name: 'Senegal', code: 'SEN', group: 'I', flag_url: '🇸🇳', elo_rating: 1760 },
  { id: 'cmr', name: 'Cameroon', code: 'CMR', group: 'I', flag_url: '🇨🇲', elo_rating: 1650 },
  { id: 'nzl', name: 'New Zealand', code: 'NZL', group: 'I', flag_url: '🇳🇿', elo_rating: 1520 },
  // Group J
  { id: 'mex', name: 'Mexico', code: 'MEX', group: 'J', flag_url: '🇲🇽', elo_rating: 1760 },
  { id: 'can', name: 'Canada', code: 'CAN', group: 'J', flag_url: '🇨🇦', elo_rating: 1720 },
  { id: 'crc', name: 'Costa Rica', code: 'CRC', group: 'J', flag_url: '🇨🇷', elo_rating: 1620 },
  { id: 'ukr', name: 'Ukraine', code: 'UKR', group: 'J', flag_url: '🇺🇦', elo_rating: 1750 },
  // Group K
  { id: 'egy', name: 'Egypt', code: 'EGY', group: 'K', flag_url: '🇪🇬', elo_rating: 1680 },
  { id: 'civ', name: "Côte d'Ivoire", code: 'CIV', group: 'K', flag_url: '🇨🇮', elo_rating: 1700 },
  { id: 'alg', name: 'Algeria', code: 'ALG', group: 'K', flag_url: '🇩🇿', elo_rating: 1650 },
  { id: 'rsa', name: 'South Africa', code: 'RSA', group: 'K', flag_url: '🇿🇦', elo_rating: 1580 },
  // Group L
  { id: 'svk', name: 'Slovakia', code: 'SVK', group: 'L', flag_url: '🇸🇰', elo_rating: 1700 },
  { id: 'aut', name: 'Austria', code: 'AUT', group: 'L', flag_url: '🇦🇹', elo_rating: 1750 },
  { id: 'rom', name: 'Romania', code: 'ROU', group: 'L', flag_url: '🇷🇴', elo_rating: 1660 },
  { id: 'mli', name: 'Mali', code: 'MLI', group: 'L', flag_url: '🇲🇱', elo_rating: 1640 },
]

// Generate group stage fixtures (each group: 6 matches)
export interface SeedFixture {
  id: string
  home_team_id: string
  away_team_id: string
  group: string
  stage: 'group'
  matchday: number
  kickoff_utc: string
  venue: string
}

function generateGroupFixtures(): SeedFixture[] {
  const fixtures: SeedFixture[] = []
  const groups = 'ABCDEFGHIJKL'.split('')
  const venues = ['MetLife Stadium', 'AT&T Stadium', 'SoFi Stadium', 'Hard Rock Stadium',
    'Rose Bowl', 'Levi\'s Stadium', 'Lincoln Financial Field', 'Arrowhead Stadium',
    'Seattle', 'Vancouver', 'Toronto', 'Guadalajara', 'Mexico City', 'Monterrey']

  // Matchday schedule starts June 11, 2026
  const baseDate = new Date('2026-06-11T18:00:00Z')

  groups.forEach((group, gi) => {
    const groupTeams = SEED_TEAMS.filter(t => t.group === group)
    const matchups = [
      [0, 1], [2, 3],  // matchday 1
      [0, 2], [1, 3],  // matchday 2
      [0, 3], [1, 2],  // matchday 3
    ]
    const matchdays = [1, 1, 2, 2, 3, 3]

    matchups.forEach(([hi, ai], mi) => {
      const kickoff = new Date(baseDate)
      kickoff.setDate(baseDate.getDate() + gi * 1 + Math.floor(mi / 2) * 4)
      kickoff.setHours(18 + (mi % 2) * 3)

      fixtures.push({
        id: `group-${group}-m${mi + 1}`,
        home_team_id: groupTeams[hi].id,
        away_team_id: groupTeams[ai].id,
        group,
        stage: 'group',
        matchday: matchdays[mi],
        kickoff_utc: kickoff.toISOString(),
        venue: venues[gi % venues.length],
      })
    })
  })
  return fixtures
}

export const SEED_FIXTURES: SeedFixture[] = generateGroupFixtures()

// Generate predictions using Poisson model for all 3 models with slight variation
function poissonGoals(elo_home: number, elo_away: number, homeAdvantage = 0.1) {
  const eloDiff = (elo_home - elo_away) / 400
  const baseLambda = 1.35
  const homeLambda = baseLambda * Math.pow(10, eloDiff + homeAdvantage)
  const awayLambda = baseLambda * Math.pow(10, -eloDiff)
  return { homeLambda, awayLambda }
}

function poissonProb(lambda: number, k: number): number {
  let result = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) result *= lambda / i
  return result
}

function calcOutcomeProbs(homeLambda: number, awayLambda: number) {
  let homeWin = 0, draw = 0, awayWin = 0
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonProb(homeLambda, h) * poissonProb(awayLambda, a)
      if (h > a) homeWin += p
      else if (h === a) draw += p
      else awayWin += p
    }
  }
  return { homeWin, draw, awayWin }
}

export interface SeedPrediction {
  id: string
  fixture_id: string
  model: 'A' | 'B' | 'C'
  home_goals: number
  away_goals: number
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
}

export function generatePredictions(): SeedPrediction[] {
  const predictions: SeedPrediction[] = []
  const teamMap = Object.fromEntries(SEED_TEAMS.map(t => [t.id, t]))

  SEED_FIXTURES.forEach(fixture => {
    const home = teamMap[fixture.home_team_id]
    const away = teamMap[fixture.away_team_id]
    if (!home || !away) return

    // Model A: Poisson
    const { homeLambda: hlA, awayLambda: alA } = poissonGoals(home.elo_rating, away.elo_rating)
    const probsA = calcOutcomeProbs(hlA, alA)
    predictions.push({
      id: `pred-A-${fixture.id}`,
      fixture_id: fixture.id,
      model: 'A',
      home_goals: Math.round(hlA * 10) / 10,
      away_goals: Math.round(alA * 10) / 10,
      home_win_prob: Math.round(probsA.homeWin * 100) / 100,
      draw_prob: Math.round(probsA.draw * 100) / 100,
      away_win_prob: Math.round(probsA.awayWin * 100) / 100,
    })

    // Model B: ML (slight variation — random forest style, adds noise)
    const noise = (Math.random() - 0.5) * 0.15
    const { homeLambda: hlB, awayLambda: alB } = poissonGoals(
      home.elo_rating * (1 + noise),
      away.elo_rating * (1 - noise)
    )
    const probsB = calcOutcomeProbs(hlB, alB)
    predictions.push({
      id: `pred-B-${fixture.id}`,
      fixture_id: fixture.id,
      model: 'B',
      home_goals: Math.round(hlB * 10) / 10,
      away_goals: Math.round(alB * 10) / 10,
      home_win_prob: Math.round(probsB.homeWin * 100) / 100,
      draw_prob: Math.round(probsB.draw * 100) / 100,
      away_win_prob: Math.round(probsB.awayWin * 100) / 100,
    })

    // Model C: Market model (further variation, slightly different calibration)
    const mktNoise = (Math.random() - 0.5) * 0.1
    const { homeLambda: hlC, awayLambda: alC } = poissonGoals(
      home.elo_rating * (1 + mktNoise),
      away.elo_rating,
      0.08 // slightly lower home advantage in markets
    )
    const probsC = calcOutcomeProbs(hlC, alC)
    predictions.push({
      id: `pred-C-${fixture.id}`,
      fixture_id: fixture.id,
      model: 'C',
      home_goals: Math.round(hlC * 10) / 10,
      away_goals: Math.round(alC * 10) / 10,
      home_win_prob: Math.round(probsC.homeWin * 100) / 100,
      draw_prob: Math.round(probsC.draw * 100) / 100,
      away_win_prob: Math.round(probsC.awayWin * 100) / 100,
    })
  })

  return predictions
}

export const SEED_PREDICTIONS = generatePredictions()
