'use client'

import { computeMetrics } from '@/lib/store'
import { buildMatchTimeline } from '@/lib/analytics'
import { MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const MODELS = ['A', 'B', 'C'] as const

export function ModelHealth() {
  const metrics = computeMetrics()
  const timeline = buildMatchTimeline()

  const leader = [...metrics].sort((a, b) => a.avgBrier - b.avgBrier).find(m => m.total > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Model Health
        </CardTitle>
        {leader && (
          <p className="text-xs text-zinc-500 mt-0.5">
            Best calibrated:{' '}
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[leader.model]}`}>
              {MODEL_LABELS[leader.model]}
            </span>
            {' '}— lowest Brier across {leader.total} matches
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {MODELS.map(m => {
            const metric = metrics.find(x => x.model === m)
            const isLeader = leader?.model === m
            const recent = timeline.filter(e => e.models[m] !== null).slice(-5)

            return (
              <div
                key={m}
                className={`rounded-lg border p-3 ${isLeader ? 'border-green-300 bg-green-50' : 'border-zinc-100 bg-zinc-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-white text-xs ${MODEL_COLORS[m]}`}>
                    {m}
                  </span>
                  {isLeader && <span className="text-xs font-medium text-green-600">Best</span>}
                </div>

                {metric && metric.total > 0 ? (
                  <>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Accuracy</span>
                        <span className="font-semibold text-zinc-900">{Math.round(metric.accuracy * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Brier</span>
                        <span className={`font-semibold tabular-nums ${isLeader ? 'text-green-700' : 'text-zinc-700'}`}>
                          {metric.avgBrier.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Log Loss</span>
                        <span className="font-semibold text-zinc-700 tabular-nums">{metric.avgLogLoss.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Goal Err</span>
                        <span className={`font-semibold tabular-nums ${metric.totalGoalsMAE <= 1.5 ? 'text-green-600' : metric.totalGoalsMAE <= 2.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {metric.totalGoalsMAE.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {recent.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-200">
                        <p className="text-xs text-zinc-400 mb-1">Last {recent.length}</p>
                        <div className="flex gap-0.5">
                          {recent.map((e, i) => (
                            <span
                              key={i}
                              title={`${e.fixtureId}: ${e.models[m]?.predOutcome} vs ${e.actualOutcome}`}
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-bold ${
                                e.models[m]?.correct ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                              }`}
                            >
                              {e.models[m]?.correct ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-400 mt-2">No data yet</p>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400 text-right">{metrics[0]?.total ?? 0} matches scored · Brier lower = better</p>
      </CardContent>
    </Card>
  )
}
