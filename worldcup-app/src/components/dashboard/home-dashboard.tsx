'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getFixtures, getTeams, getPredictions, getResults, getLockedPredictions,
  computeMetrics, fetchLiveData, getLiveData,
} from '@/lib/store'
import type { ComputedMetrics } from '@/lib/store'
import type { SeedPrediction } from '@/lib/seed-data'
import { computeDisagreementScore } from '@/lib/analytics'
import { MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, Calendar, RefreshCw, Trophy, Zap } from 'lucide-react'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const BERLIN_TZ = 'Europe/Berlin'

function berlinLabel(utc: string) {
  const d = new Date(utc)
  const todayBerlin = new Date().toLocaleDateString('en-GB', { timeZone: BERLIN_TZ })
  const dayBerlin   = d.toLocaleDateString('en-GB', { timeZone: BERLIN_TZ })
  const timeBerlin  = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ })
  const label = todayBerlin === dayBerlin ? 'Today' : 'Tomorrow'
  return `${label} · ${timeBerlin} CEST`
}

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function topScorelines(homeLambda: number, awayLambda: number, n = 3) {
  const scores: { h: number; a: number; p: number }[] = []
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++)
      scores.push({ h, a, p: poissonProb(homeLambda, h) * poissonProb(awayLambda, a) })
  return scores.sort((a, b) => b.p - a.p).slice(0, n)
}

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (Math.round(predH) === actH && Math.round(predA) === actA) return 4
  const predGD    = Math.round(predH) - Math.round(predA)
  const actGD     = actH - actA
  const predWin   = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actWin    = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predWin === actWin && predGD === actGD) return 2
  if (predWin === actWin) return 1
  return 0
}

type MatchType  = 'Heavy Favourite' | 'Balanced' | 'Draw Candidate' | 'Model Conflict'
type ActionConf = 'High' | 'Medium' | 'Low'
interface FixtureAdvice {
  matchType: MatchType; action: string; confidence: ActionConf; reason: string
}

function classifyFixture(
  preds: Array<{ hw: number; dw: number; aw: number }>,
  disagreementScore: number,
  bestModel: string | null,
): FixtureAdvice {
  if (preds.length === 0)
    return { matchType: 'Balanced', action: 'No data', confidence: 'Low', reason: 'No model predictions available.' }

  const avgHw  = preds.reduce((s, p) => s + p.hw, 0) / preds.length
  const avgDw  = preds.reduce((s, p) => s + p.dw, 0) / preds.length
  const topProb = Math.max(avgHw, preds.reduce((s, p) => s + p.aw, 0) / preds.length)

  if (disagreementScore >= 0.12)
    return { matchType: 'Model Conflict', action: 'Review Manually', confidence: 'Low',
      reason: 'Models disagree materially. Review each model\'s probabilities before locking.' }

  if (topProb > 0.65 && disagreementScore < 0.08)
    return { matchType: 'Heavy Favourite', action: 'Trust Any Model', confidence: 'High',
      reason: `All models agree on a clear favourite (avg ${Math.round(topProb * 100)}% win prob).` }

  if (avgDw > 0.30)
    return { matchType: 'Draw Candidate', action: 'Review Manually', confidence: 'Low',
      reason: `Draw probability elevated across all models (avg ${Math.round(avgDw * 100)}%).` }

  return { matchType: 'Balanced',
    action: bestModel ? `Use Model ${bestModel}` : 'Review Manually', confidence: 'Medium',
    reason: 'Fixture is balanced — defer to the best-calibrated model for a small edge.' }
}

const CONF_BADGE: Record<ActionConf, string> = {
  High: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-zinc-100 text-zinc-500',
}
const TYPE_BADGE: Record<MatchType, string> = {
  'Heavy Favourite': 'bg-blue-50 text-blue-700', 'Balanced': 'bg-zinc-50 text-zinc-600',
  'Draw Candidate': 'bg-purple-50 text-purple-700', 'Model Conflict': 'bg-red-50 text-red-600',
}

// ── Section 1: Model Recommendation ───────────────────────────────────────────

