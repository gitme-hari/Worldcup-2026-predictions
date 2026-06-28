// Match context types, provider interface, and localStorage persistence.
// Provider interface is designed for future API integration — no credentials needed yet.

export interface FormEntry {
  result: 'W' | 'D' | 'L'
  goals_for: number
  goals_against: number
  opponent?: string
}

export type LineupStatus = 'unknown' | 'probable' | 'confirmed'

export type ImpactSignal =
  | 'none'
  | 'increase_home_goals'
  | 'increase_away_goals'
  | 'lower_confidence'
  | 'consider_alternative'

export interface MatchContext {
  fixture_id: string
  source: 'manual' | 'api-football' | 'sportmonks' | 'football-data' | 'thestats'
  fetched_at: string

  // Lineups
  home_lineup_status: LineupStatus
  away_lineup_status: LineupStatus
  home_absences: string[]
  away_absences: string[]

  // Confirmed starting XI (populated from /fixtures/lineups when available)
  home_startXI?: string[]
  away_startXI?: string[]
  home_formation?: string   // e.g. "4-3-3"
  away_formation?: string
  home_coach?: string
  away_coach?: string

  // Suspensions tracked separately from injuries
  home_suspensions?: string[]
  away_suspensions?: string[]

  // Recent form (last 5, reverse chronological)
  home_form: FormEntry[]
  away_form: FormEntry[]

  // Venue
  venue_name?: string
  venue_city?: string
  venue_capacity?: number
  venue_indoor?: boolean
  venue_altitude_m?: number

  // Weather
  weather_temp_c?: number
  weather_condition?: string

  // Engine annotation
  impact_signal: ImpactSignal
  impact_notes: string[]
}

// Wire up future providers by implementing this interface.
// Each provider is responsible for mapping its API response to MatchContext.
export interface MatchContextProvider {
  readonly id: MatchContext['source']
  fetch(fixtureId: string): Promise<MatchContext>
}

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = 'wc26_match_context'

function loadAll(): MatchContext[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function persistAll(all: MatchContext[]) {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getMatchContext(fixtureId: string): MatchContext | undefined {
  return loadAll().find(c => c.fixture_id === fixtureId)
}

export function saveMatchContext(ctx: MatchContext): void {
  persistAll([...loadAll().filter(c => c.fixture_id !== ctx.fixture_id), ctx])
}

export function clearMatchContext(fixtureId: string): void {
  persistAll(loadAll().filter(c => c.fixture_id !== fixtureId))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const IMPACT_LABELS: Record<ImpactSignal, string> = {
  none:                 'No adjustment',
  increase_home_goals:  'Increase home goals',
  increase_away_goals:  'Increase away goals',
  lower_confidence:     'Lower confidence',
  consider_alternative: 'Consider alternative scoreline',
}

export function formSummary(entries: FormEntry[]): { str: string; gf: number; ga: number } {
  return {
    str: entries.map(e => e.result).join(' '),
    gf:  entries.reduce((s, e) => s + e.goals_for, 0),
    ga:  entries.reduce((s, e) => s + e.goals_against, 0),
  }
}

export function emptyContext(fixtureId: string): MatchContext {
  return {
    fixture_id: fixtureId,
    source: 'manual',
    fetched_at: new Date().toISOString(),
    home_lineup_status: 'unknown',
    away_lineup_status: 'unknown',
    home_absences: [],
    away_absences: [],
    home_form: [],
    away_form: [],
    impact_signal: 'none',
    impact_notes: [],
  }
}
