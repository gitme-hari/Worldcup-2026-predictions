'use client'
import { computeMetrics } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'

type Confidence = 'High' | 'Medium' | 'Low'

interface EngineResult {
  recommendedModel: 'A' | 'B' | 'C'
  secondModel: 'A' | 'B' | 'C'
  confidence: Confidence
  accGap: number
  brierGap: number
  n: number
  interpretation: string
  nextMilestone: string | null
}

function computeDecision(): EngineResult | null {
  const metrics = computeMetrics()
  const N = metrics[0]?.total ?? 0
  if (N === 0) return null

  const ranked = [...metrics].sort((a, b) =>
    a.avgBrier !== b.avgBrier ? a.avgBrier - b.avgBrier : b.accuracy - a.accuracy
  )
  const best = ranked[0]
  const second = ranked[1]

  const accGap = best.accuracy - second.accuracy
  const brierGap = second.avgBrier - best.avgBrier

  // Confidence framework:
  //   High:   N≥60 AND accGap>0.05 AND brierGap>0.010
  //   Medium: N≥40 AND (accGap>0.03 OR brierGap>0.005)
  //   Low:    everything else
  let confidence: Confidence
  if (N >= 60 && accGap > 0.05 && brierGap > 0.010) {
    confidence = 'High'
  } else if (N >= 40 && (accGap > 0.03 || brierGap > 0.005)) {
    confidence = 'Medium'
  } else {
    confidence = 'Low'
  }

  // Plain-language interpretation
  let interpretation: string
  if (confidence === 'High') {
    interpretation = `Model ${best.model} has a clear and sustained edge. Use it consistently.`
  } else if (confidence === 'Medium') {
    interpretation = `Model ${best.model} is pulling ahead but the lead is not yet decisive. Lean toward it, especially for uncertain fixtures.`
  } else {
    interpretation = `Keep using Model ${best.model} for now, but this is not a strong signal yet — Model ${second.model} is very close.`
  }

  // Next milestone
  let nextMilestone: string | null = null
  if (confidence === 'Low') {
    if (N < 40) {
      nextMilestone = `Reassess after ${40 - N} more resolved matches (${N} of 40 reached)`
    } else {
      nextMilestone = `Need Model ${best.model} to extend accuracy lead beyond 3pp to reach Medium`
    }
  } else if (confidence === 'Medium') {
    if (N < 60) {
      nextMilestone = `${60 - N} more resolved matches needed — then reassess for High confidence`
    } else {
      nextMilestone = `Sustain >5pp accuracy lead to reach High confidence`
    }
  }

  return {
    recommendedModel: best.model as 'A' | 'B' | 'C',
    secondModel: second.model as 'A' | 'B' | 'C',
    confidence,
    accGap,
    brierGap,
    n: N,
    interpretation,
    nextMilestone,
  }
}

const CONFIDENCE_STYLES: Record<Confidence, { badge: string; border: string; dot: string; label: string }> = {
  High:   { badge: 'bg-green-100 text-green-800', border: 'border-green-200', dot: 'bg-green-500', label: 'High' },
  Medium: { badge: 'bg-amber-100 text-amber-800',  border: 'border-amber-200', dot: 'bg-amber-400', label: 'Medium' },
  Low:    { badge: 'bg-zinc-100 text-zinc-500',    border: 'border-zinc-200',  dot: 'bg-zinc-400',  label: 'Low' },
}

export function DecisionEngine() {
  const decision = computeDecision()

  if (!decision) {
    return (
      <Card className="border-zinc-200">
        <CardContent className="py-6 text-center text-sm text-zinc-400">
          No resolved matches yet — enter results to activate the Decision Engine.
        </CardContent>
      </Card>
    )
  }

  const { recommendedModel, secondModel, confidence, accGap, brierGap, n, interpretation, nextMilestone } = decision
  const styles = CONFIDENCE_STYLES[confidence]

  return (
    <Card className={`border-2 ${styles.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Zap className="h-4 w-4 text-amber-500" />
          Which model should I use?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Primary verdict */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Recommended</p>
            <p className="text-2xl font-bold text-zinc-900">Model {recommendedModel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 mb-1">Confidence</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${styles.badge}`}>
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              {styles.label}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Current edge — concrete numbers */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Current edge over Model {secondModel}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-400">Accuracy</p>
              <p className="text-sm font-semibold text-zinc-700">
                +{(accGap * 100).toFixed(1)}pp
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {accGap < 0.03 ? 'within noise' : accGap < 0.05 ? 'moderate' : 'meaningful'}
              </p>
            </div>
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-400">Brier score</p>
              <p className="text-sm font-semibold text-zinc-700">
                {brierGap < 0.001 ? '<0.001' : brierGap.toFixed(4)} better
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {brierGap < 0.002 ? 'negligible' : brierGap < 0.010 ? 'small' : 'clear'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">{n} matches evaluated</p>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Plain-language interpretation */}
        <p className="text-sm text-zinc-600 leading-relaxed">{interpretation}</p>

        {/* Next milestone */}
        {nextMilestone && (
          <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-zinc-500 mb-0.5">Next reassessment</p>
            <p className="text-xs text-zinc-500">{nextMilestone}</p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
