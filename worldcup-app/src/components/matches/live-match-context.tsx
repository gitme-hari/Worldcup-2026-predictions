'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap, RefreshCw, Plus, ChevronDown, ChevronUp, AlertCircle, Users } from 'lucide-react'
import {
  type MatchContext, type ImpactSignal, type LineupStatus,
  getMatchContext, saveMatchContext, clearMatchContext,
  IMPACT_LABELS, formSummary, emptyContext,
} from '@/lib/match-context'
import { computeImpactLevel, shouldAutoRefresh } from '@/lib/context-insights'
import {
  computeGroupStandings, computeQualificationStatus,
  QUAL_STATUS_LABEL, QUAL_STATUS_CLS, deriveMatchHistory,
} from '@/lib/team-stats'
import { getFixtures, getResults, getTeams, getPredictions } from '@/lib/store'
import { buildRecommendation } from '@/lib/recommendation-engine'
import { buildTeamAdjustments } from '@/lib/learning-layer'
import { buildDecisionSupport, type DecisionSupport } from '@/lib/decision-support'
import type { FixtureIntelligenceResponse } from '@/app/api/fixture-intelligence/route'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'

// ── Form block with opponent context ─────────────────────────────────────────

function FormBlock({ fixture, home, away }: {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}) {
  const fixtures = getFixtures()
  const results  = getResults()
  const teams    = getTeams()
  const allStandings   = computeGroupStandings(fixtures, results)
  const groupStandings = allStandings[fixture.group] ?? []

  const sides = [
    { team: home, id: fixture.home_team_id },
    { team: away, id: fixture.away_team_id },
  ]

  const hasAnyPlayed = groupStandings.some(s => s.played > 0)
  if (!hasAnyPlayed) return null

  return (
    <div className="pt-3 space-y-3">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Group {fixture.group} · Tournament Form</p>
      <div className="grid grid-cols-2 gap-x-4">
        {sides.map(({ team, id }) => {
          const s       = groupStandings.find(gs => gs.teamId === id)
          const history = deriveMatchHistory(id, fixtures, results, teams)
          const qual    = s ? computeQualificationStatus(id, groupStandings, fixture.matchday ?? 1) : 'unknown'
          const qualLabel = QUAL_STATUS_LABEL[qual]
          const qualCls   = QUAL_STATUS_CLS[qual]

          return (
            <div key={id} className="space-y-1.5">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-semibold text-zinc-700">{team?.flag_url} {team?.code ?? id}</span>
                {s && s.played > 0 && <span className="text-[9px] text-zinc-400">#{s.position} · {s.pts}pts</span>}
              </div>

              {history.length === 0 ? (
                <p className="text-[10px] text-zinc-400">No matches played yet</p>
              ) : (
                <>
                  {history.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <span className={`w-3 font-bold ${m.result === 'W' ? 'text-emerald-600' : m.result === 'D' ? 'text-amber-500' : 'text-red-500'}`}>
                        {m.result}
                      </span>
                      <span className="tabular-nums font-mono text-zinc-700">{m.gf}–{m.ga}</span>
                      <span className="text-zinc-400">{m.opponentCode}</span>
                    </div>
                  ))}
                  {s && s.played > 0 && (
                    <p className="text-[10px] text-zinc-400">
                      GF {s.gf} · GA {s.ga} · {(s.gf / s.played).toFixed(1)}/{(s.ga / s.played).toFixed(1)} avg
                    </p>
                  )}
                  {qualLabel && (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${qualCls}`}>
                      {qualLabel}
                    </span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Decision support (confidence, support/challenge, alternatives) ────────────

function DecisionSupportSection({ fixture, home, away, apiCtx }: {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  apiCtx: MatchContext | undefined
}) {
  const fixtures = getFixtures()
  const results  = getResults()
  const teams    = getTeams()
  const preds    = getPredictions().filter(p => p.fixture_id === fixture.id)
  const rec      = buildRecommendation(preds)

  if (!rec) return null

  const allStandings   = computeGroupStandings(fixtures, results)
  const groupStandings = allStandings[fixture.group] ?? []
  const matchday       = fixture.matchday ?? 1
  const homeStanding   = groupStandings.find(s => s.teamId === fixture.home_team_id)
  const awayStanding   = groupStandings.find(s => s.teamId === fixture.away_team_id)
  const homeQual       = computeQualificationStatus(fixture.home_team_id, groupStandings, matchday)
  const awayQual       = computeQualificationStatus(fixture.away_team_id, groupStandings, matchday)
  const learningAdjs   = buildTeamAdjustments(teams, fixtures, results, getPredictions())
  const homeAdj        = learningAdjs.find(a => a.teamId === fixture.home_team_id)
  const awayAdj        = learningAdjs.find(a => a.teamId === fixture.away_team_id)

  const ds = buildDecisionSupport({ rec, homeAdj, awayAdj, homeStanding, awayStanding, homeQual, awayQual, apiCtx, home, away })

  const confCls: Record<string, string> = {
    'High': 'text-emerald-700', 'Medium-High': 'text-emerald-600',
    'Medium': 'text-amber-600', 'Medium-Low': 'text-amber-700', 'Low': 'text-red-600',
  }

  return (
    <div className="border-t border-zinc-100 pt-3 space-y-2.5">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Decision Support</p>

      {/* Challenge warning */}
      {ds.challengeLevel === 'significant' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-amber-800 mb-1">⚠ Recommendation Challenge</p>
          <p className="text-[10px] text-amber-700">Engine predicts {rec.scoreline.home}–{rec.scoreline.away}. Context factors below challenge this.</p>
        </div>
      )}

      {/* Support factors */}
      {ds.supportFactors.map((f, i) => (
        <p key={i} className="text-[10px] text-emerald-700 flex items-start gap-1.5">
          <span className="shrink-0 font-bold mt-px">+</span>{f}
        </p>
      ))}

      {/* Challenge factors */}
      {ds.challengeFactors.map((f, i) => (
        <p key={i} className="text-[10px] text-amber-700 flex items-start gap-1.5">
          <span className="shrink-0 font-bold mt-px">−</span>{f}
        </p>
      ))}

      {/* Confidence */}
      <div className="border-t border-zinc-100 pt-2">
        <p className="text-[10px] text-zinc-500">
          Engine confidence: <span className="font-semibold text-zinc-700">{ds.engineConfidence}</span>
          {ds.contextConfidence !== ds.engineConfidence && (
            <> → Context-adjusted: <span className={`font-semibold ${confCls[ds.contextConfidence] ?? ''}`}>{ds.contextConfidence}</span></>
          )}
        </p>
        {ds.confidenceReasons.map((r, i) => (
          <p key={i} className="text-[10px] text-zinc-400 mt-0.5 flex gap-1"><span>·</span>{r}</p>
        ))}
      </div>

      {/* Net effect verdict */}
      {ds.netEffect && (
        <div className={`rounded px-2.5 py-2 text-[10px] font-medium ${
          ds.challengeLevel === 'significant' ? 'bg-amber-50 text-amber-800' :
          ds.challengeLevel === 'minor'       ? 'bg-zinc-50 text-zinc-700' :
                                               'bg-emerald-50 text-emerald-800'
        }`}>
          {ds.netEffect}
        </div>
      )}

      {/* Alternatives */}
      {rec.alternatives.length > 0 && (
        <div className="border-t border-zinc-100 pt-2">
          <p className="text-[10px] text-zinc-500 mb-1">
            Most plausible alternatives:{' '}
            <span className="font-mono font-semibold text-zinc-700">
              {rec.alternatives.slice(0, 3).map(a => `${a.home}–${a.away}`).join(' · ')}
            </span>
          </p>
          {ds.alternativeReasoning && (
            <p className="text-[10px] text-zinc-400">{ds.alternativeReasoning}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SIGNAL_CLS: Record<ImpactSignal, string> = {
  none:                 'bg-zinc-100 text-zinc-500',
  increase_home_goals:  'bg-emerald-100 text-emerald-700',
  increase_away_goals:  'bg-blue-100 text-blue-700',
  lower_confidence:     'bg-amber-100 text-amber-700',
  consider_alternative: 'bg-purple-100 text-purple-700',
}
const LINEUP_CLS: Record<LineupStatus, string> = {
  unknown:   'bg-zinc-100 text-zinc-400',
  probable:  'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
}
const LINEUP_LABEL: Record<LineupStatus, string> = {
  unknown: 'Not available', probable: 'Probable', confirmed: 'Confirmed',
}

function Pill({ cls, label }: { cls: string; label: string }) {
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>
}

// ── Starting XI grid ──────────────────────────────────────────────────────────

function StartingXI({ players, formation, coach, teamCode }: {
  players: string[]
  formation?: string
  coach?: string
  teamCode: string
}) {
  const [show, setShow] = useState(false)
  if (players.length === 0) return null
  return (
    <div>
      <button
        onClick={() => setShow(v => !v)}
        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <Users className="h-3 w-3" />
        {show ? 'Hide' : 'Show'} XI
        {formation && <span className="ml-1 font-mono">{formation}</span>}
      </button>
      {show && (
        <div className="mt-1 space-y-0.5">
          {players.map((name, i) => (
            <p key={i} className="text-[10px] text-zinc-600">{i + 1}. {name}</p>
          ))}
          {coach && <p className="text-[10px] text-zinc-400 mt-1 italic">Coach: {coach}</p>}
        </div>
      )}
    </div>
  )
}

// ── Manual entry form ─────────────────────────────────────────────────────────

function EntryForm({ fixtureId, home, away, existing, onSave, onCancel }: {
  fixtureId: string
  home: SeedTeam | undefined
  away: SeedTeam | undefined
  existing: MatchContext | undefined
  onSave: (ctx: MatchContext) => void
  onCancel: () => void
}) {
  const base = existing ?? emptyContext(fixtureId)
  const [homeLineup, setHomeLineup] = useState<LineupStatus>(base.home_lineup_status)
  const [awayLineup, setAwayLineup] = useState<LineupStatus>(base.away_lineup_status)
  const [homeAbs,    setHomeAbs]    = useState(base.home_absences.join('\n'))
  const [awayAbs,    setAwayAbs]    = useState(base.away_absences.join('\n'))
  const [signal,     setSignal]     = useState<ImpactSignal>(base.impact_signal)
  const [notes,      setNotes]      = useState(base.impact_notes.join('\n'))

  function handleSave() {
    const ctx: MatchContext = {
      ...base,
      fetched_at:           new Date().toISOString(),
      home_lineup_status:   homeLineup,
      away_lineup_status:   awayLineup,
      home_absences:        homeAbs.split('\n').map(s => s.trim()).filter(Boolean),
      away_absences:        awayAbs.split('\n').map(s => s.trim()).filter(Boolean),
      impact_signal:        signal,
      impact_notes:         notes.split('\n').map(s => s.trim()).filter(Boolean),
    }
    saveMatchContext(ctx)
    onSave(ctx)
  }

  const sides = [
    { key: 'home', team: home, lineup: homeLineup, setLineup: setHomeLineup, abs: homeAbs, setAbs: setHomeAbs },
    { key: 'away', team: away, lineup: awayLineup, setLineup: setAwayLineup, abs: awayAbs, setAbs: setAwayAbs },
  ] as const

  return (
    <div className="space-y-3 pt-3 mt-1 border-t border-zinc-100">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Manual context</p>

      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ key, team, lineup, setLineup, abs, setAbs }) => (
          <div key={key} className="space-y-1.5">
            <p className="text-[10px] text-zinc-400">{team?.flag_url} {team?.code ?? key}</p>
            <select
              value={lineup}
              onChange={e => setLineup(e.target.value as LineupStatus)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
            >
              <option value="unknown">Not available</option>
              <option value="probable">Probable XI</option>
              <option value="confirmed">Confirmed XI</option>
            </select>
            <textarea
              value={abs}
              onChange={e => setAbs(e.target.value)}
              placeholder={"One per line\ne.g. Kane (knee)"}
              rows={2}
              className="w-full resize-none rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:border-blue-300"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-zinc-400">Engine impact</p>
        <select
          value={signal}
          onChange={e => setSignal(e.target.value as ImpactSignal)}
          className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
        >
          {(Object.keys(IMPACT_LABELS) as ImpactSignal[]).map(k => (
            <option key={k} value={k}>{IMPACT_LABELS[k]}</option>
          ))}
        </select>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes — one per line"
          rows={2}
          className="w-full resize-none rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:border-blue-300"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          Save context
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── API refresh ───────────────────────────────────────────────────────────────

async function fetchContextFromApi(fixtureId: string): Promise<{ ctx: MatchContext | null; errors: string[] }> {
  const res = await fetch(`/api/fixture-intelligence?type=context&fixture=${encodeURIComponent(fixtureId)}`)
  if (!res.ok) {
    return { ctx: null, errors: [`Server error ${res.status}`] }
  }
  const data: FixtureIntelligenceResponse = await res.json()
  return { ctx: data.context ?? null, errors: data.errors ?? [] }
}

// ── Main component ────────────────────────────────────────────────────────────

export function LiveMatchContext({ fixture, home, away }: {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}) {
  const [ctx,       setCtx]       = useState<MatchContext | undefined>(() => getMatchContext(fixture.id))
  const [editMode,  setEditMode]  = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [apiError,  setApiError]  = useState<string | null>(null)
  const autoRefreshed              = useRef(false)

  async function handleRefresh() {
    setLoading(true)
    setApiError(null)
    try {
      const { ctx: fetched, errors } = await fetchContextFromApi(fixture.id)
      if (fetched) {
        saveMatchContext(fetched)
        setCtx(fetched)
        setExpanded(true)
      } else {
        const msg = errors.length > 0 ? errors.join(' · ') : 'No data returned from API'
        setApiError(msg)
      }
    } catch {
      setApiError('Network error — could not reach /api/fixture-intelligence')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh: fire once on mount when fixture is within 48h and context is stale
  useEffect(() => {
    if (autoRefreshed.current) return
    if (!shouldAutoRefresh(ctx, fixture.kickoff_utc)) return
    autoRefreshed.current = true
    handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!ctx && !editMode) {
    return (
      <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-zinc-400" /> Live Match Context
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {loading ? 'Loading from API…'
                : shouldAutoRefresh(undefined, fixture.kickoff_utc) ? 'No context yet — auto-refresh queued'
                : new Date(fixture.kickoff_utc).getTime() < Date.now() ? 'No context available'
                : 'No data loaded yet'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={() => setEditMode(true)}
              disabled={loading}
              className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add manually
            </button>
          </div>
        </div>
        {apiError && (
          <div className="flex items-start gap-1.5 rounded bg-red-50 border border-red-100 px-2 py-1.5">
            <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600">{apiError}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Edit form ───────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5">
        <p className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-zinc-400" /> Live Match Context
        </p>
        <EntryForm
          fixtureId={fixture.id}
          home={home}
          away={away}
          existing={ctx}
          onSave={saved => { setCtx(saved); setEditMode(false); setExpanded(true) }}
          onCancel={() => setEditMode(false)}
        />
      </div>
    )
  }

  // ── Loaded state ────────────────────────────────────────────────────────────
  const updatedAt = new Date(ctx!.fetched_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const hasAbsences = ctx!.home_absences.length + ctx!.away_absences.length > 0
  const hasSuspensions = (ctx!.home_suspensions?.length ?? 0) + (ctx!.away_suspensions?.length ?? 0) > 0

  return (
    <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors min-w-0"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-700">Live Match Context</span>
            {ctx!.impact_signal !== 'none' && (
              <Pill cls={SIGNAL_CLS[ctx!.impact_signal]} label={IMPACT_LABELS[ctx!.impact_signal]} />
            )}
            {(() => {
              const { level } = computeImpactLevel(ctx!)
              if (level === 'Low') return null
              return <Pill cls={level === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} label={`${level} impact`} />
            })()}
            {hasAbsences && (
              <Pill cls="bg-red-50 text-red-600" label={`${ctx!.home_absences.length + ctx!.away_absences.length} absent`} />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-zinc-300">{ctx!.source} · {updatedAt}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
          </div>
        </button>
        {/* Inline refresh button when data is loaded */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-2.5 py-2.5 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition-colors shrink-0"
          title="Refresh from API-Football"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* API error while data already loaded */}
      {apiError && (
        <div className="mx-3 mb-2 flex items-start gap-1.5 rounded bg-red-50 border border-red-100 px-2 py-1.5">
          <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-600">{apiError}</p>
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-zinc-100">

          {/* Form with opponent context */}
          <FormBlock fixture={fixture} home={home} away={away} />

          {/* Decision support — confidence, support/challenge factors, alternatives */}
          <DecisionSupportSection fixture={fixture} home={home} away={away} apiCtx={ctx ?? undefined} />

          {/* Lineups, absences, suspensions */}
          <div className="pt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {([
              ['home', home, ctx!.home_lineup_status, ctx!.home_absences, ctx!.home_suspensions, ctx!.home_startXI, ctx!.home_formation, ctx!.home_coach],
              ['away', away, ctx!.away_lineup_status, ctx!.away_absences, ctx!.away_suspensions, ctx!.away_startXI, ctx!.away_formation, ctx!.away_coach],
            ] as const).map(([side, team, status, absences, suspensions, startXI, formation, coach]) => (
              <div key={side} className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>{team?.flag_url}</span>
                  <span className="text-[10px] font-semibold text-zinc-600">{team?.code ?? side}</span>
                  <Pill
                    cls={LINEUP_CLS[status]}
                    label={status === 'unknown' && ctx!.source === 'api-football' ? 'No lineup yet' : LINEUP_LABEL[status]}
                  />
                </div>
                {absences.length > 0
                  ? absences.map((a, i) => (
                      <p key={i} className="text-[10px] text-red-600 flex items-center gap-1">
                        <span className="text-red-400">✗</span> {a}
                      </p>
                    ))
                  : ctx!.source === 'api-football'
                    ? <p className="text-[10px] text-zinc-400">No injuries reported by API</p>
                    : <p className="text-[10px] text-zinc-400">None entered</p>
                }
                {(suspensions?.length ?? 0) > 0 && suspensions!.map((s, i) => (
                  <p key={i} className="text-[10px] text-amber-600 flex items-center gap-1">
                    <span>⚠</span> {s} <span className="text-zinc-400">(susp)</span>
                  </p>
                ))}
                {startXI && startXI.length > 0 && (
                  <StartingXI players={startXI} formation={formation} coach={coach} teamCode={team?.code ?? side} />
                )}
              </div>
            ))}
          </div>

          {/* API form (recent non-tournament matches from API-Football, if available) */}
          {(ctx!.home_form.length > 0 || ctx!.away_form.length > 0) && (
            <div className="border-t border-zinc-100 pt-3 grid grid-cols-2 gap-x-4">
              <p className="col-span-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">API Recent Form</p>
              {([['home', home, ctx!.home_form], ['away', away, ctx!.away_form]] as const).map(([side, team, form]) => {
                if (form.length === 0) return null
                const { str, gf, ga } = formSummary(form)
                return (
                  <div key={side}>
                    <p className="text-[10px] font-semibold text-zinc-500 mb-0.5">{team?.code ?? side} last {form.length}</p>
                    <p className="text-[10px] font-mono text-zinc-700 tracking-wider">{str}</p>
                    <p className="text-[10px] text-zinc-400">{gf} scored · {ga} conceded</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Venue — only show when altitude or weather materially affects the match */}
          {(!!ctx!.venue_altitude_m || ctx!.weather_condition) && (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-[10px] text-zinc-500">
                {ctx!.venue_name ?? fixture.venue}
                {!!ctx!.venue_altitude_m && ` · ${ctx!.venue_altitude_m}m altitude`}
                {ctx!.weather_condition && ` · ${ctx!.weather_temp_c !== undefined ? `${ctx!.weather_temp_c}°C ` : ''}${ctx!.weather_condition}`}
              </p>
            </div>
          )}

          {/* Engine impact */}
          <div className="border-t border-zinc-100 pt-3">
            <p className="text-[10px] font-semibold text-zinc-500 mb-1">Engine impact</p>
            <Pill cls={SIGNAL_CLS[ctx!.impact_signal]} label={IMPACT_LABELS[ctx!.impact_signal]} />
            {ctx!.impact_notes.map((n, i) => (
              <p key={i} className="text-[10px] text-zinc-500 mt-0.5 flex gap-1.5">
                <span className="text-zinc-300">·</span>{n}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 pt-2 flex items-center gap-2">
            <button onClick={() => setEditMode(true)} className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors">Edit manually</button>
            <span className="text-zinc-200">·</span>
            <button
              onClick={() => { clearMatchContext(fixture.id); setCtx(undefined); setExpanded(false); setApiError(null) }}
              className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
