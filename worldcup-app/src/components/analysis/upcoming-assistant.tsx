'use client'

import { getFixtures, getTeams, getResults, getPredictions, computeMetrics } from '@/lib/store'
import { computeDisagreementScore } from '@/lib/analytics'
import { MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

const pct = (n: number) => `${Math.round(n * 100)}%`

type MatchType = 'Heavy favorite' | 'Draw candidate' | 'Balanced' | 'Model conflict'
type ActionConf = 'High' | 'Medium' | 'Low'
interface FixtureAdvice {
  matchType: MatchType
  action: string
  confidence: ActionConf
  reason: string
}

function classifyFixture(
  preds: Array<{ hw: number; dw: number; aw: number }>,
  disagreementScore: number,
  bestModel: string | null,
): FixtureAdvice {
  if (preds.length === 0) {
    return { matchType: 'Balanced', action: 'No data', confidence: 'Low', reason: 'No model predictions available for this fixture.' }
  }

  // Averages across available models
  const avgHw = preds.reduce((s, p) => s + p.hw, 0) / preds.length
  const avgDw = preds.reduce((s, p) => s + p.dw, 0) / preds.length
  const avgAw = preds.reduce((s, p) => s + p.aw, 0) / preds.length
  const topOutcomeProb = Math.max(avgHw, avgAw)

  const isHeavyFavorite = topOutcomeProb > 0.65
  const isDrawCandidate = avgDw > 0.30
  const isMaterialDisagreement = disagreementScore >= 0.12

  // Match type — conflict takes priority over others
  let matchType: MatchType
  if (isMaterialDisagreement) {
    matchType = 'Model conflict'
  } else if (isHeavyFavorite) {
    matchType = 'Heavy favorite'
  } else if (isDrawCandidate) {
    matchType = 'Draw candidate'
  } else {
    matchType = 'Balanced'
  }

  // Action + confidence + reason
  if (isMaterialDisagreement) {
    return {
      matchType,
      action: 'Review manually',
      confidence: 'Low',
      reason: `Models diverge significantly on this fixture — check each model's probabilities before locking a prediction.`,
    }
  }

  if (isHeavyFavorite && disagreementScore < 0.08) {
    return {
      matchType,
      action: 'Trust any model',
      confidence: 'High',
      reason: `All models agree on a clear favourite (avg ${pct(topOutcomeProb)} win prob) — the choice of model won't change the outcome.`,
    }
  }

  if (isDrawCandidate) {
    return {
      matchType,
      action: 'Review manually',
      confidence: 'Low',
      reason: `Draw probability is elevated (avg ${pct(avgDw)}) — draw candidates are harder to call and models may underestimate draws.`,
    }
  }

  // Balanced match — models loosely agree, use best overall model
  if (bestModel) {
    return {
      matchType,
      action: `Use Model ${bestModel}`,
      confidence: 'Medium',
      reason: `Fixture is balanced and models broadly agree — defer to the best-calibrated model for a small edge.`,
    }
  }

  return {
    matchType,
    action: 'Review manually',
    confidence: 'Low',
    reason: 'Not enough historical data to recommend a model yet.',
  }
}

const CONF_BADGE: Record<ActionConf, string> = {
  High:   'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-zinc-100 text-zinc-500',
}

const TYPE_BADGE: Record<MatchType, string> = {
  'Heavy favorite': 'bg-blue-50 text-blue-700',
  'Draw candidate': 'bg-purple-50 text-purple-700',
  'Balanced':       'bg-zinc-50 text-zinc-600',
  'Model conflict': 'bg-red-50 text-red-600',
}

export function UpcomingAssistant() {
  const fixtures = getFixtures()
  const teams = getTeams()
  const results = getResults()
  const allPreds = getPredictions()
  const metrics = computeMetrics()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const playedIds = new Set(results.map(r => r.fixture_id))
  const now = new Date()

  const upcoming = fixtures
    .filter(f => !playedIds.has(f.id) && new Date(f.kickoff_utc) >= now)
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .slice(0, 5)

  const bestByBrier = [...metrics]
    .filter(m => m.total > 0)
    .sort((a, b) => a.avgBrier - b.avgBrier)[0]

  if (upcoming.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Lightbulb className="h-3.5 w-3.5" /> Upcoming Match Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">No upcoming fixtures found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Lightbulb className="h-3.5 w-3.5" /> Upcoming Match Assistant
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Next {upcoming.length} fixtures — per-match action and confidence</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map(fix => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          const predA = allPreds.find(p => p.fixture_id === fix.id && p.model === 'A')
          const predB = allPreds.find(p => p.fixture_id === fix.id && p.model === 'B')
          const predC = allPreds.find(p => p.fixture_id === fix.id && p.model === 'C')
          const available = [predA, predB, predC].filter(Boolean)

          const disagreementScore = available.length >= 2
            ? computeDisagreementScore(available.map(p => ({ hw: p!.home_win_prob, dw: p!.draw_prob, aw: p!.away_win_prob })))
            : 0

          const advice = classifyFixture(
            available.map(p => ({ hw: p!.home_win_prob, dw: p!.draw_prob, aw: p!.away_win_prob })),
            disagreementScore,
            bestByBrier?.model ?? null,
          )

          const kickoff = new Date(fix.kickoff_utc)
          const dateStr = kickoff.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          const timeStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={fix.id} className="rounded-lg border border-zinc-100 p-3 space-y-2.5">

              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <span>{home?.flag_url}</span>
                    <span>{home?.code ?? fix.home_team_id}</span>
                    <span className="text-zinc-300 font-normal">vs</span>
                    <span>{away?.code ?? fix.away_team_id}</span>
                    <span>{away?.flag_url}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Group {fix.group} · {dateStr} {timeStr}</p>
                </div>
                {/* Match type tag */}
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[advice.matchType]}`}>
                  {advice.matchType}
                </span>
              </div>

              {/* Model probabilities */}
              <div className="grid grid-cols-3 gap-2">
                {([['A', predA], ['B', predB], ['C', predC]] as const).map(([m, pred]) => (
                  <div
                    key={m}
                    className={`rounded p-2 text-center ${bestByBrier?.model === m ? 'bg-zinc-100 ring-1 ring-zinc-300' : 'bg-zinc-50'}`}
                  >
                    <div className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs mb-1 ${MODEL_COLORS[m]}`}>{m}</div>
                    {pred ? (
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between text-zinc-600"><span>H</span><span className="font-semibold">{pct(pred.home_win_prob)}</span></div>
                        <div className="flex justify-between text-zinc-400"><span>D</span><span>{pct(pred.draw_prob)}</span></div>
                        <div className="flex justify-between text-zinc-600"><span>A</span><span className="font-semibold">{pct(pred.away_win_prob)}</span></div>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action strip */}
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
        })}
      </CardContent>
    </Card>
  )
}
