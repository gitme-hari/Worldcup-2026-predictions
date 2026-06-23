import { NextRequest, NextResponse } from 'next/server'
import type { MatchContext, FormEntry, LineupStatus } from '@/lib/match-context'
import type { TeamIntelligence } from '@/lib/team-intelligence'
import {
  API_FOOTBALL_LEAGUE_ID,
  API_FOOTBALL_SEASON,
  TEAM_API_IDS,
  fromApiTeamId,
} from '@/lib/api-football-ids'

// ── API-Football client helpers ───────────────────────────────────────────────

const BASE_URL = process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io'

async function apiFetch<T = unknown>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY is not set')

  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'x-apisports-key': key },
    // Next.js 16 fetch caching: revalidate every 4 hours by default.
    // Individual calls override this where needed.
    next: { revalidate: 14400 },
  })

  if (!res.ok) {
    throw new Error(`API-Football ${path} → HTTP ${res.status}`)
  }

  const json = await res.json()
  return json as T
}

// ── Response shape ─────────────────────────────────────────────────────────────

export interface FixtureIntelligenceResponse {
  // Populated for type=context
  context?: MatchContext
  // Populated for type=teamstats and type=standings
  teamIntelligence?: TeamIntelligence[]
  // Always present
  requestedAt: string
  errors: string[]
}

// ── Query param types ─────────────────────────────────────────────────────────

type QueryType = 'context' | 'teamstats' | 'standings'

// ── Parsers ───────────────────────────────────────────────────────────────────

// Parse API-Football injuries response into absence + suspension arrays
function parseInjuries(
  injuriesResponse: ApiInjuriesResponse,
  homeApiId: number,
  awayApiId: number,
): {
  homeAbsences: string[]
  awayAbsences: string[]
  homeSuspensions: string[]
  awaySuspensions: string[]
} {
  const homeAbsences: string[] = []
  const awayAbsences: string[] = []
  const homeSuspensions: string[] = []
  const awaySuspensions: string[] = []

  for (const entry of injuriesResponse.response ?? []) {
    const teamId  = entry.team?.id
    const name    = entry.player?.name ?? 'Unknown'
    const type    = (entry.type ?? '').toLowerCase()
    const isSusp  = type.includes('suspend') || type.includes('yellow card') || type.includes('ban')

    if (teamId === homeApiId) {
      if (isSusp) homeSuspensions.push(name)
      else homeAbsences.push(name)
    } else if (teamId === awayApiId) {
      if (isSusp) awaySuspensions.push(name)
      else awayAbsences.push(name)
    }
  }

  return { homeAbsences, awayAbsences, homeSuspensions, awaySuspensions }
}

// Parse API-Football lineups response
function parseLineups(
  lineupsResponse: ApiLineupsResponse,
  homeApiId: number,
  awayApiId: number,
): {
  homeStartXI: string[]
  awayStartXI: string[]
  homeFormation: string | undefined
  awayFormation: string | undefined
  homeCoach: string | undefined
  awayCoach: string | undefined
  homeStatus: LineupStatus
  awayStatus: LineupStatus
} {
  const empty = {
    homeStartXI: [], awayStartXI: [],
    homeFormation: undefined, awayFormation: undefined,
    homeCoach: undefined, awayCoach: undefined,
    homeStatus: 'unknown' as LineupStatus, awayStatus: 'unknown' as LineupStatus,
  }

  const items = lineupsResponse.response ?? []
  if (items.length === 0) return empty

  const homeItem = items.find(i => i.team?.id === homeApiId)
  const awayItem = items.find(i => i.team?.id === awayApiId)

  function extractXI(item: ApiLineupItem | undefined): string[] {
    if (!item) return []
    return (item.startXI ?? []).map(p => p.player?.name ?? '').filter(Boolean)
  }

  const homeXI = extractXI(homeItem)
  const awayXI = extractXI(awayItem)

  return {
    homeStartXI:  homeXI,
    awayStartXI:  awayXI,
    homeFormation: homeItem?.formation,
    awayFormation: awayItem?.formation,
    homeCoach:    homeItem?.coach?.name,
    awayCoach:    awayItem?.coach?.name,
    homeStatus:   homeXI.length > 0 ? 'confirmed' : 'unknown',
    awayStatus:   awayXI.length > 0 ? 'confirmed' : 'unknown',
  }
}

