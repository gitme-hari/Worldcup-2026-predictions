'use client'
import { useState } from 'react'
import { Zap, RefreshCw, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import {
  type MatchContext, type ImpactSignal, type LineupStatus,
  getMatchContext, saveMatchContext, clearMatchContext,
  IMPACT_LABELS, formSummary, emptyContext,
} from '@/lib/match-context'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'

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

// ── Main component ────────────────────────────────────────────────────────────

export function LiveMatchContext({ fixture, home, away }: {
  fixture: SeedFixture
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}) {
  const [ctx,      setCtx]      = useState<MatchContext | undefined>(() => getMatchContext(fixture.id))
  const [editMode, setEditMode] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!ctx && !editMode) {
    return (
      <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-zinc-400" /> Live Match Context
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">No data loaded yet</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            disabled
            className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-400 cursor-not-allowed"
            title="Connect an API provider to enable auto-refresh"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add manually
          </button>
        </div>
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

  return (
    <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-700">Live Match Context</span>
          {ctx!.impact_signal !== 'none' && (
            <Pill cls={SIGNAL_CLS[ctx!.impact_signal]} label={IMPACT_LABELS[ctx!.impact_signal]} />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-zinc-300">{ctx!.source} · {updatedAt}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-zinc-100">

          {/* Lineups & Availability */}
          <div className="pt-3 grid grid-cols-2 gap-x-4">
            {([
              ['home', home, ctx!.home_lineup_status, ctx!.home_absences],
              ['away', away, ctx!.away_lineup_status, ctx!.away_absences],
            ] as const).map(([side, team, status, absences]) => (
              <div key={side}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{team?.flag_url}</span>
                  <span className="text-[10px] font-semibold text-zinc-600">{team?.code ?? side}</span>
                  <Pill cls={LINEUP_CLS[status]} label={LINEUP_LABEL[status]} />
                </div>
                {absences.length > 0
                  ? absences.map((a, i) => <p key={i} className="text-[10px] text-red-600">✗ {a}</p>)
                  : <p className="text-[10px] text-zinc-400">No absences noted</p>
                }
              </div>
            ))}
          </div>

          {/* Form */}
          {(ctx!.home_form.length > 0 || ctx!.away_form.length > 0) && (
            <div className="border-t border-zinc-100 pt-3 grid grid-cols-2 gap-x-4">
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

          {/* Venue & Weather */}
          {(ctx!.venue_name || fixture.venue || ctx!.weather_condition) && (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-[10px] font-semibold text-zinc-500 mb-0.5">Venue</p>
              <p className="text-[10px] text-zinc-700">
                {ctx!.venue_name ?? fixture.venue}
                {ctx!.venue_indoor !== undefined && ` · ${ctx!.venue_indoor ? 'Indoor' : 'Outdoor'}`}
                {!!ctx!.venue_altitude_m && ` · ${ctx!.venue_altitude_m}m alt`}
              </p>
              {ctx!.weather_condition && (
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {ctx!.weather_temp_c !== undefined ? `${ctx!.weather_temp_c}°C · ` : ''}{ctx!.weather_condition}
                </p>
              )}
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
            <button onClick={() => setEditMode(true)} className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors">Edit</button>
            <span className="text-zinc-200">·</span>
            <button onClick={() => { clearMatchContext(fixture.id); setCtx(undefined); setExpanded(false) }} className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors">Clear</button>
          </div>
        </div>
      )}
    </div>
  )
}
