// Per-team tournament intelligence derived from API-Football /standings and /teams/statistics.
// Separate from MatchContext (which is per-fixture).
// All reads/writes are localStorage-only; never touches Supabase.

export interface TeamIntelligence {
  team_id: string         // WC26 internal id e.g. 'eng'
  api_team_id: number     // API-Football numeric id e.g. 10
  fetched_at: string      // ISO 8601

  // From /standings — tournament form so far
  tournament_form: string   // e.g. "WWDLW" oldest→newest
  goals_for: number         // total in this tournament
  goals_against: number
  goals_for_avg: number     // per match played
  goals_against_avg: number
  matches_played: number
  points: number
  rank_in_group: number

  // From /teams/statistics — optional enrichment
  home_goals_for_avg?: number
  away_goals_for_avg?: number
  clean_sheets?: number
  failed_to_score?: number
}

const KEY = 'wc26_team_intel'

function loadAll(): TeamIntelligence[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function persistAll(all: TeamIntelligence[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getTeamIntelligence(teamId: string): TeamIntelligence | undefined {
  return loadAll().find(t => t.team_id === teamId)
}

export function getAllTeamIntelligence(): TeamIntelligence[] {
  return loadAll()
}

export function saveTeamIntelligence(intel: TeamIntelligence): void {
  persistAll([...loadAll().filter(t => t.team_id !== intel.team_id), intel])
}

export function clearTeamIntelligence(teamId: string): void {
  persistAll(loadAll().filter(t => t.team_id !== teamId))
}

export function clearAllTeamIntelligence(): void {
  persistAll([])
}

// Staleness check — true if data is older than maxAgeMs
export function isStale(intel: TeamIntelligence, maxAgeMs: number): boolean {
  return Date.now() - new Date(intel.fetched_at).getTime() > maxAgeMs
}

// Parse a form string "WWDLW" into a typed array
export function parseFormString(form: string): Array<'W' | 'D' | 'L'> {
  return form.split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L')
}

// Summarise form: { w, d, l, pts }
export function formSummary(form: string): { w: number; d: number; l: number; pts: number } {
  const parsed = parseFormString(form)
  const w = parsed.filter(r => r === 'W').length
  const d = parsed.filter(r => r === 'D').length
  const l = parsed.filter(r => r === 'L').length
  return { w, d, l, pts: w * 3 + d }
}
