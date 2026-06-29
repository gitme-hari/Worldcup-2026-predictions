'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { PerformanceData } from '../performance-data'
import { BLIND_SPOT_LABELS, poolScore } from '../performance-data'
import { NextPicksChecklist } from '../next-picks-checklist'
import { Badge } from '@/components/ui/badge'
import type { MatchReview } from '@/lib/match-review'

// ── Hero strip ────────────────────────────────────────────────────────────────

function HeroStrip({ reviews }: { reviews: MatchReview[] }) {
  const myTotal  = reviews.reduce((s, r) => s + r.myPts, 0)
  const engTotal = reviews.reduce((s, r) => s + (r.enginePts ?? 0), 0)
  const exact    = reviews.filter(r => r.myPts === 4).length
  const exactPct = reviews.length > 0 ? Math.round((exact / reviews.length) * 100) : 0
  const outperformed = reviews.filter(r => r.myPts > (r.enginePts ?? 0)).length
  const outPct   = reviews.length > 0 ? Math.round((outperformed / reviews.length) * 100) : 0
  const overrides = reviews.filter(r => r.overridden)
  const overrideDelta = overrides.reduce((s, r) => s + (r.deltaVsEngine ?? 0), 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Pool Points',       value: myTotal,                      sub: `avg ${reviews.length > 0 ? (myTotal / reviews.length).toFixed(1) : '0'}/match` },
        { label: 'Exact %',           value: `${exactPct}%`,               sub: `${exact} of ${reviews.length} picks` },
        { label: 'Outperformed Engine', value: `${outPct}%`,               sub: `${outperformed} of ${reviews.length} matches`, highlight: outPct >= 50 },
        { label: 'Override ROI',      value: overrideDelta >= 0 ? `+${overrideDelta}` : `${overrideDelta}`, sub: `across ${overrides.length} overrides`, positive: overrideDelta > 0, negative: overrideDelta < 0 },
      ].map(m => (
        <div key={m.label} className={`rounded-lg p-3 text-center ${m.highlight ? 'bg-blue-50' : m.positive ? 'bg-green-50' : m.negative ? 'bg-red-50' : 'bg-zinc-50'}`}>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">{m.label}</p>
          <p className={`text-2xl font-black tabular-nums ${m.positive ? 'text-green-700' : m.negative ? 'text-red-600' : m.highlight ? 'text-blue-700' : 'text-zinc-900'}`}>
            {m.value}
          </p>
          <p className="text-[10px] text-zinc-400">{m.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ── Expandable match row ───────────────────────────────────────────────────────

const VERDICT_STYLE: Record<string, string> = {
  'Override succeeded': 'text-green-700 border-green-300 bg-green-50',
  'Override failed':    'text-red-600 border-red-300 bg-red-50',
  'Both matched':       'text-blue-700 border-blue-300 bg-blue-50',
  'Both missed':        'text-zinc-500 border-zinc-200',
  'Accepted rec':       'text-zinc-600 border-zinc-200',
  'No rec available':   'text-zinc-400 border-zinc-100',
}

function ExpandableRow({ r, activeCats }: { r: MatchReview; activeCats: Set<string> }) {
  const [open, setOpen] = useState(false)
  const appliedSignal = activeCats.has(r.blindSpot) ? BLIND_SPOT_LABELS[r.blindSpot] : null

  return (
    <>
      <tr
        className="border-b border-zinc-50 hover:bg-zinc-50/60 cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />}
            <span className="font-medium text-zinc-900 whitespace-nowrap">{r.homeCode} v {r.awayCode}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-center font-mono text-zinc-400">{r.engineH != null ? `${r.engineH}–${r.engineA}` : '—'}</td>
        <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-700">{r.myH}–{r.myA}</td>
        <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">{r.actualH}–{r.actualA}</td>
        <td className="px-3 py-2.5 text-center">
          <span className={`font-bold ${r.myPts === 4 ? 'text-green-700' : r.myPts === 2 ? 'text-blue-600' : r.myPts === 1 ? 'text-amber-600' : 'text-red-500'}`}>
            {r.myPts}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <Badge variant="outline" className={`text-[10px] ${VERDICT_STYLE[r.verdict] ?? ''}`}>{r.verdict}</Badge>
        </td>
        <td className="px-3 py-2.5 text-center text-[10px]">
          {appliedSignal
            ? <span className="text-green-700 font-medium">{appliedSignal}</span>
            : <span className="text-zinc-300">—</span>}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-zinc-100 bg-zinc-50/40">
          <td colSpan={7} className="px-6 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              {r.overrideReason && (
                <div>
                  <p className="font-semibold text-zinc-500 mb-0.5">Override reason</p>
                  <p className="text-zinc-700">{r.overrideReason}</p>
                </div>
              )}
              {r.lesson && (
                <div>
                  <p className="font-semibold text-zinc-500 mb-0.5">Lesson learned</p>
                  <p className="text-zinc-700">{r.lesson}</p>
                </div>
              )}
              {r.blindSpot !== 'correct' && (
                <div>
                  <p className="font-semibold text-zinc-500 mb-0.5">Engine failure pattern</p>
                  <p className="text-zinc-700">{BLIND_SPOT_LABELS[r.blindSpot] ?? r.blindSpot}</p>
                </div>
              )}
              {r.evidence.length > 0 && (
                <div className={r.overrideReason || r.lesson ? '' : 'sm:col-span-2'}>
                  <p className="font-semibold text-zinc-500 mb-0.5">Context factors</p>
                  <ul className="space-y-0.5">
                    {r.evidence.map((e, i) => <li key={i} className="text-zinc-600">· {e}</li>)}
                  </ul>
                </div>
              )}
              {!r.overrideReason && !r.lesson && r.evidence.length === 0 && (
                <p className="text-zinc-400">No additional context recorded.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Decision Review section ───────────────────────────────────────────────────

function DecisionReviewSection({ reviews, activeCats }: { reviews: MatchReview[]; activeCats: Set<string> }) {
  if (reviews.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Completed Match Reviews ({reviews.length})</p>
      <div className="overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Engine</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Mine</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Pts</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Verdict</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-500">Learning Applied</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => <ExpandableRow key={r.fixtureId} r={r} activeCats={activeCats} />)}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-zinc-400 pl-1">Click any row to expand details.</p>
    </div>
  )
}

// ── Override Intelligence section ─────────────────────────────────────────────

function OverrideIntelligenceSection({ reviews }: { reviews: MatchReview[] }) {
  const overrides = reviews.filter(r => r.overridden)
  if (overrides.length === 0) return null

  const wins     = overrides.filter(r => r.verdict === 'Override succeeded').length
  const losses   = overrides.filter(r => r.verdict === 'Override failed').length
  const netDelta = overrides.reduce((s, r) => s + (r.deltaVsEngine ?? 0), 0)
  const avgGain  = overrides.length > 0 ? netDelta / overrides.length : 0
  const winRate  = overrides.length > 0 ? (wins / overrides.length) * 100 : 0

  const recent5 = overrides.slice(-5)

  // Recommendation logic
  const isPositive = winRate >= 50 && avgGain > 0
  const rec = isPositive
    ? `Continue overriding selectively. Your overrides are net-positive (+${avgGain.toFixed(1)} pts/override on average). Avoid overriding high-confidence engine picks unless you have strong contextual evidence.`
    : `Override performance is currently negative (${avgGain.toFixed(1)} pts/override). Consider trusting the engine more, particularly on high-confidence predictions.`

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Override Intelligence</p>
      <p className="text-xs font-semibold text-zinc-700">Should I continue overriding the engine?</p>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 w-36 shrink-0">Success rate</span>
          <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div className={`h-full rounded-full ${winRate >= 50 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${winRate}%` }} />
          </div>
          <span className="text-xs font-semibold text-zinc-900 w-20 text-right">{Math.round(winRate)}% ({wins}/{overrides.length})</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-600 px-0.5">
          <span>Net pts gained <span className={`font-semibold ${netDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>{netDelta >= 0 ? '+' : ''}{netDelta}</span></span>
          <span>Avg per override <span className={`font-semibold ${avgGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>{avgGain >= 0 ? '+' : ''}{avgGain.toFixed(1)}</span></span>
        </div>
      </div>

      {recent5.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 shrink-0">Last {recent5.length}:</span>
          <div className="flex gap-1">
            {recent5.map((r, i) => (
              <span key={i} className={`text-xs font-bold ${r.verdict === 'Override succeeded' ? 'text-green-600' : r.verdict === 'Override failed' ? 'text-red-500' : 'text-zinc-400'}`}>
                {r.verdict === 'Override succeeded' ? '✓' : r.verdict === 'Override failed' ? '✗' : '·'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Recommendation</p>
        <p className="text-xs text-zinc-700">{rec}</p>
      </div>
    </div>
  )
}

// ── Exact Score section ───────────────────────────────────────────────────────

function ExactScoreSection({ data }: { data: PerformanceData }) {
  const { exactScore: p, reviews } = data
  if (reviews.length === 0) return null
  const { distribution: d, avgPts, homeGoalBias, awayGoalBias, missedPatterns, topMissedPattern } = p

  const bars = [
    { count: d.exact,   label: '4 pts · Exact',        bar: 'bg-green-500' },
    { count: d.gdWin,   label: '2 pts · Winner + GD',   bar: 'bg-blue-400' },
    { count: d.winOnly, label: '1 pt  · Winner',         bar: 'bg-amber-400' },
    { count: d.miss,    label: '0 pts · Missed',         bar: 'bg-red-400' },
  ]

  const rec = topMissedPattern
    ? `Most profitable adjustment: ${topMissedPattern}. Applying this to past matches would have added ~${Math.round(missedPatterns[0]?.count ?? 0)} pool points.`
    : 'No consistent scoring pattern identified yet. Continue accumulating matches.'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Exact Score Optimisation</p>

      <div className="space-y-2">
        {bars.map(({ count, label, bar }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 w-36 shrink-0">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className={`h-full rounded-full ${bar}`} style={{ width: d.total > 0 ? `${(count / d.total) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-semibold text-zinc-700 w-16 text-right">
              {count} <span className="font-normal text-zinc-400">({Math.round((count / d.total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 text-xs text-zinc-600">
        <span>Avg pts/match <span className={`font-bold ${avgPts >= 2 ? 'text-green-700' : avgPts >= 1 ? 'text-amber-600' : 'text-red-500'}`}>{avgPts.toFixed(2)}</span></span>
        <span>Home bias <span className={`font-bold ${Math.abs(homeGoalBias) < 0.3 ? 'text-zinc-700' : 'text-amber-600'}`}>{homeGoalBias >= 0 ? '+' : ''}{homeGoalBias.toFixed(2)}</span></span>
        <span>Away bias <span className={`font-bold ${Math.abs(awayGoalBias) < 0.3 ? 'text-zinc-700' : 'text-amber-600'}`}>{awayGoalBias >= 0 ? '+' : ''}{awayGoalBias.toFixed(2)}</span></span>
      </div>

      <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Most Profitable Adjustment</p>
        <p className="text-xs text-zinc-700">{rec}</p>
      </div>
    </div>
  )
}

// ── Tab export ────────────────────────────────────────────────────────────────

export function TabReview({ data }: { data: PerformanceData }) {
  const { reviews, activeSignals } = data
  const activeCats = new Set(activeSignals.map(s => s.category as string))

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">No completed matches to review yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Lock a prediction, then enter the actual score on the Matches page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HeroStrip reviews={reviews} />
      <DecisionReviewSection reviews={reviews} activeCats={activeCats} />
      <OverrideIntelligenceSection reviews={reviews} />
      <ExactScoreSection data={data} />
      <NextPicksChecklist data={data} />
    </div>
  )
}
