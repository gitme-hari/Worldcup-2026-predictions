'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getFixtures, getTeams, getPredictions, getResults, getLockedPredictions,
  computeMetrics, fetchLiveData, getLiveData,
  savePoolRecommendation, getPoolRecommendation,
} from '@/lib/store'
import type { SeedFixture } from '@/lib/seed-data'
import { computeDisagreementScore } from '@/lib/analytics'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, ClipboardList, RefreshCw, Trophy } from 'lucide-react'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const BERLIN_TZ = 'Europe/Berlin'

function berlinLabel(utc: string) {
  const d   = new Date(utc)
  const now = new Date()
  const fmt = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: BERLIN_TZ })
  const todayStr    = fmt(now)
  const tomorrowStr = fmt(new Date(now.getTime() + 24 * 3600_000))
  const matchStr    = fmt(d)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ })
  let dayLabel: string
  if (matchStr === todayStr)         dayLabel = 'Today'
  else if (matchStr === tomorrowStr) dayLabel = 'Tomorrow'
  else {
    const wd   = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: BERLIN_TZ })
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: BERLIN_TZ })
    dayLabel = `${wd} ${date}`
  }
  return `${dayLabel} · ${time} CEST`
}

function timeUntil(utc: string): string {
  const diff = new Date(utc).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function topScoreline(hl: number, al: number): { h: number; a: number; p: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (p > best.p) best = { h, a, p }
    }
  return best
}

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (Math.round(predH) === actH && Math.round(predA) === actA) return 4
  const predGD = Math.round(predH) - Math.round(predA)
  const actGD  = actH - actA
  const predW  = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW   = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && predGD === actGD) return 2
  if (predW === actW) return 1
  return 0
}

// Pool scoring for each model + my locked picks
function computePoolRows() {
  const allPreds    = getPredictions()
  const lockedPreds = getLockedPredictions()
  const results     = getResults()

  const modelRows = (['A', 'B', 'C'] as const).map(m => {
    let pts = 0, count = 0
    results.forEach(r => {
      const pred = allPreds.find(p => p.fixture_id === r.fixture_id && p.model === m)
      if (!pred) return
      pts += poolScore(pred.home_goals, pred.away_goals, r.home_goals, r.away_goals)
      count++
    })
    return { label: `Model ${m}`, model: m as string, pts, count, avg: count > 0 ? pts / count : 0 }
  })

  let myPts = 0, myCount = 0
  results.forEach(r => {
    const locked = lockedPreds.find(p => p.fixture_id === r.fixture_id)
    if (!locked) return
    myPts += poolScore(locked.home_goals, locked.away_goals, r.home_goals, r.away_goals)
    myCount++
  })

  const myRow = { label: 'My Picks', model: 'me', pts: myPts, count: myCount, avg: myCount > 0 ? myPts / myCount : 0 }
  return [...modelRows, myRow].sort((a, b) => b.pts - a.pts)
}

type BettingWindow = '24h' | '36h' | 'all'
const WINDOW_LABELS: Record<BettingWindow, string> = { '24h': 'Next 24h', '36h': 'Next 36h', all: 'All Unlocked' }

function filterFixtures(window: BettingWindow): SeedFixture[] {
  const fixtures    = getFixtures()
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const playedIds   = new Set(results.map(r => r.fixture_id))
  const lockedIds   = new Set(lockedPreds.map(p => p.fixture_id))
  const now         = new Date()
  const cutoff      = window === '24h' ? new Date(now.getTime() + 24 * 3600_000)
    : window === '36h' ? new Date(now.getTime() + 36 * 3600_000) : null

  return fixtures.filter(f => {
    if (playedIds.has(f.id) || lockedIds.has(f.id)) return false
    const kick = new Date(f.kickoff_utc)
    if (kick <= now) return false
    if (cutoff && kick > cutoff) return false
    return true
  }).sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
}

