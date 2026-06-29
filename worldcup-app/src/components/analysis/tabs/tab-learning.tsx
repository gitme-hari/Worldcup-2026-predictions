'use client'
import type { PerformanceData } from '../performance-data'
import { BLIND_SPOT_LABELS, SIGNAL_RECOMMENDATIONS } from '../performance-data'
import { Brain, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LearningSignal } from '@/lib/learning-signals'

// ── Label maps ────────────────────────────────────────────────────────────────

const STRENGTH_STYLE: Record<string, string> = {
  Strong:   'bg-green-100 text-green-800 border-green-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Weak:     'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const BAR_COLOR: Record<string, string> = {
  over_predicted_goals:           'bg-amber-400',
  favourite_overestimated:        'bg-red-400',
  qualification_pressure_ignored: 'bg-orange-400',
  away_attack_underestimated:     'bg-purple-400',
  home_attack_underestimated:     'bg-indigo-400',
  defensive_improvement_ignored:  'bg-blue-400',
  random_variance:                'bg-zinc-300',
  correct:                        'bg-green-400',
}

// ── Signal card ───────────────────────────────────────────────────────────────

function SignalCard({ sig }: { sig: LearningSignal }) {
  const rec = SIGNAL_RECOMMENDATIONS[sig.category]
  return (
    <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3 space-y-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-900 leading-snug">{sig.lesson}</p>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${STRENGTH_STYLE[sig.strength] ?? ''}`}>
          {sig.strength}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1 text-center">
          <p className="text-[10px] text-zinc-400">Matches</p>
          <p className="text-sm font-bold text-zinc-900">{sig.occurrences}</p>
        </div>
        <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1 text-center">
          <p className="text-[10px] text-zinc-400">Avg Δ pts</p>
          <p className={`text-sm font-bold ${sig.avgPtsImprovement > 0 ? 'text-green-700' : 'text-red-600'}`}>
            {sig.avgPtsImprovement >= 0 ? '+' : ''}{sig.avgPtsImprovement.toFixed(2)}
          </p>
        </div>
        <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1 text-center">
          <p className="text-[10px] text-zinc-400">Confidence</p>
          <p className="text-sm font-bold text-zinc-700">{sig.confidence}</p>
        </div>
        <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1 text-center">
          <p className="text-[10px] text-zinc-400">Status</p>
          <p className={`text-sm font-bold ${sig.appliedToRecs ? 'text-green-700' : 'text-zinc-500'}`}>
            {sig.appliedToRecs ? 'Active' : 'Monitoring'}
          </p>
        </div>
      </div>

      {rec && (
        <div className="border-t border-zinc-100 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Recommendation</p>
          <p className="text-xs text-zinc-700">{rec}</p>
        </div>
      )}
    </div>
  )
}

// ── Engine Learning section ───────────────────────────────────────────────────

function EngineLearningSection({ data }: { data: PerformanceData }) {
  const { signals } = data
  const active   = signals.filter(s => s.appliedToRecs)
  const watching = signals.filter(s => !s.appliedToRecs)

  if (signals.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Engine Learning</p>
        <div className="rounded-lg bg-zinc-50 px-4 py-8 text-center">
          <Brain className="mx-auto mb-3 h-7 w-7 text-zinc-300" />
          <p className="text-sm text-zinc-500">Not enough data yet.</p>
          <p className="mt-1 text-xs text-zinc-400">Signals appear after 3+ matches show the same failure pattern.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Engine Learning</p>

      {active.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs text-zinc-500">Active signals — applied to recommendations ({active.length})</p>
          {active.map(sig => <SignalCard key={sig.id} sig={sig} />)}
        </div>
      )}

      {watching.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Monitoring — building evidence</p>
          {watching.map(sig => (
            <div key={sig.id} className="flex items-center justify-between rounded bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs">
              <span className="text-zinc-700">{BLIND_SPOT_LABELS[sig.category] ?? sig.category}</span>
              <div className="flex items-center gap-3 text-zinc-400">
                <span>{sig.occurrences} occurrence{sig.occurrences !== 1 ? 's' : ''}</span>
                <Badge variant="outline" className={`text-[10px] ${STRENGTH_STYLE[sig.strength]}`}>{sig.strength}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Blind Spots section ───────────────────────────────────────────────────────

function BlindSpotsSection({ data }: { data: PerformanceData }) {
  const { blindSpotProfile, reviews } = data
  const total = reviews.length

  if (total === 0) return null

  const failures = blindSpotProfile.filter(p => p.category !== 'correct')
  const correctEntry = blindSpotProfile.find(p => p.category === 'correct')

  // Sort by potential gain (count × estimated avg impact)
  const ranked = [...failures].sort((a, b) => b.count - a.count)

  // Avg impact is not stored in profile — estimate from count/total
  const AVG_IMPACT_ESTIMATES: Record<string, number> = {
    qualification_pressure_ignored: 1.5,
    over_predicted_goals:           1.2,
    favourite_overestimated:        0.9,
    defensive_improvement_ignored:  1.0,
    away_attack_underestimated:     1.1,
    home_attack_underestimated:     1.1,
    random_variance:                0.0,
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Engine Blind Spots</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Engine correct</p>
          <p className="text-2xl font-black text-green-700">{correctEntry?.count ?? 0}</p>
          <p className="text-xs text-zinc-400">{correctEntry?.pct ?? 0}% of matches</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Missed</p>
          <p className="text-2xl font-black text-red-600">{total - (correctEntry?.count ?? 0)}</p>
          <p className="text-xs text-zinc-400">{failures.length} pattern{failures.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {ranked.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Ranked by improvement opportunity</p>
          {ranked.map((p, i) => {
            const impact = AVG_IMPACT_ESTIMATES[p.category] ?? 0.8
            const gain = (p.count * impact).toFixed(1)
            return (
              <div key={p.category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 w-4">{i + 1}</span>
                    <span className="text-xs font-medium text-zinc-800">{BLIND_SPOT_LABELS[p.category] ?? p.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{p.count} ({p.pct}%)</span>
                    {impact > 0 && (
                      <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        +{gain} pts potential
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className={`h-full rounded-full ${BAR_COLOR[p.category] ?? 'bg-zinc-400'}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            )
          })}
          <p className="text-[10px] text-zinc-400">Potential gain = estimated avg impact × occurrences.</p>
        </div>
      )}

      {ranked.length === 0 && (
        <div className="rounded-lg bg-green-50 px-4 py-4 text-center text-sm text-green-700">
          No failure patterns detected — all classified matches were correct.
        </div>
      )}
    </div>
  )
}

// ── Tab export ─────────────────────────────────────────────────────────────────

export function TabLearning({ data }: { data: PerformanceData }) {
  return (
    <div className="space-y-8">
      <EngineLearningSection data={data} />
      <BlindSpotsSection data={data} />
      {/* Learning Timeline slot — add <LearningTimeline data={data} /> here in a future phase */}
    </div>
  )
}
