'use client'

import { getResults, getPredictions, getFixtures } from './store'
import { brierScore, logLoss, getOutcome } from './models'

export interface MatchEntry {
  fixtureId: string
  kickoff: string
  actualOutcome: 'H' | 'D' | 'A'
  models: Record<'A' | 'B' | 'C', {
    predOutcome: 'H' | 'D' | 'A'
    correct: boolean
    brier: number
    logLoss: number
    goalErr: number
    hw: number
    dw: number
    aw: number
  } | null>
}

export function buildMatchTimeline(): MatchEntry[] {
  const results = getResults()
  const predictions = getPredictions()
  const fixtures = getFixtures()

  return results.flatMap(r => {
    const fixture = fixtures.find(f => f.id === r.fixture_id)
    if (!fixture) return []
    const actualOutcome = getOutcome(r.home_goals, r.away_goals)

    const models = Object.fromEntries(
      (['A', 'B', 'C'] as const).map(m => {
        const pred = predictions.find(p => p.fixture_id === r.fixture_id && p.model === m)
        if (!pred) return [m, null]
        return [m, {
          predOutcome: getOutcome(pred.home_goals, pred.away_goals),
          correct: getOutcome(pred.home_goals, pred.away_goals) === actualOutcome,
          brier: brierScore(pred.home_win_prob, pred.draw_prob, pred.away_win_prob, r.home_goals, r.away_goals),
          logLoss: logLoss(pred.home_win_prob, pred.draw_prob, pred.away_win_prob, r.home_goals, r.away_goals),
          goalErr: Math.abs(pred.home_goals - r.home_goals) + Math.abs(pred.away_goals - r.away_goals),
          hw: pred.home_win_prob,
          dw: pred.draw_prob,
          aw: pred.away_win_prob,
        }]
      })
    ) as Record<'A' | 'B' | 'C', MatchEntry['models']['A']>

    return [{ fixtureId: r.fixture_id, kickoff: fixture.kickoff_utc, actualOutcome, models }]
  }).sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
}

export interface PairStats {
  pair: 'AB' | 'AC' | 'BC'
  firstModel: 'A' | 'B' | 'C'
  secondModel: 'A' | 'B' | 'C'
  totalDisagreements: number
  firstWon: number
  secondWon: number
  neitherWon: number
}

export function computePairwiseDisagreement(timeline: MatchEntry[]): PairStats[] {
  const pairs: [string, 'A' | 'B' | 'C', 'A' | 'B' | 'C'][] = [
    ['AB', 'A', 'B'], ['AC', 'A', 'C'], ['BC', 'B', 'C'],
  ]
  return pairs.map(([key, m1, m2]) => {
    const disagreements = timeline.filter(e => {
      const a = e.models[m1], b = e.models[m2]
      return a && b && a.predOutcome !== b.predOutcome
    })
    return {
      pair: key as 'AB' | 'AC' | 'BC',
      firstModel: m1,
      secondModel: m2,
      totalDisagreements: disagreements.length,
      firstWon: disagreements.filter(e => e.models[m1]?.correct).length,
      secondWon: disagreements.filter(e => e.models[m2]?.correct).length,
      neitherWon: disagreements.filter(e => !e.models[m1]?.correct && !e.models[m2]?.correct).length,
    }
  })
}

export function computeDisagreementScore(preds: Array<{ hw: number; dw: number; aw: number }>): number {
  if (preds.length < 2) return 0
  const idxPairs = [[0, 1], [0, 2], [1, 2]] as const
  const tvds = idxPairs.map(([i, j]) =>
    0.5 * (Math.abs(preds[i].hw - preds[j].hw) + Math.abs(preds[i].dw - preds[j].dw) + Math.abs(preds[i].aw - preds[j].aw))
  )
  return tvds.reduce((s, t) => s + t, 0) / tvds.length
}
