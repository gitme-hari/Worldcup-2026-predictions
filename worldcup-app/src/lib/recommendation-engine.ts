import type { SeedPrediction } from './seed-data'

// ── Internal Poisson helpers ──────────────────────────────────────────────────

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function modeScoreline(hl: number, al: number): { h: number; a: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (p > best.p) best = { h, a, p }
    }
  return { h: best.h, a: best.a }
}

function topCandidates(hl: number, al: number, n: number) {
  const out: Array<{ h: number; a: number; prob: number }> = []
  for (let h = 0; h <= 7; h++)
    for (let a = 0; a <= 7; a++)
      out.push({ h, a, prob: poissonProb(hl, h) * poissonProb(al, a) })
  return out.sort((x, y) => y.prob - x.prob).slice(0, n)
}

function slKey(h: number, a: number) { return `${h}-${a}` }
function outcome(h: number, a: number): 'H' | 'D' | 'A' {
  return h > a ? 'H' : h < a ? 'A' : 'D'
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface Recommendation {
  scoreline: { home: number; away: number }
  confidence: 'High' | 'Medium' | 'Low'
  rationale: string[]
  alternatives: Array<{ home: number; away: number }>
  agreement: 'full' | 'majority' | 'split'
  avgXgHome: number
  avgXgAway: number
  outcomeProbs: { home: number; draw: number; away: number }
  modelScorelines: Record<'A' | 'B' | 'C', { h: number; a: number } | null>
}

// ── Engine ────────────────────────────────────────────────────────────────────

export function buildRecommendation(predsForFixture: SeedPrediction[]): Recommendation | null {
  const get = (m: 'A' | 'B' | 'C') => predsForFixture.find(p => p.model === m)
  const predA = get('A'), predB = get('B'), predC = get('C')
  const available = [predA, predB, predC].filter(Boolean) as SeedPrediction[]
  if (available.length === 0) return null

  // Mode scoreline per model
  const slA = predA ? modeScoreline(predA.home_goals, predA.away_goals) : null
  const slB = predB ? modeScoreline(predB.home_goals, predB.away_goals) : null
  const slC = predC ? modeScoreline(predC.home_goals, predC.away_goals) : null
  const modelScorelines: Record<'A' | 'B' | 'C', { h: number; a: number } | null> = { A: slA, B: slB, C: slC }

  const scorelines = [slA, slB, slC].filter(Boolean) as { h: number; a: number }[]

  // Vote on scorelines
  const freq = new Map<string, { h: number; a: number; count: number }>()
  scorelines.forEach(sl => {
    const k = slKey(sl.h, sl.a)
    const ex = freq.get(k)
    if (ex) ex.count++
    else freq.set(k, { ...sl, count: 1 })
  })

  const sorted = [...freq.values()].sort((a, b) => b.count - a.count)
  const maxCount = sorted[0]?.count ?? 0

  let agreement: 'full' | 'majority' | 'split'
  if (maxCount === 3) agreement = 'full'
  else if (maxCount === 2) agreement = 'majority'
  else agreement = 'split'

  // Recommended scoreline
  let recommended: { h: number; a: number }
  if (maxCount >= 2) {
    recommended = { h: sorted[0].h, a: sorted[0].a }
  } else {
    // All differ — find highest combined Poisson probability across all models
    const pool = new Map<string, { h: number; a: number; totalProb: number }>()
    available.forEach(pred => {
      topCandidates(pred.home_goals, pred.away_goals, 8).forEach(({ h, a, prob }) => {
        const k = slKey(h, a)
        const ex = pool.get(k)
        if (ex) ex.totalProb += prob
        else pool.set(k, { h, a, totalProb: prob })
      })
    })
    const best = [...pool.values()].sort((a, b) => b.totalProb - a.totalProb)[0]
    recommended = best ?? scorelines[0]
  }

  // Averages
  const avgXgHome = available.reduce((s, p) => s + p.home_goals, 0) / available.length
  const avgXgAway = available.reduce((s, p) => s + p.away_goals, 0) / available.length
  const avgHome   = available.reduce((s, p) => s + p.home_win_prob, 0) / available.length
  const avgDraw   = available.reduce((s, p) => s + p.draw_prob, 0) / available.length
  const avgAway   = available.reduce((s, p) => s + p.away_win_prob, 0) / available.length

  // Confidence
  const outcomes = scorelines.map(sl => outcome(sl.h, sl.a))
  const outcomeAgreement = new Set(outcomes).size === 1
  let confidence: 'High' | 'Medium' | 'Low'
  if (agreement === 'full') confidence = 'High'
  else if (agreement === 'majority') confidence = 'Medium'
  else confidence = outcomeAgreement ? 'Medium' : 'Low'

  // Rationale bullets
  const rationale: string[] = []
  if (outcomeAgreement) {
    const o = outcomes[0]
    rationale.push(`All models agree on a ${o === 'H' ? 'home win' : o === 'A' ? 'away win' : 'draw'}`)
  } else {
    const hw = outcomes.filter(o => o === 'H').length
    const dw = outcomes.filter(o => o === 'D').length
    const aw = outcomes.filter(o => o === 'A').length
    const parts: string[] = []
    if (hw) parts.push(`${hw} home win`)
    if (dw) parts.push(`${dw} draw`)
    if (aw) parts.push(`${aw} away win`)
    rationale.push(`Models split — ${parts.join(', ')}`)
  }
  rationale.push(`Average expected goals: ${avgXgHome.toFixed(1)}–${avgXgAway.toFixed(1)}`)
  if (agreement === 'full') rationale.push('All three models converge on this scoreline')
  else if (agreement === 'majority') rationale.push('Two of three models select this scoreline')
  else rationale.push('Highest combined probability across all models')

  // Alternatives
  const recKey = slKey(recommended.h, recommended.a)
  const altPool = new Map<string, { h: number; a: number; totalProb: number }>()
  available.forEach(pred => {
    topCandidates(pred.home_goals, pred.away_goals, 8).forEach(({ h, a, prob }) => {
      const k = slKey(h, a)
      if (k === recKey) return
      const ex = altPool.get(k)
      if (ex) ex.totalProb += prob
      else altPool.set(k, { h, a, totalProb: prob })
    })
  })

  const alternatives = [...altPool.values()]
    .sort((a, b) => b.totalProb - a.totalProb)
    .slice(0, 3)
    .map(({ h, a }) => ({ home: h, away: a }))

  return {
    scoreline: { home: recommended.h, away: recommended.a },
    confidence,
    rationale,
    alternatives,
    agreement,
    avgXgHome: Math.round(avgXgHome * 10) / 10,
    avgXgAway: Math.round(avgXgAway * 10) / 10,
    outcomeProbs: {
      home: Math.round(avgHome * 100) / 100,
      draw: Math.round(avgDraw * 100) / 100,
      away: Math.round(avgAway * 100) / 100,
    },
    modelScorelines,
  }
}
