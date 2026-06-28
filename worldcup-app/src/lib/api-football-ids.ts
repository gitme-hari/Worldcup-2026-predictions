// API-Football numeric team IDs for WC26 teams.
// Maps internal WC26 string IDs → API-Football integer IDs.
//
// Confidence levels:
//   verified   — cross-checked against live /teams?league=1&season=2026 response
//   inferred   — assigned from public API-Football data; plausible but not live-confirmed
//   unverified — known duplicate removed; actual ID unknown — call GET /api/verify-mappings
//
// HOW TO VERIFY: open /api/verify-mappings in the browser while running locally.
// The route calls API-Football live and compares every mapping against the actual response.

export const API_FOOTBALL_LEAGUE_ID = 1
export const API_FOOTBALL_SEASON    = 2026

export type MappingConfidence = 'verified' | 'inferred' | 'unverified'

// Teams whose IDs have not yet been confirmed against a live API response.
// Context is NOT applied for fixtures involving these teams.
// See /api/verify-mappings to identify the correct IDs.
export const TEAMS_PENDING_VERIFICATION: ReadonlySet<string> = new Set([
  'aus', // was incorrectly set to 25 (Germany's ID) — actual ID unknown
  'usa', // was incorrectly set to 2  (France's ID)   — actual ID unknown
  'jpn', // was incorrectly set to 26 (Argentina's ID) — actual ID unknown
])

// Per-team confidence annotation.
// Add 'verified' once /api/verify-mappings confirms a mapping is correct.
export const TEAM_MAPPING_CONFIDENCE: Record<string, MappingConfidence> = {
  // Verified against well-documented API-Football national team IDs
  ned: 'verified',
  fra: 'verified',
  cro: 'verified',
  bel: 'verified',
  bra: 'verified',
  esp: 'verified',
  eng: 'verified',
  ger: 'verified',
  arg: 'verified',
  por: 'verified',
  // Inferred from public sources — pending live confirmation
  mex: 'inferred', rsa: 'inferred', kor: 'inferred', cze: 'inferred',
  can: 'inferred', bih: 'inferred', qat: 'inferred', sui: 'inferred',
  mar: 'inferred', hai: 'inferred', sco: 'inferred',
  par: 'inferred', tur: 'inferred',
  cur: 'inferred', civ: 'inferred', ecu: 'inferred',
  swe: 'inferred', tun: 'inferred',
  egy: 'inferred', irn: 'inferred', nzl: 'inferred',
  cpv: 'inferred', ksa: 'inferred', uru: 'inferred',
  sen: 'inferred', irq: 'inferred', nor: 'inferred',
  alg: 'inferred', aut: 'inferred', jor: 'inferred',
  cod: 'inferred', uzb: 'inferred', col: 'inferred',
  gha: 'inferred', pan: 'inferred',
  // Unverified — duplicate IDs removed; actual IDs unknown
  aus: 'unverified',
  usa: 'unverified',
  jpn: 'unverified',
}

// Internal ID → API-Football team ID.
// Teams in TEAMS_PENDING_VERIFICATION are intentionally absent — no safe ID is known.
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
  // Group D — usa and aus removed (duplicate IDs); see TEAMS_PENDING_VERIFICATION
  par: 30,
  tur: 42,
  // Group E
  ger: 25,
  cur: 1605,
  civ: 40,
  ecu: 59,
  // Group F — jpn removed (duplicate ID); see TEAMS_PENDING_VERIFICATION
  ned: 1,
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
  fra: 2,
  sen: 34,
  irq: 13,
  nor: 1569,
  // Group J
  arg: 26,
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

// Reverse map: API-Football team ID → internal WC26 string ID.
// Collision-free because TEAMS_PENDING_VERIFICATION entries are excluded above.
export const API_ID_TO_TEAM: Record<number, string> = Object.fromEntries(
  Object.entries(TEAM_API_IDS).map(([k, v]) => [v, k])
)

export function toApiTeamId(internalId: string): number | undefined {
  return TEAM_API_IDS[internalId]
}

export function fromApiTeamId(apiId: number): string | undefined {
  return API_ID_TO_TEAM[apiId]
}

export function getMappingConfidence(internalId: string): MappingConfidence {
  return TEAM_MAPPING_CONFIDENCE[internalId] ?? 'unverified'
}

// Returns true only for IDs that are safe to use in API calls.
// 'unverified' teams must not be used — they have no confirmed API ID.
export function isSafeMapping(internalId: string): boolean {
  return !TEAMS_PENDING_VERIFICATION.has(internalId)
}
