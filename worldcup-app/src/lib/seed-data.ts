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

export type FixtureStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'third_place'

export function stageLabel(stage: FixtureStage): string {
  switch (stage) {
    case 'group':       return 'Group Stage'
    case 'r32':         return 'Round of 32'
    case 'r16':         return 'Round of 16'
    case 'qf':          return 'Quarter-Final'
    case 'sf':          return 'Semi-Final'
    case 'final':       return 'Final'
    case 'third_place': return '3rd Place'
  }
}

export interface SeedFixture {
  id: string
  home_team_id: string   // '' = TBD (not yet determined)
  away_team_id: string   // '' = TBD
  group: string | null
  stage: FixtureStage
  matchday: number | null
  kickoff_utc: string
  venue: string
  stadium?: string
  altitude_m?: number
  homeSource?: string           // seed origin, e.g. 'W:r32-1', 'W_A', 'T_1'
  awaySource?: string
  winnerAdvancesTo?: string     // fixture id where winner becomes home/away team
  winnerSlot?: 'home' | 'away'
  loserAdvancesTo?: string      // sf only → third-place fixture
  loserSlot?: 'home' | 'away'
}

// Official FIFA 2026 group stage schedule — 72 fixtures, verified from FIFA schedule
export const SEED_FIXTURES: SeedFixture[] = [
  // Group A
  { id:'group-A-m1', home_team_id:'mex', away_team_id:'rsa', group:'A', stage:'group', matchday:1, kickoff_utc:'2026-06-11T18:00:00Z', venue:'Mexico City' },
  { id:'group-A-m2', home_team_id:'kor', away_team_id:'cze', group:'A', stage:'group', matchday:1, kickoff_utc:'2026-06-12T01:00:00Z', venue:'Guadalajara' },
  { id:'group-A-m3', home_team_id:'mex', away_team_id:'kor', group:'A', stage:'group', matchday:2, kickoff_utc:'2026-06-19T00:00:00Z', venue:'Guadalajara' },
  { id:'group-A-m4', home_team_id:'cze', away_team_id:'rsa', group:'A', stage:'group', matchday:2, kickoff_utc:'2026-06-18T15:00:00Z', venue:'Atlanta' },
  { id:'group-A-m5', home_team_id:'cze', away_team_id:'mex', group:'A', stage:'group', matchday:3, kickoff_utc:'2026-06-25T00:00:00Z', venue:'Mexico City' },
  { id:'group-A-m6', home_team_id:'rsa', away_team_id:'kor', group:'A', stage:'group', matchday:3, kickoff_utc:'2026-06-25T00:00:00Z', venue:'Monterrey' },
  // Group B
  { id:'group-B-m1', home_team_id:'can', away_team_id:'bih', group:'B', stage:'group', matchday:1, kickoff_utc:'2026-06-12T18:00:00Z', venue:'Toronto' },
  { id:'group-B-m2', home_team_id:'qat', away_team_id:'sui', group:'B', stage:'group', matchday:1, kickoff_utc:'2026-06-13T18:00:00Z', venue:'San Francisco Bay Area' },
  { id:'group-B-m3', home_team_id:'can', away_team_id:'qat', group:'B', stage:'group', matchday:2, kickoff_utc:'2026-06-18T21:00:00Z', venue:'Vancouver' },
  { id:'group-B-m4', home_team_id:'sui', away_team_id:'bih', group:'B', stage:'group', matchday:2, kickoff_utc:'2026-06-18T18:00:00Z', venue:'Los Angeles' },
  { id:'group-B-m5', home_team_id:'sui', away_team_id:'can', group:'B', stage:'group', matchday:3, kickoff_utc:'2026-06-24T18:00:00Z', venue:'Vancouver' },
  { id:'group-B-m6', home_team_id:'bih', away_team_id:'qat', group:'B', stage:'group', matchday:3, kickoff_utc:'2026-06-24T18:00:00Z', venue:'Seattle' },
  // Group C
  { id:'group-C-m1', home_team_id:'bra', away_team_id:'mar', group:'C', stage:'group', matchday:1, kickoff_utc:'2026-06-13T21:00:00Z', venue:'New Jersey' },
  { id:'group-C-m2', home_team_id:'hai', away_team_id:'sco', group:'C', stage:'group', matchday:1, kickoff_utc:'2026-06-14T00:00:00Z', venue:'Boston' },
  { id:'group-C-m3', home_team_id:'bra', away_team_id:'hai', group:'C', stage:'group', matchday:2, kickoff_utc:'2026-06-19T23:30:00Z', venue:'Philadelphia' },
  { id:'group-C-m4', home_team_id:'sco', away_team_id:'mar', group:'C', stage:'group', matchday:2, kickoff_utc:'2026-06-19T21:00:00Z', venue:'Boston' },
  { id:'group-C-m5', home_team_id:'sco', away_team_id:'bra', group:'C', stage:'group', matchday:3, kickoff_utc:'2026-06-24T21:00:00Z', venue:'Miami' },
  { id:'group-C-m6', home_team_id:'mar', away_team_id:'hai', group:'C', stage:'group', matchday:3, kickoff_utc:'2026-06-24T21:00:00Z', venue:'Atlanta' },
  // Group D
  { id:'group-D-m1', home_team_id:'usa', away_team_id:'par', group:'D', stage:'group', matchday:1, kickoff_utc:'2026-06-13T00:00:00Z', venue:'Los Angeles' },
  { id:'group-D-m2', home_team_id:'aus', away_team_id:'tur', group:'D', stage:'group', matchday:1, kickoff_utc:'2026-06-14T03:00:00Z', venue:'Vancouver' },
  { id:'group-D-m3', home_team_id:'usa', away_team_id:'aus', group:'D', stage:'group', matchday:2, kickoff_utc:'2026-06-19T18:00:00Z', venue:'Seattle' },
  { id:'group-D-m4', home_team_id:'tur', away_team_id:'par', group:'D', stage:'group', matchday:2, kickoff_utc:'2026-06-20T02:00:00Z', venue:'San Francisco Bay Area' },
  { id:'group-D-m5', home_team_id:'tur', away_team_id:'usa', group:'D', stage:'group', matchday:3, kickoff_utc:'2026-06-26T01:00:00Z', venue:'Los Angeles' },
  { id:'group-D-m6', home_team_id:'par', away_team_id:'aus', group:'D', stage:'group', matchday:3, kickoff_utc:'2026-06-26T01:00:00Z', venue:'San Francisco Bay Area' },
  // Group E
  { id:'group-E-m1', home_team_id:'ger', away_team_id:'cur', group:'E', stage:'group', matchday:1, kickoff_utc:'2026-06-14T16:00:00Z', venue:'Houston' },
  { id:'group-E-m2', home_team_id:'civ', away_team_id:'ecu', group:'E', stage:'group', matchday:1, kickoff_utc:'2026-06-14T22:00:00Z', venue:'Philadelphia' },
  { id:'group-E-m3', home_team_id:'ger', away_team_id:'civ', group:'E', stage:'group', matchday:2, kickoff_utc:'2026-06-20T19:00:00Z', venue:'Toronto' },
  { id:'group-E-m4', home_team_id:'ecu', away_team_id:'cur', group:'E', stage:'group', matchday:2, kickoff_utc:'2026-06-20T23:00:00Z', venue:'Kansas City' },
  { id:'group-E-m5', home_team_id:'cur', away_team_id:'civ', group:'E', stage:'group', matchday:3, kickoff_utc:'2026-06-25T19:00:00Z', venue:'Philadelphia' },
  { id:'group-E-m6', home_team_id:'ecu', away_team_id:'ger', group:'E', stage:'group', matchday:3, kickoff_utc:'2026-06-25T19:00:00Z', venue:'New Jersey' },
  // Group F
  { id:'group-F-m1', home_team_id:'ned', away_team_id:'jpn', group:'F', stage:'group', matchday:1, kickoff_utc:'2026-06-14T19:00:00Z', venue:'Dallas' },
  { id:'group-F-m2', home_team_id:'swe', away_team_id:'tun', group:'F', stage:'group', matchday:1, kickoff_utc:'2026-06-15T01:00:00Z', venue:'Monterrey' },
  { id:'group-F-m3', home_team_id:'ned', away_team_id:'swe', group:'F', stage:'group', matchday:2, kickoff_utc:'2026-06-20T16:00:00Z', venue:'Houston' },
  { id:'group-F-m4', home_team_id:'tun', away_team_id:'jpn', group:'F', stage:'group', matchday:2, kickoff_utc:'2026-06-21T03:00:00Z', venue:'Monterrey' },
  { id:'group-F-m5', home_team_id:'jpn', away_team_id:'swe', group:'F', stage:'group', matchday:3, kickoff_utc:'2026-06-25T22:00:00Z', venue:'Dallas' },
  { id:'group-F-m6', home_team_id:'tun', away_team_id:'ned', group:'F', stage:'group', matchday:3, kickoff_utc:'2026-06-25T22:00:00Z', venue:'Kansas City' },
  // Group G
  { id:'group-G-m1', home_team_id:'bel', away_team_id:'egy', group:'G', stage:'group', matchday:1, kickoff_utc:'2026-06-15T18:00:00Z', venue:'Seattle' },
  { id:'group-G-m2', home_team_id:'irn', away_team_id:'nzl', group:'G', stage:'group', matchday:1, kickoff_utc:'2026-06-16T00:00:00Z', venue:'Los Angeles' },
  { id:'group-G-m3', home_team_id:'bel', away_team_id:'irn', group:'G', stage:'group', matchday:2, kickoff_utc:'2026-06-21T18:00:00Z', venue:'Los Angeles' },
  { id:'group-G-m4', home_team_id:'nzl', away_team_id:'egy', group:'G', stage:'group', matchday:2, kickoff_utc:'2026-06-22T00:00:00Z', venue:'Vancouver' },
  { id:'group-G-m5', home_team_id:'egy', away_team_id:'irn', group:'G', stage:'group', matchday:3, kickoff_utc:'2026-06-27T02:00:00Z', venue:'Seattle' },
  { id:'group-G-m6', home_team_id:'nzl', away_team_id:'bel', group:'G', stage:'group', matchday:3, kickoff_utc:'2026-06-27T02:00:00Z', venue:'Vancouver' },
  // Group H
  { id:'group-H-m1', home_team_id:'esp', away_team_id:'cpv', group:'H', stage:'group', matchday:1, kickoff_utc:'2026-06-15T15:00:00Z', venue:'Atlanta' },
  { id:'group-H-m2', home_team_id:'ksa', away_team_id:'uru', group:'H', stage:'group', matchday:1, kickoff_utc:'2026-06-15T21:00:00Z', venue:'Miami' },
  { id:'group-H-m3', home_team_id:'esp', away_team_id:'ksa', group:'H', stage:'group', matchday:2, kickoff_utc:'2026-06-21T16:00:00Z', venue:'Dallas' },
  { id:'group-H-m4', home_team_id:'uru', away_team_id:'cpv', group:'H', stage:'group', matchday:2, kickoff_utc:'2026-06-21T21:00:00Z', venue:'Miami' },
  { id:'group-H-m5', home_team_id:'uru', away_team_id:'esp', group:'H', stage:'group', matchday:3, kickoff_utc:'2026-06-26T23:00:00Z', venue:'Guadalajara' },
  { id:'group-H-m6', home_team_id:'cpv', away_team_id:'ksa', group:'H', stage:'group', matchday:3, kickoff_utc:'2026-06-26T23:00:00Z', venue:'Houston' },
  // Group I
  { id:'group-I-m1', home_team_id:'fra', away_team_id:'sen', group:'I', stage:'group', matchday:1, kickoff_utc:'2026-06-16T18:00:00Z', venue:'New Jersey' },
  { id:'group-I-m2', home_team_id:'irq', away_team_id:'nor', group:'I', stage:'group', matchday:1, kickoff_utc:'2026-06-16T21:00:00Z', venue:'Boston' },
  { id:'group-I-m3', home_team_id:'fra', away_team_id:'irq', group:'I', stage:'group', matchday:2, kickoff_utc:'2026-06-22T20:00:00Z', venue:'Philadelphia' },
  { id:'group-I-m4', home_team_id:'nor', away_team_id:'sen', group:'I', stage:'group', matchday:2, kickoff_utc:'2026-06-23T00:00:00Z', venue:'New Jersey' },
  { id:'group-I-m5', home_team_id:'nor', away_team_id:'fra', group:'I', stage:'group', matchday:3, kickoff_utc:'2026-06-26T18:00:00Z', venue:'Boston' },
  { id:'group-I-m6', home_team_id:'sen', away_team_id:'irq', group:'I', stage:'group', matchday:3, kickoff_utc:'2026-06-26T18:00:00Z', venue:'Toronto' },
  // Group J
  { id:'group-J-m1', home_team_id:'arg', away_team_id:'alg', group:'J', stage:'group', matchday:1, kickoff_utc:'2026-06-17T00:00:00Z', venue:'Kansas City' },
  { id:'group-J-m2', home_team_id:'aut', away_team_id:'jor', group:'J', stage:'group', matchday:1, kickoff_utc:'2026-06-17T03:00:00Z', venue:'San Francisco Bay Area' },
  { id:'group-J-m3', home_team_id:'arg', away_team_id:'aut', group:'J', stage:'group', matchday:2, kickoff_utc:'2026-06-22T16:00:00Z', venue:'Dallas' },
  { id:'group-J-m4', home_team_id:'jor', away_team_id:'alg', group:'J', stage:'group', matchday:2, kickoff_utc:'2026-06-22T03:00:00Z', venue:'San Francisco Bay Area' },
  { id:'group-J-m5', home_team_id:'alg', away_team_id:'aut', group:'J', stage:'group', matchday:3, kickoff_utc:'2026-06-28T01:00:00Z', venue:'Kansas City' },
  { id:'group-J-m6', home_team_id:'jor', away_team_id:'arg', group:'J', stage:'group', matchday:3, kickoff_utc:'2026-06-28T01:00:00Z', venue:'Dallas' },
  // Group K
  { id:'group-K-m1', home_team_id:'por', away_team_id:'cod', group:'K', stage:'group', matchday:1, kickoff_utc:'2026-06-17T16:00:00Z', venue:'Houston' },
  { id:'group-K-m2', home_team_id:'uzb', away_team_id:'col', group:'K', stage:'group', matchday:1, kickoff_utc:'2026-06-18T01:00:00Z', venue:'Mexico City' },
  { id:'group-K-m3', home_team_id:'por', away_team_id:'uzb', group:'K', stage:'group', matchday:2, kickoff_utc:'2026-06-22T16:00:00Z', venue:'Houston' },
  { id:'group-K-m4', home_team_id:'col', away_team_id:'cod', group:'K', stage:'group', matchday:2, kickoff_utc:'2026-06-24T01:00:00Z', venue:'Guadalajara' },
  { id:'group-K-m5', home_team_id:'col', away_team_id:'por', group:'K', stage:'group', matchday:3, kickoff_utc:'2026-06-27T22:30:00Z', venue:'Miami' },
  { id:'group-K-m6', home_team_id:'cod', away_team_id:'uzb', group:'K', stage:'group', matchday:3, kickoff_utc:'2026-06-27T22:30:00Z', venue:'Atlanta' },
  // Group L
  { id:'group-L-m1', home_team_id:'eng', away_team_id:'cro', group:'L', stage:'group', matchday:1, kickoff_utc:'2026-06-17T19:00:00Z', venue:'Dallas' },
  { id:'group-L-m2', home_team_id:'gha', away_team_id:'pan', group:'L', stage:'group', matchday:1, kickoff_utc:'2026-06-17T22:00:00Z', venue:'Toronto' },
  { id:'group-L-m3', home_team_id:'eng', away_team_id:'gha', group:'L', stage:'group', matchday:2, kickoff_utc:'2026-06-23T19:00:00Z', venue:'Boston' },
  { id:'group-L-m4', home_team_id:'pan', away_team_id:'cro', group:'L', stage:'group', matchday:2, kickoff_utc:'2026-06-23T22:00:00Z', venue:'Toronto' },
  { id:'group-L-m5', home_team_id:'pan', away_team_id:'eng', group:'L', stage:'group', matchday:3, kickoff_utc:'2026-06-27T20:00:00Z', venue:'New Jersey' },
  { id:'group-L-m6', home_team_id:'cro', away_team_id:'gha', group:'L', stage:'group', matchday:3, kickoff_utc:'2026-06-27T20:00:00Z', venue:'Philadelphia' },
]

