'use client'

import { getFixtures, getTeams, getResults, getPredictions, computeMetrics } from '@/lib/store'
import { computeDisagreementScore } from '@/lib/analytics'
import { MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb } from 'lucide-react'

const pct = (n: number) => `${Math.round(n * 100)}%`

function DisagreementBadge({ score }: { score: number }) {
  if (score < 0.08) return <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Low</Badge>
  if (score < 0.15) return <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Med</Badge>
  return <Badge variant="outline" className="text-red-500 border-red-300 text-xs">High</Badge>
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
          <CardTitle className="flex items-center gap-1.5">
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
        <CardTitle className="flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" /> Upcoming Match Assistant
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">
          Next {upcoming.length} fixtures · all 3 model predictions · disagreement signal
          {bestByBrier && (
            <> · recommended: <span className={`inline-flex rounded px-1 py-0.5 text-white text-xs ml-0.5 ${MODEL_COLORS[bestByBrier.model]}`}>
              Model {bestByBrier.model}
            </span></>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map(fix => {
          const home = teamMap[fix.home_team_id]
          const away = teamMap[fix.away_team_id]
          const predA = allPreds.find(p => p.fixture_id === fix.id && p.model === 'A')
          const predB = allPreds.find(p => p.fixture_id === fix.id && p.model === 'B')
          const predC = allPreds.find(p => p.fixture_id === fix.id && p.model === 'C')

          const available = [predA, predB, predC].filter(Boolean)
          const score = available.length >= 2
            ? computeDisagreementScore(available.map(p => ({ hw: p!.home_win_prob, dw: p!.draw_prob, aw: p!.away_win_prob })))
            : 0

          const kickoff = new Date(fix.kickoff_utc)
          const dateStr = kickoff.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          const timeStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

          // Recommend: if high disagreement use bestByBrier, else "any — models agree"
          const agreeLabel = score < 0.08 ? 'Models agree' : null

          return (
            <div key={fix.id} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <DisagreementBadge score={score} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                {([['A', predA], ['B', predB], ['C', predC]] as const).map(([m, pred]) => (
                  <div
                    key={m}
                    className={`rounded p-2 text-center ${bestByBrier?.model === m ? 'bg-zinc-100 ring-1 ring-zinc-300' : 'bg-zinc-50'}`}
                  >
                    <div className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs mb-1 ${MODEL_COLORS[m]}`}>{m}</div>
                    {pred ? (
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between text-zinc-600">
                          <span>H</span><span className="font-semibold">{pct(pred.home_win_prob)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>D</span><span>{pct(pred.draw_prob)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-600">
                          <span>A</span><span className="font-semibold">{pct(pred.away_win_prob)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-500">
                {agreeLabel
                  ? <span className="text-green-600 font-medium">✓ Models agree — any model fine</span>
                  : bestByBrier
                    ? <>Pick: <span className={`font-semibold ${bestByBrier.model === 'A' ? 'text-blue-600' : bestByBrier.model === 'B' ? 'text-purple-600' : 'text-green-600'}`}>
                        Model {bestByBrier.model}
                      </span> · highest disagreement — trust best calibrated</>
                    : 'No model comparison data yet'
                }
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
