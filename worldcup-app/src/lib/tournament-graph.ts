// Tournament graph resolver.
// Pure function — no localStorage, no side effects.
// Takes the static knockout fixture definitions and an array of recorded results,
// walks the graph in topological order (R32 → R16 → QF → SF → Final),
// and returns the full resolved fixture list with team IDs propagated.

import type { SeedFixture } from './seed-data'

interface Result {
  fixture_id: string
  home_goals: number
  away_goals: number
}

// Resolve the tournament state from recorded results.
// KNOCKOUT_FIXTURES must be ordered topologically (parents before children).
export function resolveTournament(
  fixtures: SeedFixture[],
  results: Result[],
): SeedFixture[] {
  const resultMap = new Map(results.map(r => [r.fixture_id, r]))

  // Start with a mutable copy of every fixture
  const resolved = new Map(fixtures.map(f => [f.id, { ...f }]))

  for (const fixture of fixtures) {
    const result = resultMap.get(fixture.id)
    if (!result) continue

    const current = resolved.get(fixture.id)!
    const homeId = current.home_team_id
    const awayId = current.away_team_id
    if (!homeId || !awayId) continue

    // Knockout matches cannot end in a draw — guard for malformed data
    if (result.home_goals === result.away_goals) continue

    const winnerId = result.home_goals > result.away_goals ? homeId : awayId
    const loserId  = result.home_goals > result.away_goals ? awayId : homeId

    if (fixture.winnerAdvancesTo) {
      const target = resolved.get(fixture.winnerAdvancesTo.fixture)
      if (target) {
        if (fixture.winnerAdvancesTo.slot === 'home') target.home_team_id = winnerId
        else target.away_team_id = winnerId
      }
    }

    if (fixture.loserAdvancesTo) {
      const target = resolved.get(fixture.loserAdvancesTo.fixture)
      if (target) {
        if (fixture.loserAdvancesTo.slot === 'home') target.home_team_id = loserId
        else target.away_team_id = loserId
      }
    }
  }

  return fixtures.map(f => resolved.get(f.id)!)
}

// Returns the winner team ID for a fixture given results, or null if no result / draw.
export function resolveWinner(fixtureId: string, results: Result[], fixtures: SeedFixture[]): string | null {
  const result = results.find(r => r.fixture_id === fixtureId)
  if (!result || result.home_goals === result.away_goals) return null
  const fixture = fixtures.find(f => f.id === fixtureId)
  if (!fixture) return null
  return result.home_goals > result.away_goals ? fixture.home_team_id : fixture.away_team_id
}
