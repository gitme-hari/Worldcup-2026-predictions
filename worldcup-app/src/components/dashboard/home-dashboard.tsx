'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConfig, getTeams, getFixtures, getPredictions, getResult, fetchLiveData, getLiveData } from '@/lib/store'
import { getEffectivePrediction } from '@/lib/models'
import { MODEL_LABELS, MODEL_COLORS, formatTime, pct, goals } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Zap, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react'

const TEAM_NAMES: Record<string, string> = {
  usa:'United States',uru:'Uruguay',pan:'Panama',bol:'Bolivia',arg:'Argentina',
  chi:'Chile',per:'Peru',pol:'Poland',bra:'Brazil',col:'Colombia',ecu:'Ecuador',
  par:'Paraguay',fra:'France',bel:'Belgium',tun:'Tunisia',mar:'Morocco',
  ger:'Germany',esp:'Spain',den:'Denmark',tur:'Turkey',eng:'England',
  ned:'Netherlands',irn:'Iran',wal:'Wales',por:'Portugal',cro:'Croatia',
  ksa:'Saudi Arabia',aus:'Australia',ita:'Italy',sui:'Switzerland',nga:'Nigeria',
  kor:'South Korea',jpn:'Japan',sen:'Senegal',cmr:'Cameroon',nzl:'New Zealand',
  mex:'Mexico',can:'Canada',crc:'Costa Rica',ukr:'Ukraine',egy:'Egypt',
  civ:"Côte d'Ivoire",alg:'Algeria',rsa:'South Africa',svk:'Slovakia',
  aut:'Austria',rom:'Romania',mli:'Mali',
}

function ActiveModelCard() {
  const config = getConfig()
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-3 text-white">
      <div>
        <div className="text-xs text-zinc-400">Active Model</div>
        <div className="text-base font-bold">{MODEL_LABELS[config.active_model]}</div>
        {config.active_model === 'hybrid' && (
          <div className="text-xs text-zinc-400 mt-0.5">A:{config.weight_a} B:{config.weight_b} C:{config.weight_c}</div>
        )}
      </div>
      <Link href="/settings" className="text-xs text-zinc-400 hover:text-white underline">Change</Link>
    </div>
  )
}

