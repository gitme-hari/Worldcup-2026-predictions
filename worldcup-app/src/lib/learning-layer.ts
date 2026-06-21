// Lightweight learning layer — adapts predictions as tournament progresses.
// All math is explicit and inspectable; no black-box retraining.

import type { SeedFixture, SeedPrediction, SeedTeam } from './seed-data'
import type { ActualResult } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchContribution {
  fixtureId: string
  opponent: string
  matchday: number
  weight: number
  actualScored: number
  expectedScored: number
  actualConceded: number
  expectedConceded: number
}

export interface TeamAdjustment {
  teamId: string
  teamName: string
  teamCode: string
  flag: string
  // Ratio: 1.0 = baseline, 1.2 = +20%, 0.9 = -10%
  attackFactor: number
  defenceFactor: number
  confidence: 'High' | 'Medium' | 'Low'
  matchesPlayed: number
  contributions: MatchContribution[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Average xG across available models for a team in a fixture
function avgExpected(
  preds: SeedPrediction[],
  fixtureId: string,
  side: 'home' | 'away',
): number {
  const fp = preds.filter(p => p.fixture_id === fixtureId)
  if (fp.length === 0) return 1 // neutral fallback
  const total = fp.reduce(
    (s, p) => s + (side === 'home' ? p.home_goals : p.away_goals),
    0,
  )
  return total / fp.length
}

// Recent-match weighting: last 3 fixtures get weight 2, earlier get weight 1
function recencyWeight(idx: number, total: number): number {
  return idx >= total - 3 ? 2 : 1
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildTeamAdjustments(
  teams: SeedTeam[],
  fixtures: SeedFixture[],
  results: ActualResult[],
  predictions: SeedPrediction[],
): TeamAdjustment[] {
  const resultMap = new Map(results.map(r => [r.fixture_id, r]))
  const adjustments: TeamAdjustment[] = []

  for (const team of teams) {
    // All completed fixtures this team played, sorted chronologically
    const played = fixtures
      .filter(
        f =>
          (f.home_team_id === team.id || f.away_team_id === team.id) &&
          resultMap.has(f.id),
      )
      .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

    if (played.length === 0) continue

    const contributions: MatchContribution[] = played.map((f, idx) => {
      const result = resultMap.get(f.id)!
      const isHome = f.home_team_id === team.id

      const actualScored = isHome ? result.home_goals : result.away_goals
      const actualConceded = isHome ? result.away_goals : result.home_goals

      const expectedScored = avgExpected(predictions, f.id, isHome ? 'home' : 'away')
      const expectedConceded = avgExpected(predictions, f.id, isHome ? 'away' : 'home')

      const opponent = teams.find(
        t => t.id === (isHome ? f.away_team_id : f.home_team_id),
      )

      return {
        fixtureId: f.id,
        opponent: opponent?.name ?? 'Unknown',
        matchday: f.matchday,
        weight: recencyWeight(idx, played.length),
        actualScored,
        expectedScored,
        actualConceded,
        expectedConceded,
      }
    })

    // Weighted ratio: sum(weight * actual) / sum(weight * expected)
    // Clamped to [0.5, 2.0] to avoid wild swings from small samples
    const wScoredActual = contributions.reduce((s, c) => s + c.weight * c.actualScored, 0)
    const wScoredExpected = contributions.reduce((s, c) => s + c.weight * c.expectedScored, 0)
    const wConcActual = contributions.reduce((s, c) => s + c.weight * c.actualConceded, 0)
    const wConcExpected = contributions.reduce((s, c) => s + c.weight * c.expectedConceded, 0)

    const attackFactor =
      wScoredExpected > 0
        ? Math.min(2.0, Math.max(0.5, wScoredActual / wScoredExpected))
        : 1.0
    const defenceFactor =
      wConcExpected > 0
        ? Math.min(2.0, Math.max(0.5, wConcActual / wConcExpected))
        : 1.0

    const matchesPlayed = played.length
    const confidence: 'High' | 'Medium' | 'Low' =
      matchesPlayed >= 3 ? 'High' : matchesPlayed === 2 ? 'Medium' : 'Low'

    adjustments.push({
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      flag: team.flag_url,
      attackFactor: Math.round(attackFactor * 100) / 100,
      defenceFactor: Math.round(defenceFactor * 100) / 100,
      confidence,
      matchesPlayed,
      contributions,
    })
  }

  // Sort by biggest combined deviation from baseline (1.0)
  return adjustments.sort(
    (a, b) =>
      Math.abs(b.attackFactor - 1) +
      Math.abs(b.defenceFactor - 1) -
      (Math.abs(a.attackFactor - 1) + Math.abs(a.defenceFactor - 1)),
  )
}

// Format factor as "+20%" / "-10%" / "baseline"
export function formatFactor(factor: number): string {
  const pct = Math.round((factor - 1) * 100)
  if (pct === 0) return 'baseline'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}