// ─── Knockout fixtures ────────────────────────────────────────────────────────
// R32 teams are confirmed from the official FIFA WC2026 bracket draw.
// R16+ home_team_id/away_team_id start as '' and are populated via knockoutTeams
// localStorage when results are entered. Kickoff times are UTC.
export const KNOCKOUT_FIXTURES: SeedFixture[] = [
  // ── Round of 32 — M73-M88 (official FIFA numbering) ──────────────────────
  // M73: Jun 28  (time TBC, ~18:00 UTC based on LA afternoon slot)
  { id:'r32-1',  home_team_id:'rsa', away_team_id:'can', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-28T18:00:00Z', venue:'Los Angeles',            winnerAdvancesTo:'r16-2', winnerSlot:'home' },
  // M74: Jun 29 16:30 ET = 20:30 UTC
  { id:'r32-2',  home_team_id:'ger', away_team_id:'par', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-29T20:30:00Z', venue:'Boston',                 winnerAdvancesTo:'r16-1', winnerSlot:'home' },
  // M75: Jun 29 21:00 ET = Jun 30 01:00 UTC
  { id:'r32-3',  home_team_id:'ned', away_team_id:'mar', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-30T01:00:00Z', venue:'Monterrey',              winnerAdvancesTo:'r16-2', winnerSlot:'away' },
  // M76: Jun 29 13:00 ET = 17:00 UTC
  { id:'r32-4',  home_team_id:'bra', away_team_id:'jpn', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-29T17:00:00Z', venue:'Houston',                winnerAdvancesTo:'r16-3', winnerSlot:'home' },
  // M77: Jun 30 17:00 ET = 21:00 UTC
  { id:'r32-5',  home_team_id:'fra', away_team_id:'swe', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-30T21:00:00Z', venue:'New Jersey',             winnerAdvancesTo:'r16-1', winnerSlot:'away' },
  // M78: Jun 30 13:00 ET = 17:00 UTC
  { id:'r32-6',  home_team_id:'civ', away_team_id:'nor', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-06-30T17:00:00Z', venue:'Dallas',                 winnerAdvancesTo:'r16-3', winnerSlot:'away' },
  // M79: Jun 30 21:00 ET = Jul 1 01:00 UTC
  { id:'r32-7',  home_team_id:'mex', away_team_id:'ecu', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-01T01:00:00Z', venue:'Mexico City',            winnerAdvancesTo:'r16-4', winnerSlot:'home' },
  // M80: Jul 1 12:00 ET = 16:00 UTC
  { id:'r32-8',  home_team_id:'eng', away_team_id:'cod', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-01T16:00:00Z', venue:'Atlanta',                winnerAdvancesTo:'r16-4', winnerSlot:'away' },
  // M81: Jul 1 20:00 ET = Jul 2 00:00 UTC
  { id:'r32-9',  home_team_id:'usa', away_team_id:'bih', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-02T00:00:00Z', venue:'San Francisco Bay Area', winnerAdvancesTo:'r16-6', winnerSlot:'home' },
  // M82: Jul 1 16:00 ET = 20:00 UTC
  { id:'r32-10', home_team_id:'bel', away_team_id:'sen', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-01T20:00:00Z', venue:'Seattle',                winnerAdvancesTo:'r16-6', winnerSlot:'away' },
  // M83: Jul 2 19:00 ET = 23:00 UTC
  { id:'r32-11', home_team_id:'por', away_team_id:'cro', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-02T23:00:00Z', venue:'Toronto',                winnerAdvancesTo:'r16-5', winnerSlot:'home' },
  // M84: Jul 2 15:00 ET = 19:00 UTC
  { id:'r32-12', home_team_id:'esp', away_team_id:'aut', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-02T19:00:00Z', venue:'Los Angeles',            winnerAdvancesTo:'r16-5', winnerSlot:'away' },
  // M85: Jul 2 23:00 ET = Jul 3 03:00 UTC
  { id:'r32-13', home_team_id:'sui', away_team_id:'alg', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-03T03:00:00Z', venue:'Vancouver',              winnerAdvancesTo:'r16-8', winnerSlot:'home' },
  // M86: Jul 3 14:00 ET = 18:00 UTC
  { id:'r32-14', home_team_id:'arg', away_team_id:'cpv', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-03T18:00:00Z', venue:'Miami',                  winnerAdvancesTo:'r16-7', winnerSlot:'home' },
  // M87: Jul 3 18:00 ET = 22:00 UTC
  { id:'r32-15', home_team_id:'col', away_team_id:'gha', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-03T22:00:00Z', venue:'Kansas City',            winnerAdvancesTo:'r16-8', winnerSlot:'away' },
  // M88: Jul 3 21:30 ET = Jul 4 01:30 UTC
  { id:'r32-16', home_team_id:'aus', away_team_id:'egy', group:null, stage:'r32', matchday:null, kickoff_utc:'2026-07-04T01:30:00Z', venue:'Dallas',                 winnerAdvancesTo:'r16-7', winnerSlot:'away' },

  // ── Round of 16 — M89-M96 ─────────────────────────────────────────────────
  // M89: W74(GER/PAR) vs W77(FRA/SWE) — Jul 4 23:00 ET = Jul 5 03:00 UTC
  { id:'r16-1', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-05T03:00:00Z', venue:'New Jersey',   homeSource:'W:r32-2', awaySource:'W:r32-5', winnerAdvancesTo:'qf-1', winnerSlot:'home' },
  // M90: W73(RSA/CAN) vs W75(NED/MAR) — Jul 4 19:00 ET = 23:00 UTC
  { id:'r16-2', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-04T23:00:00Z', venue:'Los Angeles',  homeSource:'W:r32-1', awaySource:'W:r32-3', winnerAdvancesTo:'qf-1', winnerSlot:'away' },
  // M91: W76(BRA/JPN) vs W78(CIV/NOR) — Jul 5 22:00 ET = Jul 6 02:00 UTC
  { id:'r16-3', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-06T02:00:00Z', venue:'Houston',      homeSource:'W:r32-4', awaySource:'W:r32-6', winnerAdvancesTo:'qf-2', winnerSlot:'home' },
  // M92: W79(MEX/ECU) vs W80(ENG/COD) — Jul 6 ~02:00 ET = 06:00 UTC
  { id:'r16-4', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-06T22:00:00Z', venue:'Seattle',      homeSource:'W:r32-7', awaySource:'W:r32-8', winnerAdvancesTo:'qf-2', winnerSlot:'away' },
  // M93: W83(POR/CRO) vs W84(ESP/AUT) — Jul 6 21:00 ET = Jul 7 01:00 UTC
  { id:'r16-5', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-07T01:00:00Z', venue:'Dallas',       homeSource:'W:r32-11', awaySource:'W:r32-12', winnerAdvancesTo:'qf-3', winnerSlot:'home' },
  // M94: W81(USA/BIH) vs W82(BEL/SEN) — Jul 7 02:00 ET = 06:00 UTC
  { id:'r16-6', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-07T06:00:00Z', venue:'Atlanta',      homeSource:'W:r32-9', awaySource:'W:r32-10', winnerAdvancesTo:'qf-3', winnerSlot:'away' },
  // M95: W86(ARG/CPV) vs W88(AUS/EGY) — Jul 7 18:00 ET = 22:00 UTC
  { id:'r16-7', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-07T22:00:00Z', venue:'Miami',        homeSource:'W:r32-14', awaySource:'W:r32-16', winnerAdvancesTo:'qf-4', winnerSlot:'home' },
  // M96: W85(SUI/ALG) vs W87(COL/GHA) — Jul 7 22:00 ET = Jul 8 02:00 UTC
  { id:'r16-8', home_team_id:'', away_team_id:'', group:null, stage:'r16', matchday:null, kickoff_utc:'2026-07-08T02:00:00Z', venue:'Kansas City',  homeSource:'W:r32-13', awaySource:'W:r32-15', winnerAdvancesTo:'qf-4', winnerSlot:'away' },

  // ── Quarter-Finals — M97-M100 ─────────────────────────────────────────────
  // M97: W89 vs W90 — Jul 9 22:00 ET = Jul 10 02:00 UTC
  { id:'qf-1', home_team_id:'', away_team_id:'', group:null, stage:'qf', matchday:null, kickoff_utc:'2026-07-10T02:00:00Z', venue:'New Jersey',  homeSource:'W:r16-1', awaySource:'W:r16-2', winnerAdvancesTo:'sf-1', winnerSlot:'home' },
  // M98: W93 vs W94 — Jul 10 21:00 ET = Jul 11 01:00 UTC
  { id:'qf-2', home_team_id:'', away_team_id:'', group:null, stage:'qf', matchday:null, kickoff_utc:'2026-07-11T01:00:00Z', venue:'Dallas',       homeSource:'W:r16-5', awaySource:'W:r16-6', winnerAdvancesTo:'sf-2', winnerSlot:'home' },
  // M99: W91 vs W92 — Jul 11 23:00 ET = Jul 12 03:00 UTC
  { id:'qf-3', home_team_id:'', away_team_id:'', group:null, stage:'qf', matchday:null, kickoff_utc:'2026-07-12T03:00:00Z', venue:'Los Angeles',  homeSource:'W:r16-3', awaySource:'W:r16-4', winnerAdvancesTo:'sf-1', winnerSlot:'away' },
  // M100: W95 vs W96 — Jul 12 03:00 ET = 07:00 UTC
  { id:'qf-4', home_team_id:'', away_team_id:'', group:null, stage:'qf', matchday:null, kickoff_utc:'2026-07-12T22:00:00Z', venue:'Houston',      homeSource:'W:r16-7', awaySource:'W:r16-8', winnerAdvancesTo:'sf-2', winnerSlot:'away' },

  // ── Semi-Finals — M101-M102 ───────────────────────────────────────────────
  // M101: W97 vs W99 — Jul 14 21:00 ET = Jul 15 01:00 UTC
  { id:'sf-1', home_team_id:'', away_team_id:'', group:null, stage:'sf', matchday:null, kickoff_utc:'2026-07-15T01:00:00Z', venue:'New Jersey', homeSource:'W:qf-1', awaySource:'W:qf-3', winnerAdvancesTo:'final', winnerSlot:'home', loserAdvancesTo:'third-place', loserSlot:'home' },
  // M102: W98 vs W100 — Jul 15 21:00 ET = Jul 16 01:00 UTC
  { id:'sf-2', home_team_id:'', away_team_id:'', group:null, stage:'sf', matchday:null, kickoff_utc:'2026-07-16T01:00:00Z', venue:'Dallas',     homeSource:'W:qf-2', awaySource:'W:qf-4', winnerAdvancesTo:'final', winnerSlot:'away', loserAdvancesTo:'third-place', loserSlot:'away' },

  // ── Third-place — M103 ────────────────────────────────────────────────────
  // Jul 18 23:00 ET = Jul 19 03:00 UTC
  { id:'third-place', home_team_id:'', away_team_id:'', group:null, stage:'third_place', matchday:null, kickoff_utc:'2026-07-19T03:00:00Z', venue:'Miami',     homeSource:'L:sf-1', awaySource:'L:sf-2' },

  // ── Final — M104 ─────────────────────────────────────────────────────────
  // Jul 19 21:00 ET = Jul 20 01:00 UTC
  { id:'final', home_team_id:'', away_team_id:'', group:null, stage:'final', matchday:null, kickoff_utc:'2026-07-20T01:00:00Z', venue:'New Jersey', homeSource:'W:sf-1', awaySource:'W:sf-2' },
]

// ─── Venue factors ────────────────────────────────────────────────────────────
// altitude: teams adapted to playing at altitude (CONMEBOL + Mexico)
const ALTITUDE_ADAPTED = new Set(['mex','arg','col','ecu','bol','par','uru','bra','per','chi','ven'])
// heat: teams from hot climates perform better in Miami/Dallas/Houston/Atlanta
const HEAT_CLIMATE = new Set(['mar','sen','civ','egy','gha','tun','ksa','irq','irn','cpv','cod','alg','jor','qat'])
// cold climate teams penalised in heat venues
const COLD_CLIMATE = new Set(['nor','swe','ned','bel','ger','sco','eng','aus','sui','cze','bih','aut'])
const HEAT_VENUES = new Set(['Miami','Dallas','Houston','Atlanta'])
const ALTITUDE_VENUES = new Set(['Mexico City','Guadalajara','Monterrey'])
// host nation bonuses at home venues
const HOST_HOME_VENUES: Record<string, string[]> = {
  usa: ['Los Angeles','Seattle','San Francisco Bay Area','Kansas City','New Jersey','Philadelphia','Boston','Miami','Dallas','Houston','Atlanta','New York'],
  mex: ['Mexico City','Guadalajara','Monterrey'],
  can: ['Toronto','Vancouver'],
}

function venueEloAdjust(teamId: string, venue: string): number {
  let adj = 0
  if (ALTITUDE_VENUES.has(venue)) {
    adj += ALTITUDE_ADAPTED.has(teamId) ? 80 : -120
  }
  if (HEAT_VENUES.has(venue)) {
    if (HEAT_CLIMATE.has(teamId)) adj += 50
    else if (COLD_CLIMATE.has(teamId)) adj -= 60
  }
  // host nation bonus
  for (const [host, venues] of Object.entries(HOST_HOME_VENUES)) {
    if (teamId === host && venues.includes(venue)) {
      adj += host === 'usa' ? 90 : host === 'mex' ? 110 : 80
      break
    }
  }
  return adj
}

// ─── Model B v2: separate attack / defense multipliers per team ──────────────
// Attack  > 1.0 = scores more than Elo predicts at tournaments
// Attack  < 1.0 = scores less
// Defense > 1.0 = concedes less than Elo predicts (harder to score against)
// Defense < 1.0 = concedes more
// Derived from WC 1998-2022 goals-scored/conceded per game relative to Elo tier.
// Default (unlisted teams): 1.0 / 1.0 — neutral, falls back to pure Elo.
// Groups: elite (Elo ≥1900), strong (1750-1899), mid (1600-1749), lower (<1600)
const MODEL_B2_ATTACK: Record<string, number> = {
  // Elite attackers
  fra: 1.14, arg: 1.13, bra: 1.10, esp: 1.09, por: 1.08, ger: 1.07,
  ned: 1.06, nor: 1.06, eng: 1.05, bel: 1.05,
  // Strong attackers
  col: 1.08, jpn: 1.06, ecu: 1.05, sen: 1.04, aus: 1.04, kor: 1.04,
  cro: 1.03, sco: 1.03, uru: 1.02, sui: 1.00,
  // Defensive-style or historically low-scoring at WC
  mar: 0.90, irn: 0.88,
  // Host nations — crowd lift boosts goals scored (applied on top of venue adj)
  usa: 0.97, mex: 1.02, can: 0.96,
  // Mid-tier with clear attacking identity
  alg: 1.02, egy: 0.98, tun: 0.94, gha: 0.98, ksa: 0.94,
  // Lower-tier defaults handled by 1.0 fallback
}
const MODEL_B2_DEFENSE: Record<string, number> = {
  // Elite defenders
  mar: 1.18, fra: 1.10, arg: 1.08, sui: 1.09, uru: 1.07, cro: 1.08,
  esp: 1.07, ger: 1.06, por: 1.04, jpn: 1.07, irn: 1.06,
  // Good defenders
  sen: 1.04, nor: 1.03, col: 1.02, bra: 1.02,
  // Historically leaky at WC despite Elo
  eng: 0.93, bel: 0.90, ned: 0.93, mex: 0.95, aus: 0.96,
  // Host nations — known defensive frailty under pressure
  usa: 0.96, can: 0.95,
  // Lower-tier porous defenses
  hai: 0.82, cpv: 0.84, cur: 0.83, uzb: 0.85, jor: 0.84, nzl: 0.88,
  qat: 0.87, irq: 0.88,
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
  const K = 0.0020
  const BASE = 1.12
  const diff = eloHome - eloAway
  const homeLambda = Math.min(Math.max(BASE * Math.exp(K * diff) + homeAdv / 2, 0.3), 3.0)
  const awayLambda = Math.min(Math.max(BASE * Math.exp(-K * diff) - homeAdv / 2, 0.3), 3.0)
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

    const hVenueAdj = venueEloAdjust(home.id, fixture.venue)
    const aVenueAdj = venueEloAdjust(away.id, fixture.venue)
    const hEloV = home.elo_rating + hVenueAdj
    const aEloV = away.elo_rating + aVenueAdj

    // ── Model A: pure Elo + Poisson + venue ───────────────────────────────
    const { homeLambda: hlA, awayLambda: alA } = poissonGoals(hEloV, aEloV)
    const pA = calcOutcomeProbs(hlA, alA)
    const hwA = shrink(pA.homeWin, 0.10)
    const dwA = shrink(pA.draw, 0.10)
    const awA = shrink(pA.awayWin, 0.10)
    const totA = hwA + dwA + awA
    predictions.push({
      id: `pred-A-${fixture.id}`, fixture_id: fixture.id, model: 'A',
      home_goals: Math.round(hlA * 10) / 10,
      away_goals: Math.round(alA * 10) / 10,
      home_win_prob: Math.round((hwA / totA) * 100) / 100,
      draw_prob: Math.round((dwA / totA) * 100) / 100,
      away_win_prob: Math.round((awA / totA) * 100) / 100,
    })

    // ── Model B v2: attack/defense multipliers × Poisson base + venue ────────
    const hB2Atk = MODEL_B2_ATTACK[home.id] ?? 1.0
    const aB2Def = MODEL_B2_DEFENSE[away.id] ?? 1.0
    const aB2Atk = MODEL_B2_ATTACK[away.id] ?? 1.0
    const hB2Def = MODEL_B2_DEFENSE[home.id] ?? 1.0
    const { homeLambda: hlBraw, awayLambda: alBraw } = poissonGoals(hEloV, aEloV, 0.12)
    const hlB = Math.max(0.3, Math.min(3.0, hlBraw * hB2Atk * (2 - aB2Def)))
    const alB = Math.max(0.3, Math.min(3.0, alBraw * aB2Atk * (2 - hB2Def)))
    const pB = calcOutcomeProbs(hlB, alB)
    const hwB = shrink(pB.homeWin, 0.18)
    const dwB = shrink(pB.draw, 0.18)
    const awB = shrink(pB.awayWin, 0.18)
    const totB = hwB + dwB + awB
    predictions.push({
      id: `pred-B-${fixture.id}`, fixture_id: fixture.id, model: 'B',
      home_goals: Math.round(hlB * 10) / 10,
      away_goals: Math.round(alB * 10) / 10,
      home_win_prob: Math.round((hwB / totB) * 100) / 100,
      draw_prob: Math.round((dwB / totB) * 100) / 100,
      away_win_prob: Math.round((awB / totB) * 100) / 100,
    })

    // ── Model C: market-calibrated base + venue ───────────────────────────
    const hAtk = MODEL_C_ATTACK_BIAS[home.id] ?? 1.0
    const aDef = MODEL_C_DEFENSE_BIAS[away.id] ?? 1.0
    const aAtk = MODEL_C_ATTACK_BIAS[away.id] ?? 1.0
    const hDef = MODEL_C_DEFENSE_BIAS[home.id] ?? 1.0
    const { homeLambda: hlCraw, awayLambda: alCraw } = poissonGoals(
      hEloV, aEloV, 0.10
    )
    const hlC = Math.max(0.3, hlCraw * hAtk * (2 - aDef))
    const alC = Math.max(0.3, alCraw * aAtk * (2 - hDef))
    const pCraw = calcOutcomeProbs(hlC, alC)
    const hw = shrink(pCraw.homeWin, 0.18)
    const dw = shrink(pCraw.draw, 0.18)
    const aw = shrink(pCraw.awayWin, 0.18)
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
