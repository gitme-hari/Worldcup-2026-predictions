'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getConfig, getTeams, getFixtures, getPredictions, getResult,
  computeMetrics, fetchLiveData, getLiveData,
} from '@/lib/store'
import type { ComputedMetrics } from '@/lib/store'
import { MODEL_LABELS, formatTime } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertTriangle, Calendar, ChevronRight, RefreshCw, TrendingUp, Zap, AlertCircle } from 'lucide-react'
import type { SeedPrediction } from '@/lib/seed-data'

type Outcome = 'H' | 'D' | 'A'

function probOutcome(p: SeedPrediction): Outcome {
  if (p.home_win_prob >= p.draw_prob && p.home_win_prob >= p.away_win_prob) return 'H'
  if (p.draw_prob > p.home_win_prob && p.draw_prob >= p.away_win_prob) return 'D'
  return 'A'
}

function getConsensusLevel(outs: Outcome[]): 'strong' | 'medium' | 'weak' {
  const c = { H: 0, D: 0, A: 0 }
  outs.forEach(o => c[o]++)
  const max = Math.max(c.H, c.D, c.A)
  return max === 3 ? 'strong' : max === 2 ? 'medium' : 'weak'
}

function matchDateLabel(utc: string) {
  const d = new Date(utc)
  const isToday = new Date().toISOString().split('T')[0] === new Date(utc).toISOString().split('T')[0]
  if (isToday) return `Today · ${formatTime(utc)}`
  return `${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${formatTime(utc)}`
}

// ── Priority 1: Model Recommendation ─────────────────────────────────────────

