import type { MatchContext, FormEntry } from './match-context'
import type { SeedTeam } from './seed-data'

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

// True when the fixture is within 48h and context is missing or older than 6h
export function shouldAutoRefresh(ctx: MatchContext | undefined, kickoffUtc: string): boolean {
  const now      = Date.now()
  const kickoff  = new Date(kickoffUtc).getTime()
  const hoursUntil = (kickoff - now) / 3_600_000
  if (hoursUntil < 0 || hoursUntil > 48) return false
  if (!ctx) return true
  return now - new Date(ctx.fetched_at).getTime() > 6 * 3_600_000
}
