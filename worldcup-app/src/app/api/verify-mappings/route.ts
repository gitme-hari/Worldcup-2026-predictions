// GET /api/verify-mappings
//
// Calls API-Football live and audits every WC26 team mapping.
// Returns: internal_id, internal_name, mapped_api_id, actual_api_name, status
//
// Statuses:
//   verified  — API name matches (case-insensitive contains check)
//   mismatch  — we have an ID but the API name doesn't match the expected team
//   missing   — no ID in our mapping yet (team is in TEAMS_PENDING_VERIFICATION)
//   api_error — could not reach API-Football
//
// Usage: GET /api/verify-mappings in browser while running locally.
// Requires API_FOOTBALL_KEY in environment.

import { NextResponse } from 'next/server'
import { SEED_TEAMS } from '@/lib/seed-data'
import {
  TEAM_API_IDS,
  TEAMS_PENDING_VERIFICATION,
  API_FOOTBALL_LEAGUE_ID,
  API_FOOTBALL_SEASON,
  getMappingConfidence,
  type MappingConfidence,
} from '@/lib/api-football-ids'

// Name aliases — API-Football may use different spellings for some teams
const NAME_ALIASES: Record<string, string[]> = {
  usa:  ['united states'],
  aus:  ['australia'],
  kor:  ['korea republic', 'south korea'],
  irn:  ['iran', 'ir iran'],
  cze:  ['czech', 'czechia'],
  cur:  ['curaçao', 'curacao'],
  civ:  ["côte d'ivoire", "ivory coast", "cote d'ivoire"],
  cod:  ['congo', 'dr congo', 'democratic republic'],
  cpv:  ['cabo verde', 'cape verde'],
  ksa:  ['saudi arabia'],
  rsa:  ['south africa'],
  jpn:  ['japan'],
  sco:  ['scotland'],
  bih:  ['bosnia'],
  hai:  ['haiti'],
  nor:  ['norway'],
  swe:  ['sweden'],
  alg:  ['algeria'],
  uzb:  ['uzbekistan'],
  jor:  ['jordan'],
  nzl:  ['new zealand'],
  pan:  ['panama'],
  gha:  ['ghana'],
  sen:  ['senegal'],
  irq:  ['iraq'],
  aut:  ['austria'],
  uru:  ['uruguay'],
  par:  ['paraguay'],
  col:  ['colombia'],
  ecu:  ['ecuador'],
  tun:  ['tunisia'],
  egy:  ['egypt'],
  mar:  ['morocco'],
  mex:  ['mexico'],
  can:  ['canada'],
  qat:  ['qatar'],
  sui:  ['switzerland'],
}

function nameMatches(apiName: string, internalName: string, internalId: string): boolean {
  const api = apiName.toLowerCase()
  const int = internalName.toLowerCase()
  if (api.includes(int) || int.includes(api)) return true
  const aliases = NAME_ALIASES[internalId] ?? []
  return aliases.some(a => api.includes(a) || a.includes(api))
}

export interface TeamAuditRow {
  internal_id:    string
  internal_name:  string
  confidence:     MappingConfidence
  mapped_api_id:  number | null
  actual_api_name: string | null
  status:         'verified' | 'mismatch' | 'missing' | 'api_error'
  note?:          string
}

export interface VerifyMappingsResponse {
  audited_at:  string
  total:       number
  verified:    number
  mismatches:  number
  missing:     number
  rows:        TeamAuditRow[]
  // API teams not present in our mapping
  unmapped_api_teams: Array<{ api_id: number; api_name: string }>
  errors:      string[]
}

interface ApiTeamsResponse {
  response?: Array<{
    team?: { id?: number; name?: string; code?: string }
  }>
}

