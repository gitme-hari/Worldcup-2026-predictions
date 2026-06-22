'use client'
import { useState } from 'react'
import {
  getLockedPrediction, saveLockPrediction, getPoolRecommendation, getPredictions,
  saveResult, getSquadAdjustments, getTeams, getFixtures, getResults,
} from '@/lib/store'
import type { LockedPrediction } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'
import { buildRecommendation } from '@/lib/recommendation-engine'
import type { Recommendation } from '@/lib/recommendation-engine'
import {
  applySquadAdjustments, collectConfidenceShifts, shiftConfidence,
} from '@/lib/squad-adjustments'
import { buildTeamAdjustments, teamSignal, hasNotableSignal } from '@/lib/learning-layer'
import { CheckCircle, ChevronDown, ChevronUp, Lock, Edit3, Flag, Sparkles, AlertTriangle } from 'lucide-react'
import { ScoreStepper } from '@/components/ui/score-stepper'
import { MODEL_TEXT_COLORS } from '@/lib/utils'
import { SquadAdjustmentEditor } from './squad-adjustment-editor'
import { LiveMatchContext } from './live-match-context'

interface Props {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  onResultSaved?: (homeGoals: number, awayGoals: number) => void
}

type Mode = 'idle' | 'customise'
const MODELS = ['A', 'B', 'C'] as const

function poissonProb(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function modeScoreline(hl: number, al: number): { h: number; a: number } {
  let best = { h: 0, a: 0, p: 0 }
  for (let h = 0; h <= 6; h++)
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(hl, h) * poissonProb(al, a)
      if (p > best.p) best = { h, a, p }
    }
  return { h: best.h, a: best.a }
}

const BERLIN_TZ = 'Europe/Berlin'
function berlinDateLabel(utc: string) {
  return new Date(utc).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: BERLIN_TZ,
  }) + ' CEST'
}