function ModelRecommendationCard() {
  const config = getConfig()
  const metrics = computeMetrics()
  const withData = metrics.filter(m => m.total > 0)
  const hasData = withData.length > 0

  // Leader = lowest Brier (best calibration), tiebreak by accuracy
  const leader: ComputedMetrics | null = withData.length
    ? withData.reduce((best, m) =>
        m.avgBrier < best.avgBrier || (m.avgBrier === best.avgBrier && m.accuracy > best.accuracy) ? m : best
      )
    : null

  const activeKey = config.active_model
  const activeMetrics = activeKey !== 'hybrid' ? metrics.find(m => m.model === activeKey) ?? null : null
  const activeIsLeader = !leader || activeKey === 'hybrid' || leader.model === activeKey

  function MetricCell({ label, m, highlight }: { label: string; m: ComputedMetrics; highlight?: boolean }) {
    return (
      <div className={`rounded-md px-3 py-2 space-y-0.5 ${highlight ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-zinc-50'}`}>
        <div className={`text-xs font-semibold ${highlight ? 'text-blue-700' : 'text-zinc-700'}`}>{label}</div>
        <div className="text-xs text-zinc-600">
          Acc <span className="font-medium">{(m.accuracy * 100).toFixed(0)}%</span>
          {' · '}Brier <span className="font-medium">{m.avgBrier.toFixed(3)}</span>
          {' · '}LL <span className="font-medium">{m.avgLogLoss.toFixed(3)}</span>
        </div>
        <div className="text-xs text-zinc-400">{m.total} matches evaluated</div>
      </div>
    )
  }

  function recommendation() {
    if (activeIsLeader) {
      const name = MODEL_LABELS[activeKey] ?? activeKey
      return (
        <div className="rounded-md bg-green-50 px-3 py-2.5 text-xs text-green-800">
          ✓ <strong>{name}</strong> is the current leader. No switch needed.
        </div>
      )
    }
    const better = leader!
    const reason =
      activeMetrics && better.avgBrier < activeMetrics.avgBrier && better.accuracy >= activeMetrics.accuracy
        ? 'Better accuracy and calibration.'
        : activeMetrics && better.avgBrier < activeMetrics.avgBrier
        ? 'Better calibration (lower Brier score).'
        : 'Higher prediction accuracy.'
    return (
      <div className="rounded-md bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
        Switch to <strong>{MODEL_LABELS[better.model]}</strong>. {reason}{' '}
        <Link href="/settings" className="underline font-semibold">Change →</Link>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />Model Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <p className="text-xs text-zinc-400">
            No matches evaluated yet — enter results on the{' '}
            <Link href="/results" className="underline text-blue-600">Results page</Link>.
          </p>
        ) : (
          <>
            <div className={`grid gap-2 ${activeIsLeader ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {activeMetrics && activeMetrics.total > 0 && (
                <MetricCell label={`Active: ${MODEL_LABELS[activeKey] ?? activeKey}`} m={activeMetrics} />
              )}
              {!activeIsLeader && leader && (
                <MetricCell label={`Leader: ${MODEL_LABELS[leader.model]}`} m={leader} highlight />
              )}
            </div>
            {recommendation()}
          </>
        )}
        <div className="flex items-center justify-between pt-0.5 text-xs text-zinc-400">
          <span>Active: <span className="font-medium text-zinc-700">{MODEL_LABELS[activeKey] ?? activeKey}</span></span>
          <Link href="/settings" className="hover:text-zinc-700 underline">Change</Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Priority 2: Upcoming Consensus ────────────────────────────────────────────

const CHIP_COLORS = ['bg-blue-50 text-blue-700', 'bg-violet-50 text-violet-700', 'bg-emerald-50 text-emerald-700']
const CONSENSUS_STYLES = {
  strong: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  weak:   'bg-red-100 text-red-700',
}

function UpcomingConsensus() {
  const fixtures = getFixtures()
  const teams = getTeams()
  const predictions = getPredictions()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const predMap: Record<string, Record<string, SeedPrediction>> = {}
  predictions.forEach(p => {
    if (!predMap[p.fixture_id]) predMap[p.fixture_id] = {}
    predMap[p.fixture_id][p.model] = p
  })

  const upcoming = fixtures
    .filter(f => !getResult(f.id))
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .slice(0, 8)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />Upcoming Matches
        </CardTitle>
        <Link href="/matches" className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {upcoming.length === 0 ? (
          <p className="px-4 py-4 text-xs text-zinc-400">No upcoming matches.</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {upcoming.map(f => {
              const home = teamMap[f.home_team_id]
              const away = teamMap[f.away_team_id]
              const fp = predMap[f.id] ?? {}
              const models = ['A', 'B', 'C'] as const
              const preds = models.map(m => fp[m] ?? null)
              const outs = preds.map(p => p ? probOutcome(p) : null)
              const validOuts = outs.filter((o): o is Outcome => o !== null)
              const level = validOuts.length >= 2 ? getConsensusLevel(validOuts) : null

              return (
                <Link key={f.id} href="/matches" className="block px-4 py-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-base leading-none">{home?.flag_url}</span>
                      <span className="text-xs font-bold text-zinc-900">{home?.code}</span>
                      <span className="text-xs text-zinc-300 mx-0.5">vs</span>
                      <span className="text-xs font-bold text-zinc-900">{away?.code}</span>
                      <span className="text-base leading-none">{away?.flag_url}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {models.map((m, i) => {
                        const out = outs[i]
                        if (!out) return null
                        const label = out === 'H' ? (home?.code ?? 'H') : out === 'A' ? (away?.code ?? 'A') : 'D'
                        return (
                          <span key={m} className={`px-1.5 py-0.5 rounded text-xs font-medium ${CHIP_COLORS[i]}`}>
                            {m}:{label}
                          </span>
                        )
                      })}
                      {level && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONSENSUS_STYLES[level]}`}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {f.group ? `Group ${f.group}` : f.stage.toUpperCase()} · {matchDateLabel(f.kickoff_utc)}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Priority 3: Review Queue ─────────────────────────────────────────────────

function ReviewQueue() {
  const fixtures = getFixtures()
  const teams = getTeams()
  const predictions = getPredictions()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const predMap: Record<string, Record<string, SeedPrediction>> = {}
  predictions.forEach(p => {
    if (!predMap[p.fixture_id]) predMap[p.fixture_id] = {}
    predMap[p.fixture_id][p.model] = p
  })

  const upcoming = fixtures
    .filter(f => !getResult(f.id))
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .slice(0, 20)

  const reviewItems = upcoming.flatMap(f => {
    const fp = predMap[f.id] ?? {}
    const preds = (['A', 'B', 'C'] as const).map(m => fp[m]).filter((p): p is SeedPrediction => !!p)
    if (preds.length < 2) return []

    const outs = preds.map(probOutcome)
    const level = getConsensusLevel(outs)
    const avgDraw = preds.reduce((s, p) => s + p.draw_prob, 0) / preds.length
    const maxConf = Math.max(...preds.flatMap(p => [p.home_win_prob, p.draw_prob, p.away_win_prob]))

    let reason: string | null = null
    if (level === 'weak') reason = 'Models disagree'
    else if (avgDraw > 0.27) reason = 'Elevated draw probability'
    else if (maxConf < 0.50) reason = 'High uncertainty'
    if (!reason) return []
    return [{ f, reason }]
  }).slice(0, 5)

  if (reviewItems.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Matches Requiring Review
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-50">
          {reviewItems.map(({ f, reason }) => {
            const home = teamMap[f.home_team_id]
            const away = teamMap[f.away_team_id]
            return (
              <Link key={f.id} href="/matches"
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">{home?.flag_url}</span>
                  <span className="text-sm font-semibold text-zinc-900">{home?.code}</span>
                  <span className="text-xs text-zinc-400">vs</span>
                  <span className="text-sm font-semibold text-zinc-900">{away?.code}</span>
                  <span className="text-base leading-none">{away?.flag_url}</span>
                </div>
                <span className="text-xs text-zinc-500 shrink-0 text-right">{reason}</span>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Live Intelligence (collapsed by default) ──────────────────────────────────

function LiveIntelligencePanel() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [liveData, setLiveData] = useState(() => getLiveData())
  const [error, setError] = useState<string | null>(null)

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

  const injuries = liveData?.newsItems.filter(n => n.type === 'injury') ?? []
  const adjustments = liveData
    ? Object.entries(liveData.teamAdjustments).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-green-500" />Live Intelligence
          {injuries.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
              {injuries.length}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh} disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
          <button onClick={() => setOpen(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-800 underline">
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </CardHeader>

      {/* Always surface injury alerts even when collapsed */}
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
        </CardContent>
      )}

      {error && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />{error}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
    </div>
  )
  return (
    <div className="space-y-4">
      <ModelRecommendationCard />
      <UpcomingConsensus />
      <ReviewQueue />
      <LiveIntelligencePanel />
    </div>
  )
}