export async function GET(): Promise<NextResponse<VerifyMappingsResponse>> {
  const errors: string[] = []
  const rows: TeamAuditRow[] = []

  // Fetch all teams in league=1 season=2026 from API-Football
  const key = process.env.API_FOOTBALL_KEY
  if (!key) {
    return NextResponse.json({
      audited_at: new Date().toISOString(),
      total: 0, verified: 0, mismatches: 0, missing: 0,
      rows: [], unmapped_api_teams: [],
      errors: ['API_FOOTBALL_KEY is not set — add it to .env.local'],
    }, { status: 500 })
  }

  const base = process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io'

  let apiTeamMap: Map<number, string> = new Map()
  try {
    const res = await fetch(
      `${base}/teams?league=${API_FOOTBALL_LEAGUE_ID}&season=${API_FOOTBALL_SEASON}`,
      { headers: { 'x-apisports-key': key }, next: { revalidate: 0 } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: ApiTeamsResponse = await res.json()
    for (const entry of data.response ?? []) {
      const id   = entry.team?.id
      const name = entry.team?.name
      if (id !== undefined && name) apiTeamMap.set(id, name)
    }
    if (apiTeamMap.size === 0) {
      errors.push('API returned 0 teams — league/season may not be populated yet')
    }
  } catch (e) {
    errors.push(`API-Football /teams fetch: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Audit each WC26 team
  const mappedApiIds = new Set<number>()

  for (const team of SEED_TEAMS) {
    const isPending   = TEAMS_PENDING_VERIFICATION.has(team.id)
    const mappedId    = TEAM_API_IDS[team.id] ?? null
    const confidence  = getMappingConfidence(team.id)

    if (isPending || mappedId === null) {
      rows.push({
        internal_id: team.id,
        internal_name: team.name,
        confidence,
        mapped_api_id: null,
        actual_api_name: null,
        status: 'missing',
        note: 'No confirmed API ID — verify manually then update TEAM_API_IDS',
      })
      continue
    }

    if (errors.length > 0 && apiTeamMap.size === 0) {
      // API unavailable — can't verify
      rows.push({
        internal_id: team.id,
        internal_name: team.name,
        confidence,
        mapped_api_id: mappedId,
        actual_api_name: null,
        status: 'api_error',
        note: 'Could not reach API-Football to verify',
      })
      continue
    }

    mappedApiIds.add(mappedId)
    const actualName = apiTeamMap.get(mappedId) ?? null

    if (actualName === null) {
      rows.push({
        internal_id: team.id,
        internal_name: team.name,
        confidence,
        mapped_api_id: mappedId,
        actual_api_name: null,
        status: 'mismatch',
        note: `API ID ${mappedId} not found in league=${API_FOOTBALL_LEAGUE_ID} season=${API_FOOTBALL_SEASON} response`,
      })
    } else if (nameMatches(actualName, team.name, team.id)) {
      rows.push({
        internal_id: team.id,
        internal_name: team.name,
        confidence,
        mapped_api_id: mappedId,
        actual_api_name: actualName,
        status: 'verified',
      })
    } else {
      rows.push({
        internal_id: team.id,
        internal_name: team.name,
        confidence,
        mapped_api_id: mappedId,
        actual_api_name: actualName,
        status: 'mismatch',
        note: `Expected '${team.name}', API returned '${actualName}' for ID ${mappedId}`,
      })
    }
  }

  // API teams not accounted for by our mapping
  const unmapped_api_teams: Array<{ api_id: number; api_name: string }> = []
  for (const [apiId, apiName] of apiTeamMap) {
    if (!mappedApiIds.has(apiId)) {
      unmapped_api_teams.push({ api_id: apiId, api_name: apiName })
    }
  }

  const verified   = rows.filter(r => r.status === 'verified').length
  const mismatches = rows.filter(r => r.status === 'mismatch').length
  const missing    = rows.filter(r => r.status === 'missing').length

  return NextResponse.json({
    audited_at: new Date().toISOString(),
    total: rows.length,
    verified,
    mismatches,
    missing,
    rows: rows.sort((a, b) => {
      const order = { mismatch: 0, missing: 1, api_error: 2, verified: 3 }
      return order[a.status] - order[b.status]
    }),
    unmapped_api_teams,
    errors,
  })
}
