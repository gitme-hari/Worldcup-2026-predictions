'use client'
import { useState, useEffect } from 'react'
import { computeMetrics, getBestModel } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Award } from 'lucide-react'

function MetricCell({ value, format = 'pct', invert = false }: { value: number | null; format?: 'pct' | 'decimal' | 'raw'; invert?: boolean }) {
  if (value === null || isNaN(value)) return <td className="px-4 py-2.5 text-center text-zinc-300">—</td>
  const display = format === 'pct'
    ? `${(value * 100).toFixed(1)}%`
    : format === 'decimal'
    ? value.toFixed(3)
    : value.toFixed(2)
  return <td className="px-4 py-2.5 text-center text-zinc-700 tabular-nums">{display}</td>
}

export function MetricsPanel() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const metrics = computeMetrics()
  const best = getBestModel()
  const hasData = metrics.some(m => m.total > 0)

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No results entered yet</p>
          <p className="mt-1 text-xs text-zinc-400">Enter actual match results on the Results page to start tracking model performance.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Best model callout */}
      {best && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <Award className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-green-900">Best performing model: Model {best}</div>
            <div className="text-xs text-green-700">
              {(metrics.find(m => m.model === best)?.accuracy ?? 0 * 100).toFixed(1)}% outcome accuracy across {metrics.find(m => m.model === best)?.total ?? 0} matches
            </div>
          </div>
        </div>
      )}

      {/* Main metrics table */}
      <Card>
        <CardHeader><CardTitle>Model Comparison</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left font-semibold text-zinc-700">Model</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Matches</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Accuracy ↑</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Brier ↓</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Log Loss ↓</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Home MAE ↓</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Away MAE ↓</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Total MAE ↓</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.model} className={`border-b border-zinc-50 ${best === m.model ? 'bg-green-50' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">Model {m.model}</span>
                      {best === m.model && <Badge variant="success">Best</Badge>}
                    </div>
                    <div className="text-zinc-400 mt-0.5">
                      {m.model === 'A' ? 'Rating + Poisson' : m.model === 'B' ? 'Machine Learning' : 'Market-Implied'}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-zinc-700">{m.total}</td>
                  <MetricCell value={m.total > 0 ? m.accuracy : null} format="pct" />
                  <MetricCell value={m.total > 0 ? m.avgBrier : null} format="decimal" invert />
                  <MetricCell value={m.total > 0 ? m.avgLogLoss : null} format="decimal" invert />
                  <MetricCell value={m.total > 0 ? m.homeMAE : null} format="decimal" invert />
                  <MetricCell value={m.total > 0 ? m.awayMAE : null} format="decimal" invert />
                  <MetricCell value={m.total > 0 ? m.totalGoalsMAE : null} format="decimal" invert />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Metric explanations */}
      <Card>
        <CardHeader><CardTitle>Metric Definitions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            ['Accuracy', 'Fraction of matches where the model predicted the correct outcome (Home Win / Draw / Away Win).'],
            ['Brier Score', 'Mean squared error of probability forecasts across all three outcomes. Lower = better calibrated. Range 0–1.'],
            ['Log Loss', 'Logarithmic scoring rule penalising confident wrong predictions more heavily. Lower = better.'],
            ['MAE (Goals)', 'Mean absolute error of predicted vs actual goal counts. Lower = more accurate score projection.'],
          ].map(([name, desc]) => (
            <div key={name} className="flex gap-3">
              <span className="text-xs font-semibold text-zinc-700 shrink-0 w-24">{name}</span>
              <span className="text-xs text-zinc-500">{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