// Parse API-Football form string "WWDLW" into FormEntry[]
function parseFormEntries(formStr: string): FormEntry[] {
  return formStr
    .split('')
    .filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L')
    .map(result => ({ result, goals_for: 0, goals_against: 0 }))
}

// ── Handler: context (injuries + lineups for a single fixture) ────────────────

async function handleContext(
  fixtureId: string,
  errors: string[],
): Promise<MatchContext | undefined> {
  // Look up the fixture's home/away API team IDs from our seed fixture id.
  // The fixture id format is e.g. "group-A-m1".
  // We need the actual API-Football fixture id — fetch it from /fixtures.
  let apiFixtureId: number | undefined
  let homeApiId: number | undefined
  let awayApiId: number | undefined
  let venueName: string | undefined
  let venueCity: string | undefined
  let venueCapacity: number | undefined

  try {
    const fixturesRes = await apiFetch<ApiFixturesResponse>(
      `/fixtures?league=${API_FOOTBALL_LEAGUE_ID}&season=${API_FOOTBALL_SEASON}`
    )
    // Find the fixture by matching team IDs derived from our internal fixture id.
    // Internal fixture ids encode team ids in the seed data; we look up both sides.
    // Fallback: match by date proximity if needed. For now match by team ids.
    const allFixtures = fixturesRes.response ?? []

    // We need home/away internal team ids from the fixture id.
    // Since this route only receives our internal fixture id string, we import
    // SEED_FIXTURES to resolve team ids server-side.
    const { SEED_FIXTURES } = await import('@/lib/seed-data')
    const seedFixture = SEED_FIXTURES.find(f => f.id === fixtureId)
    if (!seedFixture) {
      errors.push(`fixture not found in seed data: ${fixtureId}`)
      return undefined
    }

    homeApiId = TEAM_API_IDS[seedFixture.home_team_id]
    awayApiId = TEAM_API_IDS[seedFixture.away_team_id]

    if (!homeApiId || !awayApiId) {
      errors.push(`no API-Football ID mapping for ${seedFixture.home_team_id} or ${seedFixture.away_team_id}`)
      return undefined
    }

    // Find matching fixture: both team IDs present in the match
    const match = allFixtures.find(f => {
      const ids = [f.teams?.home?.id, f.teams?.away?.id]
      return ids.includes(homeApiId!) && ids.includes(awayApiId!)
    })

    if (match) {
      apiFixtureId  = match.fixture?.id
      venueName     = match.fixture?.venue?.name
      venueCity     = match.fixture?.venue?.city
      venueCapacity = match.fixture?.venue?.capacity
    } else {
      errors.push(`no API-Football fixture found matching ${fixtureId}`)
    }
  } catch (e) {
    errors.push(`fixtures fetch: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Injuries (bulk league query — one request for all current injuries)
  let homeAbsences: string[] = []
  let awayAbsences: string[] = []
  let homeSuspensions: string[] = []
  let awaySuspensions: string[] = []

  if (homeApiId && awayApiId) {
    try {
      const injuriesPath = apiFixtureId
        ? `/injuries?fixture=${apiFixtureId}`
        : `/injuries?league=${API_FOOTBALL_LEAGUE_ID}&season=${API_FOOTBALL_SEASON}`

      const injuriesRes = await apiFetch<ApiInjuriesResponse>(
        // Per-fixture injuries uses short revalidation; bulk uses 4h
        injuriesPath
      )
      const parsed = parseInjuries(injuriesRes, homeApiId, awayApiId)
      homeAbsences    = parsed.homeAbsences
      awayAbsences    = parsed.awayAbsences
      homeSuspensions = parsed.homeSuspensions
      awaySuspensions = parsed.awaySuspensions
    } catch (e) {
      errors.push(`injuries fetch: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Lineups (only available ~60 min before kickoff)
  let homeStartXI: string[] = []
  let awayStartXI: string[] = []
  let homeFormation: string | undefined
  let awayFormation: string | undefined
  let homeCoach: string | undefined
  let awayCoach: string | undefined
  let homeLineupStatus: LineupStatus = 'unknown'
  let awayLineupStatus: LineupStatus = 'unknown'

  if (apiFixtureId && homeApiId && awayApiId) {
    try {
      const lineupsRes = await apiFetch<ApiLineupsResponse>(
        `/fixtures/lineups?fixture=${apiFixtureId}`
      )
      const parsed = parseLineups(lineupsRes, homeApiId, awayApiId)
      homeStartXI     = parsed.homeStartXI
      awayStartXI     = parsed.awayStartXI
      homeFormation   = parsed.homeFormation
      awayFormation   = parsed.awayFormation
      homeCoach       = parsed.homeCoach
      awayCoach       = parsed.awayCoach
      homeLineupStatus = parsed.homeStatus
      awayLineupStatus = parsed.awayStatus
    } catch (e) {
      errors.push(`lineups fetch: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const ctx: MatchContext = {
    fixture_id:           fixtureId,
    source:               'api-football',
    fetched_at:           new Date().toISOString(),
    home_lineup_status:   homeLineupStatus,
    away_lineup_status:   awayLineupStatus,
    home_absences:        homeAbsences,
    away_absences:        awayAbsences,
    home_suspensions:     homeSuspensions,
    away_suspensions:     awaySuspensions,
    home_startXI:         homeStartXI.length > 0 ? homeStartXI : undefined,
    away_startXI:         awayStartXI.length > 0 ? awayStartXI : undefined,
    home_formation:       homeFormation,
    away_formation:       awayFormation,
    home_coach:           homeCoach,
    away_coach:           awayCoach,
    home_form:            [],
    away_form:            [],
    venue_name:           venueName,
    venue_city:           venueCity,
    venue_capacity:       venueCapacity,
    impact_signal:        'none',
    impact_notes:         [],
  }

  return ctx
}

// ── Handler: standings (form + goals for all teams) ───────────────────────────

async function handleStandings(errors: string[]): Promise<TeamIntelligence[]> {
  const results: TeamIntelligence[] = []

  try {
    const res = await apiFetch<ApiStandingsResponse>(
      `/standings?league=${API_FOOTBALL_LEAGUE_ID}&season=${API_FOOTBALL_SEASON}`
    )

    const groups = res.response?.[0]?.league?.standings ?? []

    for (const group of groups) {
      for (const entry of group) {
        const apiTeamId  = entry.team?.id
        if (apiTeamId === undefined) continue
        const internalId = fromApiTeamId(apiTeamId)
        if (!internalId) continue

        const all      = entry.all ?? {}
        const played   = all.played ?? 0
        const goalsFor = all.goals?.for ?? 0
        const goalsAga = all.goals?.against ?? 0
        const formStr  = entry.form ?? ''
        const homeForm = parseFormEntries(formStr)

        results.push({
          team_id:            internalId,
          api_team_id:        apiTeamId,
          fetched_at:         new Date().toISOString(),
          tournament_form:    formStr,
          goals_for:          goalsFor,
          goals_against:      goalsAga,
          goals_for_avg:      played > 0 ? Math.round((goalsFor / played) * 100) / 100 : 0,
          goals_against_avg:  played > 0 ? Math.round((goalsAga / played) * 100) / 100 : 0,
          matches_played:     played,
          points:             entry.points ?? 0,
          rank_in_group:      entry.rank ?? 0,
        })

        void homeForm // form entries used by callers, not stored here
      }
    }
  } catch (e) {
    errors.push(`standings fetch: ${e instanceof Error ? e.message : String(e)}`)
  }

  return results
}

// ── Handler: teamstats (goals averages for one or all teams) ──────────────────

async function handleTeamStats(
  teamId: string | null,
  errors: string[],
): Promise<TeamIntelligence[]> {
  const teamIds = teamId
    ? [teamId]
    : Object.keys(TEAM_API_IDS)

  const results: TeamIntelligence[] = []

  for (const id of teamIds) {
    const apiId = TEAM_API_IDS[id]
    if (!apiId) continue

    try {
      const res = await apiFetch<ApiTeamStatsResponse>(
        `/teams/statistics?team=${apiId}&league=${API_FOOTBALL_LEAGUE_ID}&season=${API_FOOTBALL_SEASON}`
      )
      const s = res.response
      if (!s) continue

      const played     = s.fixtures?.played?.total ?? 0
      const goalsFor   = s.goals?.for?.total?.total ?? 0
      const goalsAga   = s.goals?.against?.total?.total ?? 0
      const homeGF     = s.goals?.for?.average?.home
      const awayGF     = s.goals?.for?.average?.away
      const cleanShts  = s.clean_sheet?.total ?? 0
      const failedScr  = s.failed_to_score?.total ?? 0

      results.push({
        team_id:            id,
        api_team_id:        apiId,
        fetched_at:         new Date().toISOString(),
        tournament_form:    '',
        goals_for:          goalsFor,
        goals_against:      goalsAga,
        goals_for_avg:      played > 0 ? Math.round((goalsFor / played) * 100) / 100 : 0,
        goals_against_avg:  played > 0 ? Math.round((goalsAga / played) * 100) / 100 : 0,
        matches_played:     played,
        points:             0,
        rank_in_group:      0,
        home_goals_for_avg: homeGF !== undefined ? parseFloat(homeGF) : undefined,
        away_goals_for_avg: awayGF !== undefined ? parseFloat(awayGF) : undefined,
        clean_sheets:       cleanShts,
        failed_to_score:    failedScr,
      })
    } catch (e) {
      errors.push(`teamstats ${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return results
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<FixtureIntelligenceResponse>> {
  const { searchParams } = request.nextUrl
  const type     = (searchParams.get('type') ?? 'context') as QueryType
  const fixture  = searchParams.get('fixture')
  const team     = searchParams.get('team')

  const errors: string[] = []
  const response: FixtureIntelligenceResponse = {
    requestedAt: new Date().toISOString(),
    errors,
  }

  if (type === 'context') {
    if (!fixture) {
      errors.push('fixture param is required for type=context')
      return NextResponse.json(response, { status: 400 })
    }
    response.context = await handleContext(fixture, errors)
  } else if (type === 'standings') {
    response.teamIntelligence = await handleStandings(errors)
  } else if (type === 'teamstats') {
    response.teamIntelligence = await handleTeamStats(team, errors)
  } else {
    errors.push(`unknown type: ${type}`)
    return NextResponse.json(response, { status: 400 })
  }

  return NextResponse.json(response)
}

// ── API-Football response types (structural, not exhaustive) ──────────────────

interface ApiFixturesResponse {
  response?: Array<{
    fixture?: {
      id?: number
      venue?: { name?: string; city?: string; capacity?: number }
    }
    teams?: {
      home?: { id?: number; name?: string }
      away?: { id?: number; name?: string }
    }
  }>
}

interface ApiInjuriesResponse {
  response?: Array<{
    player?: { id?: number; name?: string }
    team?:   { id?: number; name?: string }
    fixture?: { id?: number }
    type?:   string
    reason?: string
  }>
}

interface ApiLineupItem {
  team?:       { id?: number; name?: string }
  formation?:  string
  coach?:      { id?: number; name?: string }
  startXI?:    Array<{ player?: { id?: number; name?: string; grid?: string } }>
  substitutes?: Array<{ player?: { id?: number; name?: string } }>
}

interface ApiLineupsResponse {
  response?: ApiLineupItem[]
}

interface ApiStandingEntry {
  rank?:   number
  team?:   { id: number; name?: string }
  points?: number
  form?:   string
  all?:    {
    played?: number
    goals?:  { for?: number; against?: number }
  }
}

interface ApiStandingsResponse {
  response?: Array<{
    league?: {
      standings?: ApiStandingEntry[][]
    }
  }>
}

interface ApiTeamStatsResponse {
  response?: {
    fixtures?: { played?: { total?: number } }
    goals?: {
      for?:     { total?: { total?: number }; average?: { home?: string; away?: string; total?: string } }
      against?: { total?: { total?: number }; average?: { home?: string; away?: string; total?: string } }
    }
    clean_sheet?:     { total?: number }
    failed_to_score?: { total?: number }
  }
}