function TodayMatches() {
  const fixtures = getFixtures()
  const teams = getTeams()
  const predictions = getPredictions()
  const config = getConfig()
  const todayStr = new Date().toISOString().split('T')[0]

  const todayMatches = fixtures
    .filter(f => new Date(f.kickoff_utc).toISOString().split('T')[0] === todayStr)
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />Today's Matches
        </CardTitle>
        <Link href="/matches" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          All matches <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {todayMatches.length === 0 ? (
          <p className="px-4 py-4 text-xs text-zinc-400">No matches today.</p>
        ) : todayMatches.map(f => {
          const home = teamMap[f.home_team_id]
          const away = teamMap[f.away_team_id]
          const pred = getEffectivePrediction(predictions as any, f.id, config.active_model, {
            a: config.weight_a, b: config.weight_b, c: config.weight_c,
          })
          const result = getResult(f.id)

          return (
            <Link key={f.id} href="/matches" className="block border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{home?.flag_url}</span>
                    <span className="text-sm font-semibold text-zinc-900">{home?.code}</span>
                    {result ? (
                      <span className="text-sm font-black text-zinc-900 mx-1">{result.home_goals}–{result.away_goals}</span>
                    ) : pred ? (
                      <span className="text-sm font-medium text-zinc-400 mx-1">{goals(pred.home_goals)}–{goals(pred.away_goals)}</span>
                    ) : (
                      <span className="text-sm text-zinc-300 mx-1">vs</span>
                    )}
                    <span className="text-sm font-semibold text-zinc-900">{away?.code}</span>
                    <span className="text-lg">{away?.flag_url}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result ? <Badge variant="success">Final</Badge> : <Badge variant="warning">Today</Badge>}
                    <span className="text-xs text-zinc-400">{f.group ? `Grp ${f.group}` : f.stage.toUpperCase()}</span>
                    <span className="text-xs text-zinc-400">{formatTime(f.kickoff_utc)}</span>
                  </div>
                </div>
                {pred && !result && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-100 flex">
                      <div className="h-full bg-blue-500 rounded-l-full" style={{ width: `${pred.home_win_prob * 100}%` }} />
                      <div className="h-full bg-zinc-300" style={{ width: `${pred.draw_prob * 100}%` }} />
                      <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${pred.away_win_prob * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">{pct(pred.home_win_prob)} / {pct(pred.draw_prob)} / {pct(pred.away_win_prob)}</span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function LiveIntelligencePanel() {
  const [loading, setLoading] = useState(false)
  const [liveData, setLiveData] = useState(() => getLiveData())
  const [error, setError] = useState<string | null>(null)
  const [showLog, setShowLog] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLiveData()
      setLiveData(data)
      window.dispatchEvent(new Event('storage'))
    } catch {
      setError('Failed to fetch live data')
    } finally {
      setLoading(false)
    }
  }

  const adjustments = liveData
    ? Object.entries(liveData.teamAdjustments).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : []
  const injuryItems = liveData?.newsItems.filter(n => n.type === 'injury') ?? []
  const positiveItems = liveData?.newsItems.filter(n => n.type === 'positive') ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-green-500" />Live Intelligence
        </CardTitle>
        <div className="flex items-center gap-2">
          {liveData && adjustments.length > 0 && (
            <button onClick={() => setShowLog(v => !v)} className="text-xs text-blue-600 hover:underline">
              {showLog ? 'Hide log' : 'View log'}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!liveData ? (
          <p className="text-xs text-zinc-400">No data yet — click Refresh to pull live ESPN data.</p>
        ) : (
          <div className="text-xs text-zinc-400">
            {adjustments.length} teams adjusted · {injuryItems.length} injury alerts · last updated{' '}
            {new Date(liveData.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />{error}
          </div>
        )}

        {/* Always show injury alerts when present */}
        {!showLog && injuryItems.length > 0 && (
          <div className="mt-3 space-y-1">
            {injuryItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs bg-red-50 rounded px-2.5 py-1.5">
                <span className="text-red-400 shrink-0 mt-0.5">●</span>
                <span className="text-zinc-600">{item.headline}</span>
              </div>
            ))}
          </div>
        )}

        {showLog && liveData && (
          <div className="mt-3 space-y-4 border-t border-zinc-100 pt-3">
            {adjustments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-500 mb-2">Team rating adjustments</div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {adjustments.map(([id, adj]) => (
                    <div key={id} className="flex items-center justify-between rounded bg-zinc-50 px-2.5 py-1.5">
                      <span className="text-xs text-zinc-700 font-medium truncate">{TEAM_NAMES[id] ?? id}</span>
                      <span className={`text-xs font-bold ml-2 shrink-0 ${adj > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {adj > 0 ? '+' : ''}{(adj * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">Green = boosted · Red = downgraded</p>
              </div>
            )}
            {injuryItems.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-500 mb-1.5">⚠ Injury / suspension alerts</div>
                <div className="space-y-1">
                  {injuryItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs bg-red-50 rounded px-2.5 py-1.5">
                      <span className="text-red-400 shrink-0 mt-0.5">●</span>
                      <span className="text-zinc-600">{item.headline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {positiveItems.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-600 mb-1.5">✓ Positive updates</div>
                <div className="space-y-1">
                  {positiveItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs bg-green-50 rounded px-2.5 py-1.5">
                      <span className="text-green-500 shrink-0 mt-0.5">●</span>
                      <span className="text-zinc-600">{item.headline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HomeDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
    </div>
  )
  return (
    <div className="space-y-4">
      <ActiveModelCard />
      <TodayMatches />
      <LiveIntelligencePanel />
    </div>
  )
}
