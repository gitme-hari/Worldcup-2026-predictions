'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getFixtures, getTeams, getPredictions, getResults, getLockedPredictions,
  computeMetrics, fetchLiveData, getLiveData,
  savePoolRecommendation, getPoolRecommendation,
} from '@/lib/store'
import type { SeedFixture } from '@/lib/seed-data'
import { buildRecommendation } from '@/lib/recommendation-engine'
import { buildTeamAdjustments, teamSignal, hasNotableSignal } from '@/lib/learning-layer'
import { computeDisagreementScore } from '@/lib/analytics'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, CheckCircle, ClipboardList, RefreshCw, TrendingUp, Trophy } from 'lucide-react'

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

function poissonModeScoreline(hl: number, al: number): { h: number; a: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      let p = Math.exp(-(hl + al))
      for (let i = 1; i <= h; i++) p *= hl / i
      for (let i = 1; i <= a; i++) p *= al / i
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

// ── Pool rows: My Picks + model benchmarks ─────────────────────────────────────

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
const WINDOW_LABELS: Record<BettingWindow, string> = { '24h': 'Next 24h', '36h': 'Next 36h', all: 'All' }

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
    if (new Date(f.kickoff_utc) <= now) return false
    if (cutoff && new Date(f.kickoff_utc) > cutoff) return false
    return true
  }).sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
}

// ── Section 1: Action Summary ─────────────────────────────────────────────────
// Answers "what do I need to do?" and "where am I in the pool?"