// ── Section 1: Betting Summary ─────────────────────────────────────────────────

function BettingSummary({ needsPick, poolLeader }: {
  needsPick: SeedFixture[]
  poolLeader: { label: string; pts: number } | null
}) {
  const accuracyLeader = (() => {
    const metrics = computeMetrics().filter(m => m.total > 0)
    if (!metrics.length) return null
    return metrics.reduce((best, m) => m.accuracy > best.accuracy ? m : best)
  })()

  const first = needsPick[0]
  const deadline = first ? timeUntil(first.kickoff_utc) : null
  const firstTeams = first ? (() => {
    const teams = getTeams()
    const h = teams.find(t => t.id === first.home_team_id)
    const a = teams.find(t => t.id === first.away_team_id)
    return `${h?.code ?? '?'} vs ${a?.code ?? '?'}`
  })() : null

  const poolDiffersFromAccuracy =
    poolLeader && accuracyLeader &&
    poolLeader.label !== `Model ${accuracyLeader.model}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-blue-500" /> Betting Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status line */}
        <div className="flex items-center justify-between gap-3">
          <div>
            {needsPick.length > 0 ? (
              <>
                <p className="text-lg font-bold text-zinc-900">{needsPick.length} match{needsPick.length !== 1 ? 'es' : ''} need{needsPick.length === 1 ? 's' : ''} a pick</p>
                {deadline && firstTeams && (
                  <p className="text-xs text-zinc-400 mt-0.5">First deadline in <span className="font-semibold text-zinc-600">{deadline}</span> · {firstTeams}</p>
                )}
              </>
            ) : (
              <p className="text-sm font-medium text-zinc-500">All picks are locked for this window.</p>
            )}
          </div>
        </div>

        {poolLeader && (
          <>
            <div className="border-t border-zinc-100" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-500">Recommended strategy</p>
              <p className="text-sm text-zinc-700">
                Follow <span className="font-semibold">{poolLeader.label}</span> scorelines
              </p>
              <p className="text-xs text-zinc-400">
                {poolLeader.label} leads pool scoring with {poolLeader.pts} pts
                {poolDiffersFromAccuracy && accuracyLeader
                  ? ` — Model ${accuracyLeader.model} leads outcome accuracy but not pool points`
                  : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-zinc-50 px-2.5 py-2">
                <p className="text-zinc-400">Pool scoring</p>
                <p className="font-semibold text-zinc-800">{poolLeader.label}</p>
                <p className="text-zinc-400">{poolLeader.pts} pts</p>
              </div>
              {accuracyLeader && (
                <div className="rounded-md bg-zinc-50 px-2.5 py-2">
                  <p className="text-zinc-400">Outcome accuracy</p>
                  <p className="font-semibold text-zinc-800">Model {accuracyLeader.model}</p>
                  <p className="text-zinc-400">{(accuracyLeader.accuracy * 100).toFixed(0)}% correct</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 2: Picks To Submit ─────────────────────────────────────────────────

function PicksToSubmit({ needsPick, window, onWindowChange, poolModel }: {
  needsPick: SeedFixture[]
  window: BettingWindow
  onWindowChange: (w: BettingWindow) => void
  poolModel: string   // e.g. 'A' | 'B' | 'C' — the pool-leading model
}) {
  const allPreds = getPredictions()
  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" /> Picks To Submit
        </CardTitle>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {(['24h', '36h', 'all'] as BettingWindow[]).map(w => (
            <button key={w} onClick={() => onWindowChange(w)}
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
        ) : needsPick.map(fix => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]

          // Use pool-leading model for the recommendation
          const preds = allPreds.filter(p => p.fixture_id === fix.id)
          const poolPred = preds.find(p => p.model === poolModel) ?? preds[0]

          const avail = preds.filter(p => ['A','B','C'].includes(p.model))
          const disScore = avail.length >= 2
            ? computeDisagreementScore(avail.map(p => ({ hw: p.home_win_prob, dw: p.draw_prob, aw: p.away_win_prob })))
            : 0
          const avgDw = avail.length > 0 ? avail.reduce((s, p) => s + p.draw_prob, 0) / avail.length : 0
          const avgHw = avail.length > 0 ? avail.reduce((s, p) => s + p.home_win_prob, 0) / avail.length : 0
          const avgAw = avail.length > 0 ? avail.reduce((s, p) => s + p.away_win_prob, 0) / avail.length : 0

          let confLabel: string
          let confStyle: string
          if (disScore >= 0.12 || avgDw > 0.30) {
            confLabel = 'Low — see High-Risk section'
            confStyle = 'text-zinc-400'
          } else if (Math.max(avgHw, avgAw) > 0.65 && disScore < 0.08) {
            confLabel = 'High'
            confStyle = 'text-green-600 font-semibold'
          } else {
            confLabel = 'Medium'
            confStyle = 'text-amber-600 font-semibold'
          }

          const rec = poolPred ? topScoreline(poolPred.home_goals, poolPred.away_goals) : null

          return (
            <div key={fix.id} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {home?.flag_url} {home?.code ?? fix.home_team_id}
                    <span className="text-zinc-300 font-normal mx-1.5">vs</span>
                    {away?.code ?? fix.away_team_id} {away?.flag_url}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{berlinLabel(fix.kickoff_utc)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-400">Recommended Pick</p>
                  {rec ? (
                    <p className="text-xl font-bold text-zinc-900 mt-0.5">{rec.h}–{rec.a}</p>
                  ) : (
                    <p className="text-sm text-zinc-400">No prediction</p>
                  )}
                  <p className={`text-xs mt-0.5 ${confStyle}`}>Confidence: {confLabel}</p>
                </div>
                <Link
                  href={`/matches?fixture=${fix.id}&expand=true`}
                  className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
                >
                  Review & Lock →
                </Link>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Section 3: High-Risk Opportunities ────────────────────────────────────────

function HighRiskOpportunities({ needsPick }: { needsPick: SeedFixture[] }) {
  const allPreds = getPredictions()
  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))

  const risky = needsPick.flatMap(fix => {
    const preds = allPreds.filter(p => p.fixture_id === fix.id && ['A','B','C'].includes(p.model))
    if (preds.length < 2) return []

    const disScore = computeDisagreementScore(preds.map(p => ({ hw: p.home_win_prob, dw: p.draw_prob, aw: p.away_win_prob })))
    const avgDw    = preds.reduce((s, p) => s + p.draw_prob, 0) / preds.length

    if (disScore < 0.12 && avgDw <= 0.30) return []

    const reason = disScore >= 0.12 && avgDw > 0.30
      ? 'Models split on outcome and draw probability is elevated.'
      : disScore >= 0.12
      ? 'Models disagree materially on this fixture.'
      : 'Draw probability is unusually high across all models.'

    return [{ fix, preds, reason }]
  })

  if (risky.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> High-Risk Opportunities ({risky.length})
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">These matches can create leaderboard separation — manual review recommended.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {risky.map(({ fix, preds, reason }) => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          return (
            <div key={fix.id} className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {home?.flag_url} {home?.code} vs {away?.code} {away?.flag_url}
                </p>
                <p className="text-xs text-zinc-400">{berlinLabel(fix.kickoff_utc)}</p>
              </div>
              <div className="flex gap-3 flex-wrap text-xs">
                {(['A','B','C'] as const).map(m => {
                  const pred = preds.find(p => p.model === m)
                  if (!pred) return null
                  const s = topScoreline(pred.home_goals, pred.away_goals)
                  return (
                    <span key={m} className="rounded bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
                      Model {m}: {s.h}–{s.a}
                    </span>
                  )
                })}
              </div>
              <p className="text-xs text-zinc-500">{reason} Potential swing match.</p>
              <Link href={`/matches?fixture=${fix.id}&expand=true`} className="inline-block text-xs text-blue-600 underline">
                Review manually →
              </Link>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Section 4: Pool Leaderboard ────────────────────────────────────────────────

function PoolLeaderboard() {
  const rows = computePoolRows()
  if (rows.every(r => r.pts === 0 && r.count === 0)) return null

  const leader  = rows[0]
  const myRow   = rows.find(r => r.label === 'My Picks')
  const gap     = myRow && myRow.label !== leader.label ? leader.pts - myRow.pts : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-yellow-500" /> Pool Leaderboard
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Exact = 4 pts · Correct winner + goal diff = 2 pts · Correct winner = 1 pt</p>
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
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
          <span>Best performer: <span className="font-medium text-zinc-600">{leader.label}</span></span>
          {gap !== null && gap > 0 && (
            <span>Gap to leader: <span className="font-medium text-zinc-600">{gap} pt{gap !== 1 ? 's' : ''}</span></span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Live Intelligence (collapsed) ─────────────────────────────────────────────

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
          Live Intelligence
          {injuries.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold ml-1">
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
            <p className="text-xs text-zinc-400">
              {adjustments.length} teams adjusted · last updated{' '}
              {new Date(liveData.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <p className="text-xs text-zinc-400">No data — click Refresh to pull live ESPN data.</p>
          )}
          {injuries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1.5">⚠ Injury alerts</p>
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
              <p className="text-xs font-semibold text-zinc-500 mb-2">Team adjustments</p>
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

function generateRecommendationSnapshots(poolModel: 'A' | 'B' | 'C') {
  const allFixtures  = getFixtures()
  const allPreds     = getPredictions()
  const results      = getResults()
  const lockedPreds  = getLockedPredictions()
  const playedIds    = new Set(results.map(r => r.fixture_id))
  const lockedIds    = new Set(lockedPreds.map(p => p.fixture_id))
  const now          = new Date()

  allFixtures
    .filter(f => !playedIds.has(f.id) && !lockedIds.has(f.id) && new Date(f.kickoff_utc) > now)
    .forEach(f => {
      if (getPoolRecommendation(f.id)) return  // immutable — never overwrite
      const pred = allPreds.find(p => p.fixture_id === f.id && p.model === poolModel)
      if (!pred) return
      const sl = topScoreline(pred.home_goals, pred.away_goals)
      savePoolRecommendation({
        fixture_id: f.id,
        recommended_home: sl.h,
        recommended_away: sl.a,
        recommended_model: poolModel,
        recommendation_reason: `Model ${poolModel} leads pool scoring`,
      })
    })
}

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  const [window, setWindow]   = useState<BettingWindow>('24h')
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
      </div>
    )
  }

  const needsPick  = filterFixtures(window)
  const poolRows   = computePoolRows()
  // Pool leader = highest pts among models only (not "My Picks")
  const poolLeaderRow = poolRows.filter(r => r.label !== 'My Picks').sort((a, b) => b.pts - a.pts)[0] ?? null
  const poolLeader = poolLeaderRow ? { label: poolLeaderRow.label, pts: poolLeaderRow.pts } : null
  // Extract model letter for scoreline lookup ('A'|'B'|'C')
  const poolModel  = (poolLeaderRow?.model ?? 'A') as 'A' | 'B' | 'C'

  // Write immutable recommendation snapshots for all upcoming unlocked fixtures
  generateRecommendationSnapshots(poolModel)

  return (
    <div className="space-y-4">
      <BettingSummary needsPick={needsPick} poolLeader={poolLeader} />
      <PicksToSubmit needsPick={needsPick} window={window} onWindowChange={setWindow} poolModel={poolModel} />
      <HighRiskOpportunities needsPick={needsPick} />
      <PoolLeaderboard />
      <LiveIntelligencePanel />
    </div>
  )
}
