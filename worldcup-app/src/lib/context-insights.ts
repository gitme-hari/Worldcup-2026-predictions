import type { MatchContext, FormEntry } from './match-context'
import type { SeedTeam } from './seed-data'
import type { GroupStanding, QualificationStatus } from './team-stats'

export type ImpactLevel = 'Low' | 'Medium' | 'High'

export interface ContextInsight {
  text: string
  type: 'positive' | 'warning' | 'info'
}

function formStats(entries: FormEntry[]) {
  return {
    w:  entries.filter(e => e.result === 'W').length,
    l:  entries.filter(e => e.result === 'L').length,
    gf: entries.reduce((s, e) => s + e.goals_for, 0),
    n:  entries.length,
  }
}

export function computeImpactLevel(ctx: MatchContext): { level: ImpactLevel; reason: string } {
  const absent = ctx.home_absences.length + ctx.away_absences.length
  const susp   = (ctx.home_suspensions?.length ?? 0) + (ctx.away_suspensions?.length ?? 0)
  const total  = absent + susp

  if (total >= 3) return { level: 'High',   reason: `${total} players absent or suspended` }
  if (total >= 2) return { level: 'Medium', reason: `${total} absences may affect outcome` }
  if (total === 1) return { level: 'Low',   reason: 'Minor squad disruption' }

  const hf = ctx.home_form
  const af = ctx.away_form
  if (hf.length >= 3) {
    const { l, gf, n } = formStats(hf)
    if (l >= Math.ceil(n / 2) || gf < n * 0.5)
      return { level: 'Medium', reason: 'Home team in poor form' }
  }
  if (af.length >= 3) {
    const { l, gf, n } = formStats(af)
    if (l >= Math.ceil(n / 2) || gf < n * 0.5)
      return { level: 'Medium', reason: 'Away team in poor form' }
  }
  return { level: 'Low', reason: 'No notable disruptions' }
}

export function buildContextInsights(
  ctx: MatchContext,
  home: SeedTeam | undefined,
  away: SeedTeam | undefined,
): ContextInsight[] {
  const out: ContextInsight[] = []

  const sides = [
    { code: home?.code ?? 'Home', form: ctx.home_form, absences: ctx.home_absences, suspensions: ctx.home_suspensions ?? [] },
    { code: away?.code ?? 'Away', form: ctx.away_form, absences: ctx.away_absences, suspensions: ctx.away_suspensions ?? [] },
  ]

  for (const { code, form, absences, suspensions } of sides) {
    if (form.length >= 3) {
      const { w, l, gf, n } = formStats(form)
      if (w >= n - 1)                  out.push({ text: `${code} unbeaten in last ${n}`, type: 'positive' })
      else if (l >= Math.ceil(n / 2))  out.push({ text: `${code} won only ${w} of last ${n}`, type: 'warning' })
      if (gf <= 1 && n >= 4)           out.push({ text: `${code} scored only ${gf} in last ${n}`, type: 'warning' })
    }
    if (absences.length === 1)          out.push({ text: `${code} missing ${absences[0]}`, type: 'info' })
    else if (absences.length >= 2)      out.push({ text: `${code} missing ${absences.length} expected starters`, type: 'warning' })
    if (suspensions.length > 0)         out.push({ text: `${code} ${suspensions.length === 1 ? '1 player' : `${suspensions.length} players`} suspended`, type: 'warning' })
  }

  if (ctx.home_lineup_status === 'confirmed' && ctx.away_lineup_status === 'confirmed') {
    out.push({ text: 'Both starting XIs confirmed', type: 'positive' })
  }

  return out
}

export interface TeamTournamentContext {
  standing: GroupStanding | undefined
  qualStatus: QualificationStatus
}