function ActionSummary({ needsPick, poolRows }: {
  needsPick: SeedFixture[]
  poolRows: ReturnType<typeof computePoolRows>
}) {
  const first    = needsPick[0]
  const deadline = first ? timeUntil(first.kickoff_utc) : null
  const teams    = getTeams()
  const firstTeams = first ? (() => {
    const h = teams.find(t => t.id === first.home_team_id)
    const a = teams.find(t => t.id === first.away_team_id)
    return `${h?.flag_url ?? ''} ${h?.code ?? '?'} vs ${a?.code ?? '?'} ${a?.flag_url ?? ''}`
  })() : null

  const myRow    = poolRows.find(r => r.label === 'My Picks')
  const bestModel = poolRows.filter(r => r.model !== 'me').sort((a, b) => b.pts - a.pts)[0]
  const gap = myRow && bestModel ? bestModel.pts - myRow.pts : null

  const hasData = (myRow?.count ?? 0) > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-blue-500" /> Action Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {/* Picks needed */}
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-3">
            {needsPick.length > 0 ? (
              <>
                <p className="text-2xl font-black text-zinc-900 tabular-nums">{needsPick.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  pick{needsPick.length !== 1 ? 's' : ''} needed
                </p>
                {deadline && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    First in {deadline}
                  </p>
                )}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-500 mb-1" />
                <p className="text-xs text-zinc-500">All picks locked</p>
              </>
            )}
          </div>

          {/* Pool position */}
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-3">
            {hasData ? (
              <>
                <p className="text-2xl font-black text-zinc-900 tabular-nums">{myRow!.pts}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  my pts{myRow!.count > 0 ? ` · ${myRow!.avg.toFixed(1)}/match` : ''}
                </p>
                {gap !== null && gap > 0 && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    −{gap} vs {bestModel?.label}
                  </p>
                )}
                {gap !== null && gap <= 0 && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Leading pool
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-zinc-300">—</p>
                <p className="text-xs text-zinc-400 mt-0.5">no results yet</p>
              </>
            )}
          </div>
        </div>

        {/* Upcoming fixture teaser */}
        {firstTeams && (
          <p className="mt-2.5 text-[11px] text-zinc-400">
            Next: {firstTeams} · {berlinLabel(first!.kickoff_utc)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 2: Picks to Submit ─────────────────────────────────────────────────
// Engine recommendation per fixture — no model labels in primary view

function PicksToSubmit({ needsPick, window, onWindowChange, learningAdjs }: {
  needsPick: SeedFixture[]
  window: BettingWindow
  onWindowChange: (w: BettingWindow) => void
  learningAdjs: ReturnType<typeof buildTeamAdjustments>
}) {
  const allPreds = getPredictions()
  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" /> Picks to Submit
        </CardTitle>
        <div className="flex gap-1.5 mt-2">
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
          <div className="flex items-center gap-2 py-3 text-sm text-zinc-400">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            All picks locked for this window.
          </div>
        ) : needsPick.map(fix => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          const preds = allPreds.filter(p => p.fixture_id === fix.id)

          // Engine recommendation (uses all three models)
          const rec = buildRecommendation(preds)

          // Tournament learning signals for this fixture's teams
          const homeAdj = learningAdjs.find(a => a.teamId === fix.home_team_id)
          const awayAdj = learningAdjs.find(a => a.teamId === fix.away_team_id)
          const signals = [
            ...(homeAdj && hasNotableSignal(homeAdj) ? [{ ...teamSignal(homeAdj), teamName: home?.name ?? homeAdj.teamName }] : []),
            ...(awayAdj && hasNotableSignal(awayAdj) ? [{ ...teamSignal(awayAdj), teamName: away?.name ?? awayAdj.teamName }] : []),
          ]

          const confStyle =
            rec?.confidence === 'High'   ? 'text-emerald-600' :
            rec?.confidence === 'Medium' ? 'text-amber-600' : 'text-zinc-400'

          return (
            <div key={fix.id} className="rounded-lg border border-zinc-100 bg-white p-3 space-y-2">
              {/* Fixture header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {home?.flag_url} {home?.code ?? fix.home_team_id}
                    <span className="text-zinc-300 font-normal mx-1.5">vs</span>
                    {away?.code ?? fix.away_team_id} {away?.flag_url}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{berlinLabel(fix.kickoff_utc)}</p>
                </div>
              </div>

              {/* Recommendation + CTA row */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Engine recommendation</p>
                  {rec ? (
                    <p className="text-2xl font-black text-zinc-900 tabular-nums leading-tight mt-0.5">
                      {rec.scoreline.home}–{rec.scoreline.away}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-300 mt-0.5">No prediction</p>
                  )}
                  {rec && (
                    <p className={`text-xs mt-0.5 font-medium ${confStyle}`}>
                      {rec.confidence} confidence
                    </p>
                  )}
                </div>
                <Link
                  href={`/matches?fixture=${fix.id}&expand=true`}
                  className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
                >
                  Review & Lock →
                </Link>
              </div>

              {/* Tournament context signals */}
              {signals.length > 0 && (
                <div className="border-t border-zinc-50 pt-2 space-y-0.5">
                  {signals.map((s, i) => {
                    const arrowCls =
                      s.colour === 'emerald' ? 'text-emerald-600' :
                      s.colour === 'red'     ? 'text-red-500' : 'text-amber-500'
                    const textCls =
                      s.colour === 'emerald' ? 'text-emerald-700' :
                      s.colour === 'red'     ? 'text-red-600' : 'text-amber-600'
                    return (
                      <p key={i} className="text-[11px] flex items-center gap-1">
                        <span className={`font-bold ${arrowCls}`}>{s.arrow}</span>
                        <span className="text-zinc-500">{s.teamName}</span>
                        <span className={textCls}>{s.headline.toLowerCase()}</span>
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Section 3: Pool Position ───────────────────────────────────────────────────
// My Picks is the hero. Models are benchmarks.

function PoolPosition({ poolRows }: { poolRows: ReturnType<typeof computePoolRows> }) {
  const [showFull, setShowFull] = useState(false)

  if (poolRows.every(r => r.pts === 0 && r.count === 0)) return null

  const myRow     = poolRows.find(r => r.model === 'me')
  const modelRows = poolRows.filter(r => r.model !== 'me').sort((a, b) => b.pts - a.pts)
  const bestModel = modelRows[0]
  const gap       = myRow && bestModel ? bestModel.pts - myRow.pts : null

  const myRank    = poolRows.findIndex(r => r.model === 'me') + 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-blue-500" /> Pool Position
        </CardTitle>
        <p className="text-[10px] text-zinc-400 mt-0.5">
          Exact = 4 pts · Correct winner + GD = 2 pts · Correct winner = 1 pt
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* My picks — hero */}
        {myRow ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">My Picks</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums leading-tight">{myRow.pts} pts</p>
              {myRow.count > 0 && (
                <p className="text-xs text-zinc-500">{myRow.avg.toFixed(2)}/match · {myRow.count} played</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Rank</p>
              <p className="text-2xl font-black text-zinc-900">#{myRank}</p>
            </div>
          </div>
        ) : null}

        {/* Benchmark summary */}
        {bestModel && (
          <div className="rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2.5 text-xs space-y-1">
            <p className="font-semibold text-zinc-600">Benchmark</p>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{bestModel.label} leads models</span>
              <span className="font-semibold text-zinc-700">{bestModel.pts} pts</span>
            </div>
            {gap !== null && gap > 0 && (
              <p className="text-red-500 font-medium">You are {gap} pt{gap !== 1 ? 's' : ''} behind</p>
            )}
            {gap !== null && gap <= 0 && (
              <p className="text-emerald-600 font-medium">You are ahead of all benchmarks</p>
            )}
          </div>
        )}

        {/* Full leaderboard — collapsed */}
        <button
          onClick={() => setShowFull(v => !v)}
          className="w-full text-left text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {showFull ? '▲ Hide' : '▶ Full leaderboard'}
        </button>
        {showFull && (
          <div className="space-y-1.5">
            {poolRows.map((row, i) => {
              const isMe = row.model === 'me'
              return (
                <div key={row.label}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    isMe ? 'bg-blue-50 border border-blue-100' : 'bg-zinc-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-4">#{i + 1}</span>
                    <span className={`font-medium ${isMe ? 'text-blue-700' : 'text-zinc-700'}`}>{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{row.count}G</span>
                    <span className="font-semibold text-zinc-700 tabular-nums w-10 text-right">{row.pts} pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section 4: Uncertain Fixtures ─────────────────────────────────────────────
// Fixtures where the engine has low confidence — shown without model labels

function UncertainFixtures({ needsPick }: { needsPick: SeedFixture[] }) {
  const allPreds = getPredictions()
  const teams    = getTeams()
  const teamMap  = Object.fromEntries(teams.map(t => [t.id, t]))

  const uncertain = needsPick.flatMap(fix => {
    const preds = allPreds.filter(p => p.fixture_id === fix.id && ['A', 'B', 'C'].includes(p.model))
    if (preds.length < 2) return []
    const disScore = computeDisagreementScore(preds.map(p => ({ hw: p.home_win_prob, dw: p.draw_prob, aw: p.away_win_prob })))
    const avgDw    = preds.reduce((s, p) => s + p.draw_prob, 0) / preds.length
    if (disScore < 0.12 && avgDw <= 0.30) return []

    const rec     = buildRecommendation(preds)
    const reason  = disScore >= 0.12 && avgDw > 0.30 ? 'Models split · draw likely'
      : disScore >= 0.12 ? 'Models disagree on outcome'
      : 'Draw probability elevated'

    return [{ fix, rec, reason }]
  })

  if (uncertain.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Uncertain Fixtures ({uncertain.length})
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">
          These matches carry higher variance — worth reviewing before locking.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {uncertain.map(({ fix, rec, reason }) => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          return (
            <div key={fix.id} className="space-y-1.5">
              <p className="text-sm font-semibold text-zinc-900">
                {home?.flag_url} {home?.code} vs {away?.code} {away?.flag_url}
              </p>
              <p className="text-xs text-zinc-400">{berlinLabel(fix.kickoff_utc)}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {rec ? (
                  <span className="rounded bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">
                    Engine: {rec.scoreline.home}–{rec.scoreline.away}
                  </span>
                ) : null}
                <span className="rounded bg-amber-50 border border-amber-100 px-2.5 py-1 text-amber-700">
                  {reason}
                </span>
              </div>
              <Link
                href={`/matches?fixture=${fix.id}&expand=true`}
                className="inline-block text-xs text-blue-600 hover:underline"
              >
                Review manually →
              </Link>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Section 5: Live Intelligence ──────────────────────────────────────────────

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

  if (!liveData && injuries.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-zinc-500">Live Intelligence</CardTitle>
          <button onClick={handleRefresh} disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-zinc-400">No live data — click Refresh to pull latest injury news.</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
          Live Intelligence
          {injuries.length > 0 && (
            <span className="rounded-full bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5">
              {injuries.length}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
          <button onClick={() => setOpen(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-800 underline">
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </CardHeader>

      {/* Preview: show top injury without expanding */}
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
          {liveData && (
            <p className="text-xs text-zinc-400">
              {adjustments.length} team adjustment{adjustments.length !== 1 ? 's' : ''} · updated{' '}
              {new Date(liveData.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {injuries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1.5">Injury alerts</p>
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
              <p className="text-xs font-semibold text-zinc-500 mb-2">Live team adjustments</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {adjustments.map(([id, adj]) => (
                  <div key={id} className="flex items-center justify-between rounded bg-zinc-50 px-2.5 py-1.5">
                    <span className="text-xs text-zinc-700 font-medium truncate">{id.toUpperCase()}</span>
                    <span className={`text-xs font-bold ml-2 shrink-0 ${adj > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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

// ── Pool recommendation snapshots ─────────────────────────────────────────────
// Write-once snapshot per fixture using the engine recommendation.

function generateRecommendationSnapshots() {
  const allFixtures = getFixtures()
  const allPreds    = getPredictions()
  allFixtures.forEach(f => {
      if (getPoolRecommendation(f.id)) return  // immutable — never overwrite
      const preds = allPreds.filter(p => p.fixture_id === f.id)
      const rec   = buildRecommendation(preds)
      if (!rec) {
        // Fallback: mode scoreline from first available prediction
        const pred = preds[0]
        if (!pred) return
        const sl = poissonModeScoreline(pred.home_goals, pred.away_goals)
        savePoolRecommendation({
          fixture_id: f.id,
          recommended_home: sl.h,
          recommended_away: sl.a,
          recommended_model: (pred.model as 'A' | 'B' | 'C') ?? 'A',
          recommendation_reason: 'WC26 Recommendation Engine',
        })
        return
      }
      const matchingModel = (['A', 'B', 'C'] as const).find(m => {
        const sl = rec.modelScorelines[m]
        return sl && sl.h === rec.scoreline.home && sl.a === rec.scoreline.away
      }) ?? 'A'
      savePoolRecommendation({
        fixture_id: f.id,
        recommended_home: rec.scoreline.home,
        recommended_away: rec.scoreline.away,
        recommended_model: matchingModel,
        recommendation_reason: 'WC26 Recommendation Engine',
      })
    })
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  const [pickWindow, setPickWindow] = useState<BettingWindow>('24h')
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
      </div>
    )
  }

  const needsPick    = filterFixtures(pickWindow)
  const poolRows     = computePoolRows()
  const allPreds     = getPredictions()

  // Build tournament learning signals once for all teams
  const learningAdjs = buildTeamAdjustments(getTeams(), getFixtures(), getResults(), allPreds)

  // Write immutable recommendation snapshots for upcoming fixtures
  generateRecommendationSnapshots()

  return (
    <div className="space-y-4">
      <ActionSummary needsPick={needsPick} poolRows={poolRows} />
      <PicksToSubmit
        needsPick={needsPick}
        window={pickWindow}
        onWindowChange={setPickWindow}
        learningAdjs={learningAdjs}
      />
      <UncertainFixtures needsPick={needsPick} />
      <PoolPosition poolRows={poolRows} />
      <LiveIntelligencePanel />
    </div>
  )
}
