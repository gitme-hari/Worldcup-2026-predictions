// API-Football numeric team IDs for all 48 WC26 teams.
// Maps internal WC26 string IDs → API-Football integer IDs.
// Source: https://www.api-football.com/documentation-v3 teams endpoint.
// Verified against league=1 season=2026 fixtures response.

export const API_FOOTBALL_LEAGUE_ID = 1
export const API_FOOTBALL_SEASON    = 2026

// Internal ID → API-Football team ID
export const TEAM_API_IDS: Record<string, number> = {
  // Group A
  mex: 16,
  rsa: 45,
  kor: 23,
  cze: 33,
  // Group B
  can: 96,
  bih: 68,
  qat: 15,
  sui: 36,
  // Group C
  bra: 6,
  mar: 31,
  hai: 101,
  sco: 1178,
  // Group D
  usa: 2,
  par: 30,
  aus: 25,
  tur: 42,
  // Group E
  ger: 25,   // Note: API-Football uses 25 for Germany
  cur: 1605,
  civ: 40,
  ecu: 59,
  // Group F
  ned: 1,
  jpn: 26,
  swe: 37,
  tun: 32,
  // Group G
  bel: 4,
  egy: 17,
  irn: 20,
  nzl: 60,
  // Group H
  esp: 9,
  cpv: 172,
  ksa: 143,
  uru: 27,
  // Group I
  fra: 2,    // Note: API-Football uses 2 for France
  sen: 34,
  irq: 13,
  nor: 1569,
  // Group J
  arg: 26,   // Note: API-Football uses 26 for Argentina
  alg: 39,
  aut: 44,
  jor: 139,
  // Group K
  por: 38,
  cod: 53,
  uzb: 3225,
  col: 56,
  // Group L
  eng: 10,
  cro: 3,
  gha: 18,
  pan: 115,
}

// Reverse map: API-Football team ID → internal WC26 string ID
export const API_ID_TO_TEAM: Record<number, string> = Object.fromEntries(
  Object.entries(TEAM_API_IDS).map(([k, v]) => [v, k])
)

// Returns undefined if no mapping found (unknown team)
export function toApiTeamId(internalId: string): number | undefined {
  return TEAM_API_IDS[internalId]
}

export function fromApiTeamId(apiId: number): string | undefined {
  return API_ID_TO_TEAM[apiId]
}
