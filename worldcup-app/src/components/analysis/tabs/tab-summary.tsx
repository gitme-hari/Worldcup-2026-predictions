'use client'
import type { PerformanceData } from '../performance-data'
import type { MatchReview } from '@/lib/match-review'

// ── Pool score distribution bar ───────────────────────────────────────────────

function DistributionBar({ reviews }: { reviews: MatchReview[] }) {
  const total = reviews.length
  if (total === 0) return null

  const counts = { 4: 0, 2: 0, 1: 0, 0: 0 }
  for (const r of reviews) {
    counts[r.myPts as keyof typeof counts] = (counts[r.myPts as keyof typeof counts] ?? 0) + 1
  }

  const bars = [
    { pts: 4, label: 'Exact score',      color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { pts: 2, label: 'Correct result + GD', color: 'bg-blue-400',  textColor: 'text-blue-700' },
    { pts: 1, label: 'Correct result',   color: 'bg-amber-400',   textColor: 'text-amber-700' },
    { pts: 0, label: 'Missed',           color: 'bg-red-400',     textColor: 'text-red-600' },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Point Distribution</p>
      {bars.map(({ pts, label, color, textColor }) => {
        const count = counts[pts as keyof typeof counts] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={pts} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-40 shrink-0">
              <span className={`text-xs font-bold tabular-nums ${textColor} w-3`}>{pts}</span>
              <span className="text-xs text-zinc-500 truncate">{label}</span>
            </div>
            <div className="flex-1 h-2.5 rounded-full bg-zinc-100 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-zinc-700 w-20 text-right tabular-nums">
              {count} <span className="font-normal text-zinc-400">({pct}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Streaks ───────────────────────────────────────────────────────────────────

function computeStreaks(reviews: MatchReview[]) {
  let best = 0, worst = 0, cur4 = 0, cur0 = 0
  for (const r of reviews) {
    if (r.myPts >= 2) { cur4++; if (cur4 > best) best = cur4 } else cur4 = 0
    if (r.myPts === 0) { cur0++; if (cur0 > worst) worst = cur0 } else cur0 = 0
  }
  return { best, worst }
}

// ── Trend (rolling avg over last 5 matches) ───────────────────────────────────

function TrendLine({ reviews }: { reviews: MatchReview[] }) {
  if (reviews.length < 3) return null
  const window = 5
  const points = reviews.map((_, i) => {
    const slice = reviews.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((s, r) => s + r.myPts, 0) / slice.length
  })
  const max = 4
  const w = 240
  const h = 48
  const pts = points.map((v, i) => [
    Math.round((i / Math.max(1, points.length - 1)) * w),
    Math.round(h - (v / max) * h),
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Trend (rolling {window}-match avg)
      </p>
      <svg width={w} height={h + 4} className="overflow-visible">
        {[0, 1, 2, 4].map(v => (
          <line key={v} x1={0} y1={h - (v / max) * h} x2={w} y2={h - (v / max) * h}
            stroke="#f4f4f5" strokeWidth={1} />
        ))}
        <path d={d} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400">
        <span>Oldest</span>
        <span>Most recent</span>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function TabSummary({ data }: { data: PerformanceData }) {
  const { reviews, exactScore: es } = data

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">No completed matches yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Enter a result on the Matches page to start tracking your performance.</p>
      </div>
    )
  }

  const total       = reviews.length
  const totalPts    = reviews.reduce((s, r) => s + r.myPts, 0)
  const avgPts      = totalPts / total
  const exact       = reviews.filter(r => r.myPts === 4).length
  const correctWin  = reviews.filter(r => r.myPts >= 1).length
  const streaks     = computeStreaks(reviews)

  const metrics = [
    { label: 'Total Pool Points', value: totalPts, sub: `from ${total} picks` },
    { label: 'Avg pts / match',   value: avgPts.toFixed(2), sub: 'target ≥ 2.0' },
    { label: 'Exact score',       value: `${Math.round((exact / total) * 100)}%`, sub: `${exact} of ${total}` },
    { label: 'Correct result',    value: `${Math.round((correctWin / total) * 100)}%`, sub: `${correctWin} of ${total}` },
  ]

  const biases = [
    { label: 'Home goal bias',  value: es.homeGoalBias, note: 'avg (predicted − actual) home goals' },
    { label: 'Away goal bias',  value: es.awayGoalBias, note: 'avg (predicted − actual) away goals' },
  ]

  const drawReviews = reviews.filter(r => {
    const actGD = r.actualH - r.actualA
    return actGD === 0
  })
  const drawCorrect = drawReviews.filter(r => r.myPts >= 1).length
  const drawAcc     = drawReviews.length > 0 ? Math.round((drawCorrect / drawReviews.length) * 100) : null

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-zinc-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">{m.label}</p>
            <p className="text-2xl font-black tabular-nums text-zinc-900">{m.value}</p>
            <p className="text-[10px] text-zinc-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <DistributionBar reviews={reviews} />

      {/* Biases + draw accuracy */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Prediction Tendencies</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {biases.map(b => {
            const sign = b.value >= 0 ? '+' : ''
            const notable = Math.abs(b.value) >= 0.3
            return (
              <div key={b.label} className="rounded-lg border border-zinc-100 bg-white px-3 py-2">
                <p className="text-[10px] text-zinc-400">{b.label}</p>
                <p className={`text-lg font-bold tabular-nums ${notable ? (b.value > 0 ? 'text-amber-600' : 'text-blue-600') : 'text-zinc-700'}`}>
                  {sign}{b.value.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-400">{b.note}</p>
              </div>
            )
          })}
          <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2">
            <p className="text-[10px] text-zinc-400">Draw accuracy</p>
            <p className="text-lg font-bold text-zinc-700">
              {drawAcc !== null ? `${drawAcc}%` : '—'}
            </p>
            <p className="text-[10px] text-zinc-400">{drawReviews.length} draws in dataset</p>
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Streaks</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Best scoring run</p>
            <p className="text-2xl font-black text-emerald-700">{streaks.best}</p>
            <p className="text-[10px] text-emerald-600">consecutive ≥2 pt picks</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
            <p className="text-[10px] text-red-500 uppercase tracking-wide">Worst miss streak</p>
            <p className="text-2xl font-black text-red-600">{streaks.worst}</p>
            <p className="text-[10px] text-red-500">consecutive 0 pt picks</p>
          </div>
        </div>
      </div>

      {/* Trend */}
      <TrendLine reviews={reviews} />
    </div>
  )
}
