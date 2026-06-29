import { SEED_TEAMS, SEED_FIXTURES, generatePredictions } from './seed-data'

const DEFENDING_CHAMP = 'arg'
const DEFENDING_CHAMP_PENALTY = 0.08  // -8% win probability in every match

export interface TeamMCResult {
  teamId: string
  name: string
  group: string
  flag: string
  eloRating: number
  reachKnockout: number
  reachR16: number
  reachQF: number
  reachSF: number
  reachFinal: number
  winTournament: number
  avgGoals: number
  groupWinProb: number
}

function eloProbVsElo(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

function simKnockout(idA: string, idB: string, eloMap: Record<string, number>): string {
  let pA = eloProbVsElo(eloMap[idA] ?? 1700, eloMap[idB] ?? 1700)
  if (idA === DEFENDING_CHAMP) pA -= DEFENDING_CHAMP_PENALTY
  if (idB === DEFENDING_CHAMP) pA += DEFENDING_CHAMP_PENALTY
  pA = Math.min(Math.max(pA, 0.05), 0.95)
  return Math.random() < pA ? idA : idB
}

function simGroupMatch(hwp: number, dp: number, awp: number): 1 | 0 | -1 {
  const r = Math.random()
  if (r < hwp) return 1
  if (r < hwp + dp) return 0
  return -1
}

interface TeamStats { id: string; pts: number; gd: number; gf: number }

function rankGroup(stats: TeamStats[]): TeamStats[] {
  return [...stats].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

export function runMonteCarlo(iterations = 8000): TeamMCResult[] {
  const predictions = generatePredictions()
  const predMap: Record<string, { hwp: number; dp: number; awp: number; hg: number; ag: number }> = {}

  predictions.forEach(p => {
    if (p.model === 'A') {
      let hwp = p.home_win_prob, dp = p.draw_prob, awp = p.away_win_prob
      const fix = SEED_FIXTURES.find(f => f.id === p.fixture_id)
      if (fix) {
        if (fix.home_team_id === DEFENDING_CHAMP) {
          hwp = Math.max(hwp - DEFENDING_CHAMP_PENALTY, 0.05)
          awp = Math.min(awp + DEFENDING_CHAMP_PENALTY * 0.7, 0.9)
          dp = Math.max(dp - DEFENDING_CHAMP_PENALTY * 0.3, 0.05)
        } else if (fix.away_team_id === DEFENDING_CHAMP) {
          awp = Math.max(awp - DEFENDING_CHAMP_PENALTY, 0.05)
          hwp = Math.min(hwp + DEFENDING_CHAMP_PENALTY * 0.7, 0.9)
          dp = Math.max(dp - DEFENDING_CHAMP_PENALTY * 0.3, 0.05)
        }
        const tot = hwp + dp + awp
        predMap[p.fixture_id] = { hwp: hwp/tot, dp: dp/tot, awp: awp/tot, hg: p.home_goals, ag: p.away_goals }
      }
    }
  })

  const eloMap: Record<string, number> = {}
  SEED_TEAMS.forEach(t => { eloMap[t.id] = t.elo_rating })

  const counts: Record<string, { ko: number; r16: number; qf: number; sf: number; fin: number; win: number; goals: number; gw: number }> = {}
  SEED_TEAMS.forEach(t => { counts[t.id] = { ko: 0, r16: 0, qf: 0, sf: 0, fin: 0, win: 0, goals: 0, gw: 0 } })

  const groups = 'ABCDEFGHIJKL'.split('')

  for (let i = 0; i < iterations; i++) {
    // ── Group stage ──────────────────────────────────────────────────────
    const groupStats: Record<string, Record<string, TeamStats>> = {}
    groups.forEach(g => {
      groupStats[g] = {}
      SEED_TEAMS.filter(t => t.group === g).forEach(t => {
        groupStats[g][t.id] = { id: t.id, pts: 0, gd: 0, gf: 0 }
      })
    })

    const simGoals: Record<string, number> = {}

    SEED_FIXTURES.forEach(f => {
      const p = predMap[f.id]
      if (!p) return
      const result = simGroupMatch(p.hwp, p.dp, p.awp)
      if (!f.group) return
      const h = groupStats[f.group][f.home_team_id]
      const a = groupStats[f.group][f.away_team_id]
      if (!h || !a) return

      const hg = Math.max(0, Math.round(p.hg + (Math.random() - 0.5)))
      const ag = Math.max(0, Math.round(p.ag + (Math.random() - 0.5)))
      const hGoals = result === 1 ? Math.max(hg, ag + 1) : result === 0 ? Math.min(hg, ag) : Math.min(hg, Math.max(0, ag - 1))
      const aGoals = result === -1 ? Math.max(ag, hg + 1) : result === 0 ? hGoals : Math.min(ag, Math.max(0, hg - 1))

      simGoals[f.home_team_id] = (simGoals[f.home_team_id] ?? 0) + hGoals
      simGoals[f.away_team_id] = (simGoals[f.away_team_id] ?? 0) + aGoals

      if (result === 1) { h.pts += 3 }
      else if (result === 0) { h.pts += 1; a.pts += 1 }
      else { a.pts += 3 }
      h.gd += hGoals - aGoals; h.gf += hGoals
      a.gd += aGoals - hGoals; a.gf += aGoals
    })

    // Qualify top 2 + collect 3rd place
    const qualified: string[] = []
    const thirdPlace: TeamStats[] = []

    groups.forEach(g => {
      const ranked = rankGroup(Object.values(groupStats[g]))
      counts[ranked[0].id].gw++
      qualified.push(ranked[0].id, ranked[1].id)
      counts[ranked[0].id].ko++
      counts[ranked[1].id].ko++
      thirdPlace.push(ranked[2])
    })

    // Best 8 third-place teams
    rankGroup(thirdPlace).slice(0, 8).forEach(t => {
      qualified.push(t.id)
      counts[t.id].ko++
    })

    // ── Knockout stage (32 teams, 5 rounds) ──────────────────────────────
    // Seed by Elo, pair 1v32, 2v31, etc.
    const sorted = [...qualified].sort((a, b) => (eloMap[b] ?? 0) - (eloMap[a] ?? 0))

    function simRound(teams: string[]): string[] {
      const n = teams.length
      const winners: string[] = []
      for (let j = 0; j < n / 2; j++) {
        winners.push(simKnockout(teams[j], teams[n - 1 - j], eloMap))
      }
      return winners
    }

    const r16 = simRound(sorted)
    r16.forEach(t => { counts[t].r16++ })

    const qf = simRound(r16)
    qf.forEach(t => { counts[t].qf++ })

    const sf = simRound(qf)
    sf.forEach(t => { counts[t].sf++ })

    const fin = simRound(sf)
    fin.forEach(t => { counts[t].fin++ })

    const champ = simRound(fin)
    champ.forEach(t => { counts[t].win++ })

    SEED_TEAMS.forEach(t => { counts[t.id].goals += simGoals[t.id] ?? 0 })
  }

  return SEED_TEAMS.map(t => ({
    teamId: t.id,
    name: t.name,
    group: t.group,
    flag: t.flag_url,
    eloRating: t.elo_rating,
    reachKnockout: counts[t.id].ko / iterations,
    reachR16: counts[t.id].r16 / iterations,
    reachQF: counts[t.id].qf / iterations,
    reachSF: counts[t.id].sf / iterations,
    reachFinal: counts[t.id].fin / iterations,
    winTournament: counts[t.id].win / iterations,
    avgGoals: counts[t.id].goals / iterations,
    groupWinProb: counts[t.id].gw / iterations,
  }))
}
