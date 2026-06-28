'use client'

import { buildMatchTimeline, computePairwiseDisagreement } from '@/lib/analytics'
import { getFixtures, getTeams } from '@/lib/store'
import { MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { GitFork } from 'lucide-react'

const MODEL_SHORT: Record<string, string> = { A: 'Poisson', B: 'ML', C: 'Live' }

export function DisagreementAnalysis() {
  const timeline = buildMatchTimeline()
  const pairs = computePairwiseDisagreement(timeline)
  const fixtures = getFixtures()
  const teams = getTeams()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  if (timeline.length < 5) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <GitFork className="h-3.5 w-3.5" /> Model Disagreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">Need at least 5 completed matches. {timeline.length} available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <GitFork className="h-3.5 w-3.5" /> Model Disagreement
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">When models split on an outcome — who called it right?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {pairs.map(p => {
            const { totalDisagreements, firstWon, secondWon, neitherWon, firstModel, secondModel } = p
            if (totalDisagreements === 0) {
              return (
                <div key={p.pair} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[firstModel]}`}>{firstModel}</span>
                  <span>vs</span>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[secondModel]}`}>{secondModel}</span>
                  <span className="text-zinc-300">Always agreed</span>
                </div>
              )
            }

            const firstRate = Math.round((firstWon / totalDisagreements) * 100)
            const secondRate = Math.round((secondWon / totalDisagreements) * 100)
            const winner = firstWon > secondWon ? firstModel : secondWon > firstWon ? secondModel : null

            return (
              <div key={p.pair} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[firstModel]}`}>
                    {firstModel} · {MODEL_SHORT[firstModel]}
                  </span>
                  <span className="text-xs text-zinc-400">vs</span>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[secondModel]}`}>
                    {secondModel} · {MODEL_SHORT[secondModel]}
                  </span>
                  <span className="ml-auto text-xs text-zinc-500">{totalDisagreements} splits</span>
                </div>

                <div className="flex gap-2 text-xs">
                  <span className="text-zinc-500">{MODEL_LABELS[firstModel].split(' ')[0]} {firstModel} wins:</span>
                  <span className="font-semibold text-zinc-900">{firstWon}/{totalDisagreements}</span>
                  <span className={`font-semibold ${winner === firstModel ? 'text-green-600' : 'text-zinc-400'}`}>({firstRate}%)</span>
                  <span className="text-zinc-300 mx-1">·</span>
                  <span className="text-zinc-500">Model {secondModel} wins:</span>
                  <span className="font-semibold text-zinc-900">{secondWon}/{totalDisagreements}</span>
                  <span className={`font-semibold ${winner === secondModel ? 'text-green-600' : 'text-zinc-400'}`}>({secondRate}%)</span>
                  {neitherWon > 0 && <span className="text-zinc-400 ml-1">· neither: {neitherWon}</span>}
                </div>

                {winner && (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    When these two split,{' '}
                    <span className={`font-semibold ${winner === firstModel ? 'text-blue-600' : winner === 'B' ? 'text-purple-600' : 'text-green-600'}`}>
                      Model {winner}
                    </span>
                    {' '}has the edge.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <details className="border-t border-zinc-100 pt-3">
          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
            Per-match breakdown ({timeline.length} matches) ▾
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-2 py-1.5 text-left font-medium text-zinc-500">Match</th>
                  <th className="px-2 py-1.5 text-center font-medium text-zinc-500">A</th>
                  <th className="px-2 py-1.5 text-center font-medium text-zinc-500">B</th>
                  <th className="px-2 py-1.5 text-center font-medium text-zinc-500">C</th>
                  <th className="px-2 py-1.5 text-center font-medium text-zinc-500">Actual</th>
                </tr>
              </thead>
              <tbody>
                {[...timeline].reverse().map(e => {
                  const fix = fixtures.find(f => f.id === e.fixtureId)
                  if (!fix) return null
                  const home = teamMap[fix.home_team_id]
                  const away = teamMap[fix.away_team_id]
                  const allAgree = ['A','B','C'].every(m => e.models[m as 'A'|'B'|'C']?.predOutcome === e.models.A?.predOutcome)
                  return (
                    <tr key={e.fixtureId} className={`border-b border-zinc-50 ${!allAgree ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {home?.flag_url} {home?.code} v {away?.code} {away?.flag_url}
                      </td>
                      {(['A','B','C'] as const).map(m => {
                        const d = e.models[m]
                        return (
                          <td key={m} className="px-2 py-1.5 text-center">
                            {d ? (
                              <span className={`font-semibold ${d.correct ? 'text-green-600' : 'text-red-400'}`}>
                                {d.predOutcome}
                              </span>
                            ) : '—'}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-center font-bold text-zinc-900">{e.actualOutcome}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
