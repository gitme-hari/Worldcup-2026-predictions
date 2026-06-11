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
  { id: 'mex', name: 'Mexico',        code: 'MEX', group: 'A', flag_url: '🇲🇽', elo_rating: 1760 },
  { id: 'rsa', name: 'South Africa',  code: 'RSA', group: 'A', flag_url: '🇿🇦', elo_rating: 1570 },
  { id: 'kor', name: 'Korea Republic',code: 'KOR', group: 'A', flag_url: '🇰🇷', elo_rating: 1700 },
  { id: 'cze', name: 'Czechia',       code: 'CZE', group: 'A', flag_url: '🇨🇿', elo_rating: 1710 },
  // Group B
  { id: 'can', name: 'Canada',        code: 'CAN', group: 'B', flag_url: '🇨🇦', elo_rating: 1720 },
  { id: 'bih', name: 'Bosnia and Herzegovina', code: 'BIH', group: 'B', flag_url: '🇧🇦', elo_rating: 1640 },
  { id: 'qat', name: 'Qatar',         code: 'QAT', group: 'B', flag_url: '🇶🇦', elo_rating: 1550 },
  { id: 'sui', name: 'Switzerland',   code: 'SUI', group: 'B', flag_url: '🇨🇭', elo_rating: 1840 },
  // Group C
  { id: 'bra', name: 'Brazil',        code: 'BRA', group: 'C', flag_url: '🇧🇷', elo_rating: 2020 },
  { id: 'mar', name: 'Morocco',       code: 'MAR', group: 'C', flag_url: '🇲🇦', elo_rating: 1860 },
  { id: 'hai', name: 'Haiti',         code: 'HAI', group: 'C', flag_url: '🇭🇹', elo_rating: 1480 },
  { id: 'sco', name: 'Scotland',      code: 'SCO', group: 'C', flag_url: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', elo_rating: 1690 },
  // Group D
  { id: 'usa', name: 'United States', code: 'USA', group: 'D', flag_url: '🇺🇸', elo_rating: 1800 },
  { id: 'par', name: 'Paraguay',      code: 'PAR', group: 'D', flag_url: '🇵🇾', elo_rating: 1610 },
  { id: 'aus', name: 'Australia',     code: 'AUS', group: 'D', flag_url: '🇦🇺', elo_rating: 1650 },
  { id: 'tur', name: 'Türkiye',       code: 'TUR', group: 'D', flag_url: '🇹🇷', elo_rating: 1760 },
  // Group E
  { id: 'ger', name: 'Germany',       code: 'GER', group: 'E', flag_url: '🇩🇪', elo_rating: 1980 },
  { id: 'cur', name: 'Curaçao',       code: 'CUW', group: 'E', flag_url: '🇨🇼', elo_rating: 1480 },
  { id: 'civ', name: "Côte d'Ivoire", code: 'CIV', group: 'E', flag_url: '🇨🇮', elo_rating: 1700 },
  { id: 'ecu', name: 'Ecuador',       code: 'ECU', group: 'E', flag_url: '🇪🇨', elo_rating: 1690 },
  // Group F
  { id: 'ned', name: 'Netherlands',   code: 'NED', group: 'F', flag_url: '🇳🇱', elo_rating: 1900 },
  { id: 'jpn', name: 'Japan',         code: 'JPN', group: 'F', flag_url: '🇯🇵', elo_rating: 1800 },
  { id: 'swe', name: 'Sweden',        code: 'SWE', group: 'F', flag_url: '🇸🇪', elo_rating: 1780 },
  { id: 'tun', name: 'Tunisia',       code: 'TUN', group: 'F', flag_url: '🇹🇳', elo_rating: 1590 },
  // Group G
  { id: 'bel', name: 'Belgium',       code: 'BEL', group: 'G', flag_url: '🇧🇪', elo_rating: 1920 },
  { id: 'egy', name: 'Egypt',         code: 'EGY', group: 'G', flag_url: '🇪🇬', elo_rating: 1680 },
  { id: 'irn', name: 'IR Iran',       code: 'IRN', group: 'G', flag_url: '🇮🇷', elo_rating: 1660 },
  { id: 'nzl', name: 'New Zealand',   code: 'NZL', group: 'G', flag_url: '🇳🇿', elo_rating: 1520 },
  // Group H
  { id: 'esp', name: 'Spain',         code: 'ESP', group: 'H', flag_url: '🇪🇸', elo_rating: 1990 },
  { id: 'cpv', name: 'Cabo Verde',    code: 'CPV', group: 'H', flag_url: '🇨🇻', elo_rating: 1500 },
  { id: 'ksa', name: 'Saudi Arabia',  code: 'KSA', group: 'H', flag_url: '🇸🇦', elo_rating: 1620 },
  { id: 'uru', name: 'Uruguay',       code: 'URU', group: 'H', flag_url: '🇺🇾', elo_rating: 1850 },
  // Group I
  { id: 'fra', name: 'France',        code: 'FRA', group: 'I', flag_url: '🇫🇷', elo_rating: 2010 },
  { id: 'sen', name: 'Senegal',       code: 'SEN', group: 'I', flag_url: '🇸🇳', elo_rating: 1760 },
  { id: 'irq', name: 'Iraq',          code: 'IRQ', group: 'I', flag_url: '🇮🇶', elo_rating: 1530 },
  { id: 'nor', name: 'Norway',        code: 'NOR', group: 'I', flag_url: '🇳🇴', elo_rating: 1810 },
  // Group J
  { id: 'arg', name: 'Argentina',     code: 'ARG', group: 'J', flag_url: '🇦🇷', elo_rating: 2050 },
  { id: 'alg', name: 'Algeria',       code: 'ALG', group: 'J', flag_url: '🇩🇿', elo_rating: 1650 },
  { id: 'aut', name: 'Austria',       code: 'AUT', group: 'J', flag_url: '🇦🇹', elo_rating: 1750 },
  { id: 'jor', name: 'Jordan',        code: 'JOR', group: 'J', flag_url: '🇯🇴', elo_rating: 1520 },
  // Group K
  { id: 'por', name: 'Portugal',      code: 'POR', group: 'K', flag_url: '🇵🇹', elo_rating: 1970 },
  { id: 'cod', name: 'Congo DR',      code: 'COD', group: 'K', flag_url: '🇨🇩', elo_rating: 1560 },
  { id: 'uzb', name: 'Uzbekistan',    code: 'UZB', group: 'K', flag_url: '🇺🇿', elo_rating: 1530 },
  { id: 'col', name: 'Colombia',      code: 'COL', group: 'K', flag_url: '🇨🇴', elo_rating: 1780 },
  // Group L
  { id: 'eng', name: 'England',       code: 'ENG', group: 'L', flag_url: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', elo_rating: 1970 },
  { id: 'cro', name: 'Croatia',       code: 'CRO', group: 'L', flag_url: '🇭🇷', elo_rating: 1830 },
  { id: 'gha', name: 'Ghana',         code: 'GHA', group: 'L', flag_url: '🇬🇭', elo_rating: 1610 },
  { id: 'pan', name: 'Panama',        code: 'PAN', group: 'L', flag_url: '🇵🇦', elo_rating: 1620 },
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
const MODEL_B_BIAS: Record<string, number> = {
  // Over-performers
  mar: 0.22, cro: 0.18, jpn: 0.14, sui: 0.12, arg: 0.12, sen: 0.10,
  uru: 0.10, fra: 0.08, aus: 0.08, kor: 0.06, ecu: 0.06,
  sco: 0.04, nor: 0.04, col: 0.06,
  // Under-performers
  eng: -0.14, bel: -0.16, ned: -0.10, mex: -0.10, ger: -0.06,
  usa: -0.06, tur: -0.04, can: -0.06,
}

// ─── Model C: style-of-play attack/defense multipliers ───────────────────────
const MODEL_C_ATTACK_BIAS: Record<string, number> = {
  fra: 1.10, esp: 1.08, ger: 1.07, eng: 1.06, bra: 1.05, por: 1.04,
  arg: 1.04, nor: 1.06, ned: 1.03,
  mar: 0.92, cro: 0.90, jpn: 0.88, sui: 0.88, uru: 0.94,
}
const MODEL_C_DEFENSE_BIAS: Record<string, number> = {
  mar: 1.12, sui: 1.10, cro: 1.08, fra: 1.08, arg: 1.05, ger: 1.05,
  esp: 1.06, uru: 1.04,
  eng: 0.94, bel: 0.92, ned: 0.95,
}

function poissonGoals(eloHome: number, eloAway: number, homeAdv = 0.15) {
  // Exponential-linear model: realistic WC scores, no blow-outs from Elo gaps
  const K = 0.0025
  const BASE = 1.25
  const diff = eloHome - eloAway
  const homeLambda = Math.min(Math.max(BASE * Math.exp(K * diff) + homeAdv, 0.3), 3.5)
  const awayLambda = Math.min(Math.max(BASE * Math.exp(-K * diff), 0.3), 3.5)
  return { homeLambda, awayLambda }
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
      0.12
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
      home.elo_rating, away.elo_rating, 0.10
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