type Confidence = 'High' | 'Medium' | 'Low'

function computeConfidence(metrics: ComputedMetrics[]) {
  const ranked = [...metrics]
    .filter(m => m.total > 0)
    .sort((a, b) => a.avgBrier !== b.avgBrier ? a.avgBrier - b.avgBrier : b.accuracy - a.accuracy)
  if (ranked.length < 2) return null
  const [best, second] = ranked
  const accGap   = best.accuracy - second.accuracy
  const brierGap = second.avgBrier - best.avgBrier
  const n        = best.total

  const confidence: Confidence =
    n >= 60 && accGap > 0.05 && brierGap > 0.010 ? 'High'
    : n >= 40 && (accGap > 0.03 || brierGap > 0.005) ? 'Medium'
    : 'Low'

  const explanation = confidence === 'High'
    ? `Model ${best.model} has a clear, sustained edge — use it consistently.`
    : confidence === 'Medium'
    ? `Model ${best.model} is pulling ahead but the lead is not yet decisive. Lean toward it.`
    : `Model ${best.model} leads on accuracy and Brier, but Model ${second.model} is very close. Current evidence is not yet decisive.`

  return { best, second, confidence, accGap, brierGap, explanation }
}

const REC_CONF_BADGE: Record<Confidence, string> = {
  High: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-zinc-100 text-zinc-500',
}
const REC_CONF_DOT: Record<Confidence, string> = {
  High: 'bg-green-500', Medium: 'bg-amber-400', Low: 'bg-zinc-400',
}

