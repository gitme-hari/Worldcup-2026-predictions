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
  const venues = [
    'MetLife Stadium', 'AT&T Stadium', 'SoFi Stadium', 'Hard Rock Stadium',
    'Rose Bowl', "Levi's Stadium", 'Lincoln Financial Field', 'Arrowhead Stadium',
    'Seattle', 'Vancouver', 'Toronto', 'Guadalajara', 'Mexico City', 'Monterrey',
  ]
  const baseDate = new Date('2026-06-11T18:00:00Z')

  groups.forEach((group, gi) => {
    const groupTeams = SEED_TEAMS.filter(t => t.group === group)
    const matchups = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
    const matchdays = [1,1,2,2,3,3]

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

// ─── Model B: historical tournament over/under-performance vs raw Elo ────────
// Captures patterns ML models learn: teams that consistently beat/miss Elo
// expectations in World Cup knockout play (last 3 tournaments).
const MODEL_B_BIAS: Record<string, number> = {
  // Consistent over-performers
  mar: 0.22,   // 2022 semi-finalists — biggest surprise in recent WC history
  cro: 0.18,   // 2018 finalists, 2022 third place
  jpn: 0.14,   // R16 in 2022, dominant in Asian qualifying
  sui: 0.12,   // Quietly consistent in every tournament
  arg: 0.12,   // 2022 WC winners, peak generation
  sen: 0.10,   // 2022 QF, best African side
  uru: 0.10,   // Punches above weight every tournament
  fra: 0.08,   // 2018 winners, 2022 finalists
  aus: 0.08,   // 2022 R16 upset over Denmark
  kor: 0.06,
  ecu: 0.06,
  nga: 0.06,
  // Consistent under-performers vs Elo
  eng: -0.14,  // Historically fails to meet expectations
  bel: -0.16,  // Golden generation, zero major trophies
  ned: -0.10,  // Inconsistent despite talent
  pol: -0.08,  // Over-reliant on one player
  mex: -0.10,  // R16 curse for decades
  ita: -0.06,  // Rebuilding
  usa: -0.06,
  chi: -0.06,
  tur: -0.04,
}

// ─── Model C: market-calibrated biases (live adjustments applied in store) ───
// Bookmakers apply style-of-play adjustments beyond raw Elo.
const MODEL_C_ATTACK_BIAS: Record<string, number> = {
  fra: 1.10, esp: 1.08, ger: 1.07, eng: 1.06, bra: 1.05, por: 1.04,
  mar: 0.92, cro: 0.90, jpn: 0.88, sui: 0.88, arg: 0.96, uru: 0.94,
}
const MODEL_C_DEFENSE_BIAS: Record<string, number> = {
  mar: 1.12, sui: 1.10, cro: 1.08, fra: 1.08, arg: 1.05, ger: 1.05,
  esp: 1.06, eng: 0.94, bel: 0.92, ned: 0.95, pol: 0.93,
}

function poissonGoals(eloHome: number, eloAway: number, homeAdv = 0.1) {
  const diff = (eloHome - eloAway) / 400
  const base = 1.35
  return {
    homeLambda: base * Math.pow(10, diff + homeAdv),
    awayLambda: base * Math.pow(10, -diff),
  }
}

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function calcOutcomeProbs(hl: number, al: number) {
  let hw = 0, d = 0, aw = 0
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (h > a) hw += p
      else if (h === a) d += p
      else aw += p
    }
  }
  return { homeWin: hw, draw: d, awayWin: aw }
}

// Market shrinkage: compress extreme probabilities toward 1/3
function shrink(p: number, f = 0.18): number {
  return p * (1 - f) + (1 / 3) * f
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

    // ── Model A: pure Elo + Poisson ───────────────────────────────────────
    const { homeLambda: hlA, awayLambda: alA } = poissonGoals(home.elo_rating, away.elo_rating)
    const pA = calcOutcomeProbs(hlA, alA)
    predictions.push({
      id: `pred-A-${fixture.id}`, fixture_id: fixture.id, model: 'A',
      home_goals: Math.round(hlA * 10) / 10,
      away_goals: Math.round(alA * 10) / 10,
      home_win_prob: Math.round(pA.homeWin * 100) / 100,
      draw_prob: Math.round(pA.draw * 100) / 100,
      away_win_prob: Math.round(pA.awayWin * 100) / 100,
    })

    // ── Model B: ML — Elo adjusted by tournament performance history ──────
    const hBias = MODEL_B_BIAS[home.id] ?? 0
    const aBias = MODEL_B_BIAS[away.id] ?? 0
    const { homeLambda: hlB, awayLambda: alB } = poissonGoals(
      home.elo_rating * (1 + hBias),
      away.elo_rating * (1 + aBias),
      0.09
    )
    const pB = calcOutcomeProbs(hlB, alB)
    predictions.push({
      id: `pred-B-${fixture.id}`, fixture_id: fixture.id, model: 'B',
      home_goals: Math.round(hlB * 10) / 10,
      away_goals: Math.round(alB * 10) / 10,
      home_win_prob: Math.round(pB.homeWin * 100) / 100,
      draw_prob: Math.round(pB.draw * 100) / 100,
      away_win_prob: Math.round(pB.awayWin * 100) / 100,
    })

    // ── Model C: market-calibrated base (live data applied on top in store) ─
    const hAtk = MODEL_C_ATTACK_BIAS[home.id] ?? 1.0
    const aDef = MODEL_C_DEFENSE_BIAS[away.id] ?? 1.0
    const aAtk = MODEL_C_ATTACK_BIAS[away.id] ?? 1.0
    const hDef = MODEL_C_DEFENSE_BIAS[home.id] ?? 1.0
    const { homeLambda: hlCraw, awayLambda: alCraw } = poissonGoals(
      home.elo_rating, away.elo_rating, 0.07
    )
    const hlC = Math.max(0.3, hlCraw * hAtk * (2 - aDef))
    const alC = Math.max(0.3, alCraw * aAtk * (2 - hDef))
    const pCraw = calcOutcomeProbs(hlC, alC)
    const hw = shrink(pCraw.homeWin)
    const dw = shrink(pCraw.draw)
    const aw = shrink(pCraw.awayWin)
    const tot = hw + dw + aw
    predictions.push({
      id: `pred-C-${fixture.id}`, fixture_id: fixture.id, model: 'C',
      home_goals: Math.round(hlC * 10) / 10,
      away_goals: Math.round(alC * 10) / 10,
      home_win_prob: Math.round((hw / tot) * 100) / 100,
      draw_prob: Math.round((dw / tot) * 100) / 100,
      away_win_prob: Math.round((aw / tot) * 100) / 100,
    })
  })

  return predictions
}

export const SEED_PREDICTIONS = generatePredictions()