function sourceLabel(src?: string) {
  if (src === 'pool_recommendation') return 'Pool pick'
  if (src === 'custom') return 'Custom'
  if (src === 'backfilled') return 'Backfilled'
  return 'Engine pick'
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: Recommendation['confidence'] }) {
  const map = {
    High:   'bg-green-100 text-green-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low:    'bg-red-100 text-red-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[confidence]}`}>
      {confidence} confidence
    </span>
  )
}

// ── Squad adjustment rationale banner ────────────────────────────────────────

function AdjustmentBanner({
  rationale,
  originalConfidence,
  adjustedConfidence,
}: {
  rationale: string[]
  originalConfidence: Recommendation['confidence']
  adjustedConfidence: Recommendation['confidence']
}) {
  if (rationale.length === 0) return null
  const confidenceChanged = originalConfidence !== adjustedConfidence
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
          Prediction adjusted
        </span>
      </div>
      <ul className="space-y-0.5">
        {rationale.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-[10px] text-amber-800">
            <span className="text-amber-300 shrink-0">·</span>{r}
          </li>
        ))}
      </ul>
      {confidenceChanged && (
        <p className="text-[10px] text-amber-700">
          Confidence: <span className="font-semibold">{originalConfidence}</span>
          {' → '}
          <span className="font-semibold">{adjustedConfidence}</span>
        </p>
      )}
    </div>
  )
}

// ── Tournament learning context ───────────────────────────────────────────────

interface LearningContext {
  teamName: string
  headline: string
  arrow: '↑' | '↓' | '→'
  colour: 'emerald' | 'red' | 'amber'
}

function TournamentContext({ signals }: { signals: LearningContext[] }) {
  if (signals.length === 0) return null
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 space-y-1">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
        Tournament context
      </p>
      {signals.map((s, i) => {
        const arrowCls =
          s.colour === 'emerald' ? 'text-emerald-600' : s.colour === 'red' ? 'text-red-500' : 'text-amber-500'
        const textCls =
          s.colour === 'emerald' ? 'text-emerald-700' : s.colour === 'red' ? 'text-red-600' : 'text-amber-600'
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className={`font-bold ${arrowCls}`}>{s.arrow}</span>
            <span className="font-medium text-zinc-700">{s.teamName}</span>
            <span className={textCls}>{s.headline.toLowerCase()}</span>
          </div>
        )
      })}
      <p className="text-[10px] text-zinc-400 pt-0.5">
        Already factored into the recommendation above.
      </p>
    </div>
  )
}

// ── Engine recommendation box ─────────────────────────────────────────────────

function RecommendationBox({
  rec,
  adjustedConfidence,
}: {
  rec: Recommendation
  adjustedConfidence: Recommendation['confidence']
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">WC26 Recommendation</p>
        </div>
        <ConfidenceBadge confidence={adjustedConfidence} />
      </div>
      <p className="text-3xl font-black text-zinc-900 tabular-nums leading-none">
        {rec.scoreline.home}–{rec.scoreline.away}
      </p>
      <ul className="space-y-0.5">
        {rec.rationale.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-[10px] text-zinc-500">
            <span className="text-zinc-300 shrink-0">·</span>{r}
          </li>
        ))}
      </ul>
      {rec.alternatives.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[9px] uppercase text-zinc-400 tracking-wide">Alt:</span>
          {rec.alternatives.map((alt, i) => (
            <span key={i} className="rounded bg-white border border-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
              {alt.home}–{alt.away}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline result entry form ──────────────────────────────────────────────────

function ResultEntryForm({ homeCode, awayCode, onSave, onCancel }: {
  homeCode: string; awayCode: string
  onSave: (h: number, a: number) => void; onCancel: () => void
}) {
  const [h, setH] = useState(0)
  const [a, setA] = useState(0)
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-3 space-y-3">
      <p className="text-xs font-semibold text-zinc-600">Enter Final Result</p>
      <div className="flex items-start gap-3">
        <ScoreStepper label={`${homeCode} goals`} value={h} onChange={setH} />
        <div className="text-zinc-300 text-xl pt-7 shrink-0">–</div>
        <ScoreStepper label={`${awayCode} goals`} value={a} onChange={setA} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(h, a)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          <Flag className="h-3.5 w-3.5" /> Save Result
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FixturePredictionPanel({ fixture, home, away, onResultSaved }: Props) {
  const poolRec    = getPoolRecommendation(fixture.id)
  const existingLP = getLockedPrediction(fixture.id)
  const rawPreds   = getPredictions().filter(p => p.fixture_id === fixture.id)

  // Squad adjustments — re-loaded on change via `adjTick` state
  const [adjTick, setAdjTick] = useState(0)
  const squadAdjs = getSquadAdjustments(fixture.id)

  // Apply adjustments to raw predictions before building recommendation
  const { adjustedPreds, rationale: adjRationale } = applySquadAdjustments(rawPreds, squadAdjs)
  const allPreds = adjTick >= 0 ? adjustedPreds : rawPreds // adjTick keeps dep happy

  const predsByModel = Object.fromEntries(
    MODELS.map(m => [m, rawPreds.find(p => p.model === m)])
  )

  const rec = buildRecommendation(allPreds)

  // Tournament learning signals for home/away teams
  const allTeamAdjs = buildTeamAdjustments(getTeams(), getFixtures(), getResults(), getPredictions())
  const homeAdj = allTeamAdjs.find(a => a.teamId === fixture.home_team_id)
  const awayAdj = allTeamAdjs.find(a => a.teamId === fixture.away_team_id)
  const learningSignals: LearningContext[] = [
    ...(homeAdj && hasNotableSignal(homeAdj) ? [{ ...teamSignal(homeAdj), teamName: home?.name ?? homeAdj.teamName }] : []),
    ...(awayAdj && hasNotableSignal(awayAdj) ? [{ ...teamSignal(awayAdj), teamName: away?.name ?? awayAdj.teamName }] : []),
  ]

  // Confidence after squad adjustment shifts
  const baseConfidence = rec?.confidence ?? 'Medium'
  const confidenceShifts = collectConfidenceShifts(squadAdjs)
  const adjustedConfidence = shiftConfidence(baseConfidence, confidenceShifts)

  const [locked, setLocked]             = useState<LockedPrediction | undefined>(existingLP)
  const [mode, setMode]                 = useState<Mode>('idle')
  const [homeGoals, setHomeGoals]       = useState(rec?.scoreline.home ?? 0)
  const [awayGoals, setAwayGoals]       = useState(rec?.scoreline.away ?? 0)
  const [reason, setReason]             = useState('')
  const [reasonError, setReasonError]   = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [enteringResult, setEnteringResult] = useState(false)

  function lockPick(pick: Omit<LockedPrediction, 'locked_at'>) {
    saveLockPrediction(pick)
    setLocked({ ...pick, locked_at: new Date().toISOString() })
    setMode('idle')
    setEnteringResult(false)
  }

  function usePoolRec() {
    if (!poolRec) return
    const refPred = rawPreds.find(p => p.model === poolRec.recommended_model) ?? rawPreds[0]
    lockPick({
      fixture_id:      fixture.id,
      model:           poolRec.recommended_model,
      home_goals:      poolRec.recommended_home,
      away_goals:      poolRec.recommended_away,
      home_win_prob:   refPred?.home_win_prob ?? 0,
      draw_prob:       refPred?.draw_prob ?? 0,
      away_win_prob:   refPred?.away_win_prob ?? 0,
      pick_source:     'pool_recommendation',
      override_reason: 'Suggested pool pick based on pool-scoring optimisation.',
      pool_rec_home:   poolRec.recommended_home,
      pool_rec_away:   poolRec.recommended_away,
    })
  }

  function useEngineRec() {
    if (!rec) return
    const matchingModel = MODELS.find(m => {
      const sl = rec.modelScorelines[m]
      return sl && sl.h === rec.scoreline.home && sl.a === rec.scoreline.away
    })
    lockPick({
      fixture_id:    fixture.id,
      model:         matchingModel ?? 'engine',
      home_goals:    rec.scoreline.home,
      away_goals:    rec.scoreline.away,
      home_win_prob: rec.outcomeProbs.home,
      draw_prob:     rec.outcomeProbs.draw,
      away_win_prob: rec.outcomeProbs.away,
      pick_source:   'raw',
      pool_rec_home: poolRec?.recommended_home,
      pool_rec_away: poolRec?.recommended_away,
    })
  }

  function useModel(model: typeof MODELS[number]) {
    const pred = predsByModel[model]
    if (!pred) return
    const sl = modeScoreline(pred.home_goals, pred.away_goals)
    lockPick({
      fixture_id:    fixture.id,
      model,
      home_goals:    sl.h,
      away_goals:    sl.a,
      home_win_prob: pred.home_win_prob ?? 0,
      draw_prob:     pred.draw_prob ?? 0,
      away_win_prob: pred.away_win_prob ?? 0,
      pick_source:   'raw',
      pool_rec_home: poolRec?.recommended_home,
      pool_rec_away: poolRec?.recommended_away,
    })
  }

  function lockCustom() {
    if (!reason.trim()) { setReasonError(true); return }
    const refPred = rawPreds[0]
    lockPick({
      fixture_id:      fixture.id,
      model:           refPred?.model ?? 'A',
      home_goals:      homeGoals,
      away_goals:      awayGoals,
      home_win_prob:   rec?.outcomeProbs.home ?? refPred?.home_win_prob ?? 0,
      draw_prob:       rec?.outcomeProbs.draw  ?? refPred?.draw_prob ?? 0,
      away_win_prob:   rec?.outcomeProbs.away  ?? refPred?.away_win_prob ?? 0,
      pick_source:     'custom',
      override_reason: reason.trim(),
      pool_rec_home:   poolRec?.recommended_home,
      pool_rec_away:   poolRec?.recommended_away,
    })
  }

  function handleSaveResult(h: number, a: number) {
    saveResult({ fixture_id: fixture.id, home_goals: h, away_goals: a })
    setEnteringResult(false)
    onResultSaved?.(h, a)
  }

  // ── Locked state ──────────────────────────────────────────────────────────
  if (locked && mode === 'idle') {
    const rH = Math.round(locked.home_goals)
    const rA = Math.round(locked.away_goals)
    return (
      <div className="border-t border-zinc-100 bg-green-50 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <CheckCircle className="h-3 w-3" /> Locked
            </span>
            <span className="text-base font-black text-zinc-900 tabular-nums">{rH}–{rA}</span>
            <span className="text-xs text-zinc-500">{sourceLabel(locked.pick_source)}</span>
            {locked.model && locked.model !== 'engine' && (
              <span className="text-xs text-zinc-400">· Mdl {locked.model}</span>
            )}
          </div>
          <button
            onClick={() => {
              setHomeGoals(rH); setAwayGoals(rA)
              setReason(locked.override_reason ?? '')
              setMode('customise'); setEnteringResult(false)
            }}
            className="shrink-0 flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-3 w-3" /> Change Pick
          </button>
        </div>
        {locked.pool_rec_home !== undefined && locked.home_goals !== locked.pool_rec_home && (
          <p className="text-xs text-zinc-400">Pool rec was {locked.pool_rec_home}–{locked.pool_rec_away}</p>
        )}
        {locked.override_reason && locked.pick_source === 'custom' && (
          <p className="text-xs text-zinc-400 italic">"{locked.override_reason}"</p>
        )}
        {!enteringResult ? (
          <button
            onClick={() => setEnteringResult(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Flag className="h-3.5 w-3.5 text-zinc-400" /> Enter Final Result
          </button>
        ) : (
          <ResultEntryForm
            homeCode={home?.code ?? 'Home'}
            awayCode={away?.code ?? 'Away'}
            onSave={handleSaveResult}
            onCancel={() => setEnteringResult(false)}
          />
        )}

        <LiveMatchContext fixture={fixture} home={home} away={away} />
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors select-none">
            <span className="transition-transform group-open:rotate-90">▶</span>
            Advanced manual adjustment
          </summary>
          <div className="mt-2">
            <SquadAdjustmentEditor
              fixtureId={fixture.id}
              home={home}
              away={away}
              adjustments={squadAdjs}
              onChange={() => setAdjTick(t => t + 1)}
            />
          </div>
        </details>
      </div>
    )
  }

  // ── Idle / Customise state ────────────────────────────────────────────────
  return (
    <div className="border-t border-zinc-100 bg-white px-4 py-4 space-y-4">

      <p className="text-[10px] text-zinc-400">{berlinDateLabel(fixture.kickoff_utc)}</p>

      {/* Squad adjustment rationale — shown above recommendation if active */}
      {adjRationale.length > 0 && rec && (
        <AdjustmentBanner
          rationale={adjRationale}
          originalConfidence={baseConfidence}
          adjustedConfidence={adjustedConfidence}
        />
      )}

      {/* Engine recommendation (uses adjusted xG) */}
      {rec && <RecommendationBox rec={rec} adjustedConfidence={adjustedConfidence} />}

      {/* Tournament learning context */}
      <TournamentContext signals={learningSignals} />

      {/* Action buttons: idle mode */}
      {mode === 'idle' && (
        <div className="flex flex-col gap-2">
          {poolRec && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-blue-500 mb-1 px-0.5">
                Pool Rec · Mdl {poolRec.recommended_model}
              </p>
              <button
                onClick={usePoolRec}
                className="w-full flex items-center justify-between gap-2 rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Use Pool Recommendation
                </span>
                <span className="tabular-nums">{poolRec.recommended_home}–{poolRec.recommended_away}</span>
              </button>
            </div>
          )}

          {rec && (
            <button
              onClick={useEngineRec}
              className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                poolRec
                  ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Use Recommendation
              </span>
              <span className="tabular-nums">{rec.scoreline.home}–{rec.scoreline.away}</span>
            </button>
          )}

          <button
            onClick={() => { setMode('customise'); setEnteringResult(false) }}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" /> Customise
          </button>

          {!enteringResult ? (
            <button
              onClick={() => setEnteringResult(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              <Flag className="h-3.5 w-3.5" /> Enter Final Result
            </button>
          ) : (
            <ResultEntryForm
              homeCode={home?.code ?? 'Home'}
              awayCode={away?.code ?? 'Away'}
              onSave={handleSaveResult}
              onCancel={() => setEnteringResult(false)}
            />
          )}
        </div>
      )}

      {/* Customise form */}
      {mode === 'customise' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <ScoreStepper label={`${home?.code ?? 'Home'} goals`} value={homeGoals} onChange={setHomeGoals} />
            <div className="text-zinc-300 text-xl pt-7 shrink-0">–</div>
            <ScoreStepper label={`${away?.code ?? 'Away'} goals`} value={awayGoals} onChange={setAwayGoals} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Reason for this pick <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setReasonError(false) }}
              placeholder="e.g. Backing the draw based on recent form"
              rows={2}
              className={`w-full resize-none rounded-md border px-3 py-2 text-sm text-zinc-800 focus:outline-none ${
                reasonError ? 'border-red-400 bg-red-50' : 'border-zinc-300 focus:border-blue-400'
              }`}
            />
            {reasonError && <p className="text-xs text-red-500 mt-0.5">A reason is required to lock a custom pick.</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={lockCustom}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" /> Lock Pick
            </button>
            <button
              onClick={() => { setMode('idle'); setReasonError(false) }}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ▼ Engine internals (advanced) */}
      <div className="border-t border-zinc-100 pt-3">
        <button
          onClick={() => setShowBreakdown(v => !v)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {showBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Engine internals
        </button>
        {showBreakdown && (
          <div className="mt-2 space-y-1.5">
            {MODELS.map(m => {
              const pred = predsByModel[m]
              if (!pred) return <p key={m} className="text-xs text-zinc-300">Model {m}: n/a</p>
              const sl = modeScoreline(pred.home_goals, pred.away_goals)
              return (
                <div key={m} className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${MODEL_TEXT_COLORS[m] ?? 'text-zinc-500'}`}>Model {m}</span>
                  <span className="text-xs font-bold text-zinc-800 tabular-nums">{sl.h}–{sl.a}</span>
                  <span className="text-[10px] text-zinc-400">{pred.home_goals.toFixed(1)}–{pred.away_goals.toFixed(1)} xG</span>
                  <button
                    onClick={() => useModel(m)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 underline transition-colors"
                  >
                    use
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LiveMatchContext fixture={fixture} home={home} away={away} />
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors select-none">
          <span className="transition-transform group-open:rotate-90">▶</span>
          Advanced manual adjustment
        </summary>
        <div className="mt-2">
          <SquadAdjustmentEditor
            fixtureId={fixture.id}
            home={home}
            away={away}
            adjustments={squadAdjs}
            onChange={() => setAdjTick(t => t + 1)}
          />
        </div>
      </details>
    </div>
  )
}