function ModelRecommendationCard() {
  const result = computeConfidence(computeMetrics())
  if (!result) {
    return (
      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Zap className="h-4 w-4 text-amber-500" /> Which model should I use?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">
            No resolved matches yet —{' '}
            <Link href="/results" className="underline text-blue-600">enter results</Link> to activate.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { best, second, confidence, accGap, brierGap, explanation } = result
  return (
    <Card className="border-2 border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
          <Zap className="h-4 w-4 text-amber-500" /> Which model should I use?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Recommended</p>
            <p className="text-2xl font-bold text-zinc-900">Model {best.model}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 mb-1">Confidence</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${REC_CONF_BADGE[confidence]}`}>
              <span className={`h-2 w-2 rounded-full ${REC_CONF_DOT[confidence]}`} />
              {confidence}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Accuracy', val: `${(best.accuracy * 100).toFixed(0)}%` },
            { label: 'Brier',    val: best.avgBrier.toFixed(3) },
            { label: 'Matches',  val: String(best.total) },
          ].map(c => (
            <div key={c.label} className="rounded-md bg-zinc-50 px-2.5 py-2">
              <p className="text-zinc-400">{c.label}</p>
              <p className="font-semibold text-zinc-800">{c.val}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-100" />
        <p className="text-xs text-zinc-500 leading-relaxed">{explanation}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-zinc-50 px-2.5 py-1.5">
            <p className="text-zinc-400">vs Model {second.model} — accuracy</p>
            <p className="font-semibold text-zinc-700">
              +{(accGap * 100).toFixed(1)}pp{' '}
              <span className="font-normal text-zinc-400">({accGap < 0.03 ? 'within noise' : accGap < 0.05 ? 'moderate' : 'meaningful'})</span>
            </p>
          </div>
          <div className="rounded-md bg-zinc-50 px-2.5 py-1.5">
            <p className="text-zinc-400">vs Model {second.model} — Brier</p>
            <p className="font-semibold text-zinc-700">
              {brierGap < 0.001 ? '<0.001' : brierGap.toFixed(4)} better{' '}
              <span className="font-normal text-zinc-400">({brierGap < 0.002 ? 'negligible' : brierGap < 0.010 ? 'small' : 'clear'})</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Sections 2 & 3: Matches Needing Your Pick + Decision Assistant ─────────────

type BettingWindow = '24h' | '36h' | 'all'
const WINDOW_LABELS: Record<BettingWindow, string> = { '24h': 'Next 24h', '36h': 'Next 36h', all: 'All Unlocked' }

function MatchPicksAndAssistant() {
  const [window, setWindow] = useState<BettingWindow>('24h')

  const fixtures    = getFixtures()
  const teams       = getTeams()
  const allPreds    = getPredictions()
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const metrics     = computeMetrics()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const playedIds   = new Set(results.map(r => r.fixture_id))
  const lockedIds   = new Set(lockedPreds.map(p => p.fixture_id))
  const now         = new Date()
  const cutoff      = window === '24h' ? new Date(now.getTime() + 24 * 3600_000)
    : window === '36h' ? new Date(now.getTime() + 36 * 3600_000) : null

  const bestByBrier = [...metrics].filter(m => m.total > 0)
    .sort((a, b) => a.avgBrier - b.avgBrier)[0]

  const needsPick = fixtures.filter(f => {
    if (playedIds.has(f.id) || lockedIds.has(f.id)) return false
    const kick = new Date(f.kickoff_utc)
    if (kick <= now) return false
    if (cutoff && kick > cutoff) return false
    return true
  }).sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5 text-blue-500" /> Matches Needing Your Pick
        </CardTitle>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {(['24h', '36h', 'all'] as BettingWindow[]).map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                window === w ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}>
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {needsPick.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">All picks are locked for the selected window.</p>
        ) : (
          needsPick.map(fix => {
            const home = teamMap[fix.home_team_id]
            const away = teamMap[fix.away_team_id]
            const predA = allPreds.find(p => p.fixture_id === fix.id && p.model === 'A')
            const predB = allPreds.find(p => p.fixture_id === fix.id && p.model === 'B')
            const predC = allPreds.find(p => p.fixture_id === fix.id && p.model === 'C')
            const avail = [predA, predB, predC].filter(Boolean) as SeedPrediction[]

            const disScore = avail.length >= 2
              ? computeDisagreementScore(avail.map(p => ({ hw: p.home_win_prob, dw: p.draw_prob, aw: p.away_win_prob })))
              : 0

            const advice = classifyFixture(
              avail.map(p => ({ hw: p.home_win_prob, dw: p.draw_prob, aw: p.away_win_prob })),
              disScore, bestByBrier?.model ?? null,
            )

            return (
              <div key={fix.id} className="rounded-lg border border-zinc-100 p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                      <span>{home?.flag_url}</span>
                      <span>{home?.code ?? fix.home_team_id}</span>
                      <span className="text-zinc-300 font-normal">vs</span>
                      <span>{away?.code ?? fix.away_team_id}</span>
                      <span>{away?.flag_url}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">Group {fix.group} · {berlinLabel(fix.kickoff_utc)}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[advice.matchType]}`}>
                    {advice.matchType}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([['A', predA], ['B', predB], ['C', predC]] as const).map(([m, pred]) => (
                    <div key={m} className={`rounded p-2 text-center ${bestByBrier?.model === m ? 'bg-zinc-100 ring-1 ring-zinc-300' : 'bg-zinc-50'}`}>
                      <div className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs mb-1 ${MODEL_COLORS[m]}`}>{m}</div>
                      {pred ? (
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between text-zinc-600"><span>H</span><span className="font-semibold">{Math.round(pred.home_win_prob * 100)}%</span></div>
                          <div className="flex justify-between text-zinc-400"><span>D</span><span>{Math.round(pred.draw_prob * 100)}%</span></div>
                          <div className="flex justify-between text-zinc-600"><span>A</span><span className="font-semibold">{Math.round(pred.away_win_prob * 100)}%</span></div>
                        </div>
                      ) : <span className="text-xs text-zinc-300">—</span>}
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 rounded-md bg-zinc-50 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CONF_BADGE[advice.confidence]}`}>
                      {advice.confidence}
                    </span>
                    <span className="text-xs font-medium text-zinc-700">{advice.action}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-snug">{advice.reason}</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 4: Scoreline Advisor ───────────────────────────────────────────────

function ScorelineAdvisor() {
  const fixtures    = getFixtures()
  const teams       = getTeams()
  const allPreds    = getPredictions()
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const metrics     = computeMetrics()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const playedIds   = new Set(results.map(r => r.fixture_id))
  const lockedIds   = new Set(lockedPreds.map(p => p.fixture_id))
  const now         = new Date()
  const cutoff      = new Date(now.getTime() + 36 * 3600_000)
  const bestModel   = [...metrics].filter(m => m.total > 0)
    .sort((a, b) => a.avgBrier - b.avgBrier)[0]?.model ?? 'A'

  const upcoming = fixtures.filter(f => {
    if (playedIds.has(f.id) || lockedIds.has(f.id)) return false
    const kick = new Date(f.kickoff_utc)
    return kick > now && kick <= cutoff
  }).sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  if (upcoming.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Trophy className="h-3.5 w-3.5 text-amber-500" /> Scoreline Advisor
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Top-3 most likely exact scores · unlocked fixtures in the next 36h</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {upcoming.map(fix => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          const pred = allPreds.find(p => p.fixture_id === fix.id && p.model === bestModel)
          if (!pred) return null

          const hl     = pred.home_goals
          const al     = pred.away_goals
          const scores = topScorelines(hl, al)
          const top    = scores[0]

          return (
            <div key={fix.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                  <span>{home?.flag_url}</span>
                  <span>{home?.code}</span>
                  <span className="text-zinc-300 font-normal">vs</span>
                  <span>{away?.code}</span>
                  <span>{away?.flag_url}</span>
                </div>
                <span className="text-xs text-zinc-400">{berlinLabel(fix.kickoff_utc)}</span>
              </div>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span>xG <span className="font-medium text-zinc-700">{hl.toFixed(1)}–{al.toFixed(1)}</span></span>
                <span>xGD <span className="font-medium text-zinc-700">{hl >= al ? '+' : ''}{(hl - al).toFixed(1)}</span></span>
                <span>xTotal <span className="font-medium text-zinc-700">{(hl + al).toFixed(1)}</span></span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {scores.map((s, i) => (
                  <div key={i} className={`rounded-md px-2.5 py-2 text-center ${i === 0 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-zinc-50'}`}>
                    <p className={`text-sm font-bold ${i === 0 ? 'text-amber-800' : 'text-zinc-700'}`}>{s.h}–{s.a}</p>
                    <p className="text-xs text-zinc-400">{(s.p * 100).toFixed(1)}%</p>
                    {i === 0 && <p className="text-xs text-amber-600 font-medium mt-0.5">Pool Pick</p>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                Pool Pick: <span className="font-semibold text-zinc-700">{top.h}–{top.a}</span>
                {' · '}{pred.home_win_prob > 0.55
                  ? 'Strong favourite, low away scoring expectation.'
                  : pred.draw_prob > 0.28
                  ? 'Draw candidate — consider the draw.'
                  : 'Balanced fixture, pick with the model.'}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Section 5: Pool Competition Leaderboard ────────────────────────────────────

function PoolLeaderboard() {
  const allPreds    = getPredictions()
  const lockedPreds = getLockedPredictions()
  const results     = getResults()
  if (results.length === 0) return null

  const modelRows = (['A', 'B', 'C'] as const).map(m => {
    let pts = 0, count = 0
    results.forEach(r => {
      const pred = allPreds.find(p => p.fixture_id === r.fixture_id && p.model === m)
      if (!pred) return
      pts += poolScore(pred.home_goals, pred.away_goals, r.home_goals, r.away_goals)
      count++
    })
    return { label: `Model ${m}`, pts, count, avg: count > 0 ? pts / count : 0 }
  })

  let myPts = 0, myCount = 0
  results.forEach(r => {
    const locked = lockedPreds.find(p => p.fixture_id === r.fixture_id)
    if (!locked) return
    myPts += poolScore(locked.home_goals, locked.away_goals, r.home_goals, r.away_goals)
    myCount++
  })
  const myRow = { label: 'My Picks', pts: myPts, count: myCount, avg: myCount > 0 ? myPts / myCount : 0 }

  const rows = [...modelRows, myRow].sort((a, b) => b.pts - a.pts)
  const leader = rows[0]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Pool Competition Leaderboard
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">
          Scoring: exact = 4 pts · correct winner + goal diff = 2 pts · correct winner = 1 pt
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row, i) => {
          const isFirst = i === 0
          const isMe    = row.label === 'My Picks'
          return (
            <div key={row.label}
              className={`flex items-center justify-between rounded-md px-3 py-2 ${
                isFirst ? 'bg-yellow-50 ring-1 ring-yellow-200' : isMe ? 'bg-blue-50' : 'bg-zinc-50'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isFirst ? 'text-yellow-600' : 'text-zinc-400'}`}>#{i + 1}</span>
                <span className={`text-sm font-semibold ${isMe ? 'text-blue-700' : 'text-zinc-700'}`}>{row.label}</span>
                {isFirst && <span className="text-xs bg-yellow-100 text-yellow-700 rounded px-1.5 py-0.5 font-medium">Leader</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{row.count} matches</span>
                <span className="font-semibold text-zinc-700">{row.pts} pts</span>
                <span className="text-zinc-400">({row.avg.toFixed(2)}/match)</span>
              </div>
            </div>
          )
        })}
        <p className="text-xs text-zinc-400 pt-1">
          Best pool performer: <span className="font-medium text-zinc-600">{leader.label}</span>
          {leader.label !== 'My Picks'
            ? ' — may differ from the model recommendation (which optimises for outcome accuracy, not pool scoring).'
            : ' — your locked picks are leading the pool.'}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Live Intelligence (kept, collapsed by default) ─────────────────────────────

function LiveIntelligencePanel() {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [liveData, setLiveData] = useState(() => getLiveData())
  const [error, setError]       = useState<string | null>(null)

  const handleRefresh = async () => {
    setLoading(true); setError(null)
    try {
      const d = await fetchLiveData()
      setLiveData(d)
      window.dispatchEvent(new Event('storage'))
    } catch {
      setError('Failed to fetch live data')
    } finally {
      setLoading(false)
    }
  }

  const injuries    = liveData?.newsItems.filter(n => n.type === 'injury') ?? []
  const adjustments = liveData
    ? Object.entries(liveData.teamAdjustments).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Zap className="h-3.5 w-3.5 text-green-500" /> Live Intelligence
          {injuries.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
              {injuries.length}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
          <button onClick={() => setOpen(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-800 underline">
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </CardHeader>

      {!open && injuries.length > 0 && (
        <CardContent className="pt-0 pb-3 space-y-1">
          {injuries.slice(0, 2).map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs bg-red-50 rounded px-2.5 py-1.5">
              <span className="text-red-400 shrink-0 mt-0.5">●</span>
              <span className="text-zinc-600">{item.headline}</span>
            </div>
          ))}
        </CardContent>
      )}

      {open && (
        <CardContent className="pt-0 space-y-4">
          {liveData ? (
            <div className="text-xs text-zinc-400">
              {adjustments.length} teams adjusted · last updated{' '}
              {new Date(liveData.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No data — click Refresh to pull live ESPN data.</p>
          )}
          {injuries.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-500 mb-1.5">⚠ Injury alerts</div>
              <div className="space-y-1">
                {injuries.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs bg-red-50 rounded px-2.5 py-1.5">
                    <span className="text-red-400 shrink-0 mt-0.5">●</span>
                    <span className="text-zinc-600">{item.headline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {adjustments.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-500 mb-2">Team adjustments</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {adjustments.map(([id, adj]) => (
                  <div key={id} className="flex items-center justify-between rounded bg-zinc-50 px-2.5 py-1.5">
                    <span className="text-xs text-zinc-700 font-medium truncate">{id.toUpperCase()}</span>
                    <span className={`text-xs font-bold ml-2 shrink-0 ${adj > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {adj > 0 ? '+' : ''}{(adj * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />{error}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <ModelRecommendationCard />
      <MatchPicksAndAssistant />
      <ScorelineAdvisor />
      <PoolLeaderboard />
      <LiveIntelligencePanel />
    </div>
  )
}
