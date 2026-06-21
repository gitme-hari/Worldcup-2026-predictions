'use client'
import { computeMetrics } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'

type Confidence = 'High' | 'Medium' | 'Low'

interface EngineResult {
  recommendedModel: 'A' | 'B' | 'C'
  confidence: Confidence
  reasons: string[]
  nextMilestone: string | null
}

function computeDecision(): EngineResult | null {
  const metrics = computeMetrics()
  const N = metrics[0]?.total ?? 0
  if (N === 0) return null

  // Sort by Brier ascending (lower = better), break ties by accuracy descending
  const ranked = [...metrics].sort((a, b) =>
    a.avgBrier !== b.avgBrier ? a.avgBrier - b.avgBrier : b.accuracy - a.accuracy
  )
  const best = ranked[0]
  const second = ranked[1]

  const accGap = best.accuracy - second.accuracy          // e.g. 0.03 = +3pp
  const brierGap = second.avgBrier - best.avgBrier        // positive = best is better

  // Confidence framework (not hardcoded — driven by evidence thresholds)
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

  const reasons: string[] = []

  // Accuracy lead
  if (accGap < 0.02) {
    reasons.push(`Accuracy gap is only ${(accGap * 100).toFixed(1)}pp — within noise range`)
  } else if (accGap < 0.05) {
    reasons.push(`+${(accGap * 100).toFixed(1)}pp accuracy lead over next-best — moderate signal`)
  } else {
    reasons.push(`+${(accGap * 100).toFixed(1)}pp accuracy lead — meaningful separation`)
  }

  // Brier gap
  if (brierGap < 0.002) {
    reasons.push(`Brier gap of ${brierGap.toFixed(4)} is statistically negligible`)
  } else if (brierGap < 0.010) {
    reasons.push(`Brier advantage of ${brierGap.toFixed(4)} — small but consistent`)
  } else {
    reasons.push(`Brier advantage of ${brierGap.toFixed(4)} — clear probabilistic edge`)
  }

  // Sample size
  if (N < 20) {
    reasons.push(`Only ${N} matches evaluated — results highly volatile`)
  } else if (N < 40) {
    reasons.push(`${N} matches evaluated — sample too small for reliable routing`)
  } else if (N < 60) {
    reasons.push(`${N} matches evaluated — approaching reliable sample size`)
  } else {
    reasons.push(`${N} matches evaluated — robust sample`)
  }

  // Next milestone
  let nextMilestone: string | null = null
  if (confidence === 'Low') {
    if (N < 40) {
      nextMilestone = `${40 - N} more resolved matches → eligible for Medium confidence`
    } else {
      nextMilestone = `Need accGap >3pp AND brierGap >0.005 to reach Medium confidence`
    }
  } else if (confidence === 'Medium') {
    if (N < 60) {
      nextMilestone = `${60 - N} more resolved matches + sustained lead → High confidence`
    } else {
      nextMilestone = `Maintain >5pp accuracy lead over 60+ matches → High confidence`
    }
  }

  return {
    recommendedModel: best.model as 'A' | 'B' | 'C',
    confidence,
    reasons,
    nextMilestone,
  }
}

const CONFIDENCE_STYLES: Record<Confidence, { badge: string; border: string; dot: string }> = {
  High:   { badge: 'bg-green-100 text-green-800',  border: 'border-green-200', dot: 'bg-green-500' },
  Medium: { badge: 'bg-amber-100 text-amber-800',   border: 'border-amber-200', dot: 'bg-amber-400' },
  Low:    { badge: 'bg-zinc-100  text-zinc-600',    border: 'border-zinc-200',  dot: 'bg-zinc-400'  },
}

const MODEL_DISPLAY: Record<string, string> = { A: 'Model A', B: 'Model B', C: 'Model C' }

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

  const { recommendedModel, confidence, reasons, nextMilestone } = decision
  const styles = CONFIDENCE_STYLES[confidence]

  return (
    <Card className={`border-2 ${styles.border}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-amber-500" />
          Prediction Decision Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verdict row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Recommended model</p>
            <p className="text-2xl font-bold text-zinc-900">{MODEL_DISPLAY[recommendedModel]}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Confidence</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${styles.badge}`}>
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              {confidence}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-100" />

        {/* Reasoning */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Why this recommendation</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                <span className="mt-0.5 text-zinc-300">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Next milestone */}
        {nextMilestone && (
          <>
            <div className="border-t border-zinc-100" />
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <p className="text-xs font-medium text-zinc-500 mb-0.5">What would raise confidence</p>
              <p className="text-xs text-zinc-600">{nextMilestone}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
