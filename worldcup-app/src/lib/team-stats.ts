// Derives group standings, tournament form, and qualification status
// purely from locally entered results + seed fixtures — no API calls needed.

import type { SeedFixture } from './seed-data'
import type { FormEntry } from './match-context'

export interface GroupStanding {
  teamId: string
  position: number  // 1–4 within the group
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

// WC2026: 12 groups of 4. Top 2 qualify automatically.
// 8 best 3rd-place teams also advance, but we track 3rd as 'pending'.
export type QualificationStatus =
  | 'qualified'            // Guaranteed top 2, all 3 games done
  | 'likely_qualified'     // Currently top 2, games remain
  | 'rotation_risk'        // Top 2 secured, this is their matchday 3
  | 'third_place_pending'  // Finished 3rd — awaits best-3rd ranking across groups
  | 'must_win'             // 3pts needed to stay alive
  | 'must_not_lose'        // A draw may be enough; a loss likely eliminates
  | 'eliminated'           // Mathematically out
  | 'unknown'              // No games played yet — no status to derive

interface Result {
  fixture_id: string
  home_goals: number
  away_goals: number
}

// Returns standings per group letter, sorted by position (pts desc, gd desc, gf desc).
// All four group teams appear even when they have 0 games played.
export function computeGroupStandings(
  fixtures: SeedFixture[],
  results: Result[],
): Record<string, GroupStanding[]> {
  const resultMap = new Map(results.map(r => [r.fixture_id, r]))

  // Collect all teams per group
  const groupTeams: Record<string, string[]> = {}
  for (const fix of fixtures) {
    if (!groupTeams[fix.group]) groupTeams[fix.group] = []
    if (!groupTeams[fix.group].includes(fix.home_team_id)) groupTeams[fix.group].push(fix.home_team_id)
    if (!groupTeams[fix.group].includes(fix.away_team_id)) groupTeams[fix.group].push(fix.away_team_id)
  }

  // Accumulate match records
  const records: Record<string, Record<string, { w: number; d: number; l: number; gf: number; ga: number }>> = {}
  for (const fix of fixtures) {
    const r = resultMap.get(fix.id)
    if (!r) continue
    const g = fix.group
    if (!records[g]) records[g] = {}
    for (const [tid, gf, ga] of [
      [fix.home_team_id, r.home_goals, r.away_goals],
      [fix.away_team_id, r.away_goals, r.home_goals],
    ] as [string, number, number][]) {
      if (!records[g][tid]) records[g][tid] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
      const rec = records[g][tid]
      rec.gf += gf; rec.ga += ga
      if (gf > ga) rec.w++
      else if (gf === ga) rec.d++
      else rec.l++
    }
  }

  const out: Record<string, GroupStanding[]> = {}
  for (const [group, teams] of Object.entries(groupTeams)) {
    const rows = teams.map(teamId => {
      const rec = records[group]?.[teamId] ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
      return {
        teamId,
        position: 0,
        played: rec.w + rec.d + rec.l,
        won: rec.w,
        drawn: rec.d,
        lost: rec.l,
        gf: rec.gf,
        ga: rec.ga,
        gd: rec.gf - rec.ga,
        pts: rec.w * 3 + rec.d,
      }
    })
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    rows.forEach((r, i) => { r.position = i + 1 })
    out[group] = rows
  }
  return out
}

// Tournament form for a team — most recent first, from locally entered results.
export function deriveInTournamentForm(
  teamId: string,
  fixtures: SeedFixture[],
  results: Result[],
): FormEntry[] {
  const resultMap = new Map(results.map(r => [r.fixture_id, r]))
  const played = fixtures
    .filter(f => (f.home_team_id === teamId || f.away_team_id === teamId) && resultMap.has(f.id))
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  return played
    .map(fix => {
      const r = resultMap.get(fix.id)!
      const isHome = fix.home_team_id === teamId
      const gf = isHome ? r.home_goals : r.away_goals
      const ga = isHome ? r.away_goals : r.home_goals
      return { result: gf > ga ? 'W' as const : gf < ga ? 'L' as const : 'D' as const, goals_for: gf, goals_against: ga }
    })
    .reverse()
}

// Qualification status for a team given current group standings before the specified matchday.
export function computeQualificationStatus(
  teamId: string,
  groupStandings: GroupStanding[],
  matchday: number,
): QualificationStatus {
  const team = groupStandings.find(s => s.teamId === teamId)
  if (!team || team.played === 0) return 'unknown'

  // All group games completed
  if (team.played >= 3) {
    if (team.position <= 2) return 'qualified'
    if (team.position === 3) return 'third_place_pending'
    return 'eliminated'
  }

  // Top 2 already with matchday 3 upcoming → rotation risk
  if (team.position <= 2 && matchday === 3) return 'rotation_risk'

  // Comfortably top 2, games remain
  if (team.position <= 2) return 'likely_qualified'

  // 3rd or 4th — check if top 2 is still reachable
  const gamesLeft = 1 + (3 - matchday)  // this fixture + remaining
  const maxPts = team.pts + gamesLeft * 3
  const secondPlace = groupStandings.find(s => s.position === 2)

  if (secondPlace && secondPlace.pts > maxPts) return 'eliminated'

  if (team.position === 4) {
    const thirdPlace = groupStandings.find(s => s.position === 3)
    if (thirdPlace && thirdPlace.pts > maxPts) return 'eliminated'
    return 'must_win'
  }

  // 3rd place — could a draw be enough?
  if (secondPlace && team.pts + 1 >= secondPlace.pts) return 'must_not_lose'
  return 'must_win'
}

export const QUAL_STATUS_LABEL: Record<QualificationStatus, string> = {
  qualified:           'Qualified ✓',
  likely_qualified:    'Likely qualified',
  rotation_risk:       'Rotation risk — may rest starters',
  third_place_pending: 'Third place — awaits best-3rd ranking',
  must_win:            'Must win to stay alive',
  must_not_lose:       'Must avoid defeat',
  eliminated:          'Eliminated',
  unknown:             '',
}

export const QUAL_STATUS_CLS: Record<QualificationStatus, string> = {
  qualified:           'text-emerald-700 bg-emerald-50',
  likely_qualified:    'text-emerald-600 bg-emerald-50',
  rotation_risk:       'text-amber-700 bg-amber-50',
  third_place_pending: 'text-blue-700 bg-blue-50',
  must_win:            'text-red-700 bg-red-50',
  must_not_lose:       'text-amber-700 bg-amber-50',
  eliminated:          'text-zinc-500 bg-zinc-100',
  unknown:             'text-zinc-400 bg-zinc-50',
}