// Produces 2–3 actionable bullets from tournament standings + optional API context.
// Always returns something useful when a team has played ≥1 match.
export function buildTournamentInsights(
  home: SeedTeam | undefined,
  away: SeedTeam | undefined,
  homeCtx: TeamTournamentContext,
  awayCtx: TeamTournamentContext,
  apiCtx: MatchContext | undefined,
): ContextInsight[] {
  const out: ContextInsight[] = []

  for (const { team, ctx } of [
    { team: home, ctx: homeCtx },
    { team: away, ctx: awayCtx },
  ]) {
    const code = team?.code ?? '?'
    const s = ctx.standing
    if (!s || s.played === 0) continue

    const avgGf = (s.gf / s.played).toFixed(1)
    const avgGa = (s.ga / s.played).toFixed(1)

    // Scoring form
    if (s.gf >= 3 && s.played >= 1)
      out.push({ text: `${code} scored ${s.gf} in ${s.played} match${s.played > 1 ? 'es' : ''} (${avgGf} avg)`, type: 'positive' })
    else if (s.gf === 0 && s.played >= 1)
      out.push({ text: `${code} yet to score in ${s.played} match${s.played > 1 ? 'es' : ''}`, type: 'warning' })
    else if (s.played >= 2)
      out.push({ text: `${code} scored ${s.gf} in ${s.played} matches (${avgGf} avg)`, type: 'info' })

    // Defensive record — only highlight if notably good or bad
    if (s.ga === 0 && s.played >= 1)
      out.push({ text: `${code} kept ${s.played === 1 ? 'a' : s.played} clean sheet${s.played > 1 ? 's' : ''} — defence solid`, type: 'positive' })
    else if (s.ga >= 4 && s.played <= 2)
      out.push({ text: `${code} conceded ${s.ga} in ${s.played} match${s.played > 1 ? 'es' : ''} — defensive concern`, type: 'warning' })
    else if (s.played >= 2)
      out.push({ text: `${code} conceded ${s.ga} (${avgGa} avg)`, type: 'info' })

    // Qualification pressure
    if (ctx.qualStatus === 'must_win')
      out.push({ text: `${code} must win to stay alive`, type: 'warning' })
    else if (ctx.qualStatus === 'must_not_lose')
      out.push({ text: `${code} needs at least a draw to qualify`, type: 'warning' })
    else if (ctx.qualStatus === 'rotation_risk')
      out.push({ text: `${code} likely to rotate — already qualified`, type: 'info' })
    else if (ctx.qualStatus === 'eliminated')
      out.push({ text: `${code} eliminated — reduced motivation`, type: 'warning' })
  }

  // Mutual pressure note
  if (homeCtx.qualStatus === 'must_win' && awayCtx.qualStatus === 'must_win')
    out.push({ text: 'Both teams must win — expect an open, high-intensity match', type: 'info' })

  // Absences / suspensions from API context if available
  if (apiCtx) {
    for (const { code, abs, susp } of [
      { code: home?.code ?? 'Home', abs: apiCtx.home_absences, susp: apiCtx.home_suspensions ?? [] },
      { code: away?.code ?? 'Away', abs: apiCtx.away_absences, susp: apiCtx.away_suspensions ?? [] },
    ]) {
      if (abs.length === 1)    out.push({ text: `${code} missing ${abs[0]}`, type: 'info' })
      else if (abs.length >= 2) out.push({ text: `${code} missing ${abs.length} starters`, type: 'warning' })
      if (susp.length > 0)     out.push({ text: `${code} ${susp.length === 1 ? '1 player' : `${susp.length} players`} suspended`, type: 'warning' })
    }
  }

  return out
}

// True when the fixture is within 48h and context is missing or older than 6h
export function shouldAutoRefresh(ctx: MatchContext | undefined, kickoffUtc: string): boolean {
  const now      = Date.now()
  const kickoff  = new Date(kickoffUtc).getTime()
  const hoursUntil = (kickoff - now) / 3_600_000
  if (hoursUntil < 0 || hoursUntil > 48) return false
  if (!ctx) return true
  return now - new Date(ctx.fetched_at).getTime() > 6 * 3_600_000
}
