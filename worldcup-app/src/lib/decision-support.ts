// Synthesises recommendation engine output, learning adjustments, tournament standings,
// and optional API context into decision-support signals.
// Does NOT change the engine scoreline — only explains and challenges it.

import type { Recommendation } from './recommendation-engine'
import type { TeamAdjustment } from './learning-layer'
import type { GroupStanding, QualificationStatus } from './team-stats'
import type { MatchContext } from './match-context'
import type { SeedTeam } from './seed-data'

export type ContextConfidence = 'High' | 'Medium-High' | 'Medium' | 'Medium-Low' | 'Low'

export interface DecisionSupport {
  engineConfidence: 'High' | 'Medium' | 'Low'
  contextConfidence: ContextConfidence
  // Factors that agree with the recommendation
  supportFactors: string[]
  // Factors that argue against the recommendation
  challengeFactors: string[]
  // 'significant' triggers a visible warning card; 'minor' shows a soft note
  challengeLevel: 'none' | 'minor' | 'significant'
  // One sentence explaining why alternatives are worth considering, or null
  alternativeReasoning: string | null
  // Bullets explaining the context-adjusted confidence
  confidenceReasons: string[]
}

export interface DecisionSupportParams {
  rec: Recommendation
  homeAdj: TeamAdjustment | undefined
  awayAdj: TeamAdjustment | undefined
  homeStanding: GroupStanding | undefined
  awayStanding: GroupStanding | undefined
  homeQual: QualificationStatus
  awayQual: QualificationStatus
  apiCtx: MatchContext | undefined
  home: SeedTeam | undefined
  away: SeedTeam | undefined
}

function stepDown(c: ContextConfidence): ContextConfidence {
  const ladder: ContextConfidence[] = ['High', 'Medium-High', 'Medium', 'Medium-Low', 'Low']
  const i = ladder.indexOf(c)
  return ladder[Math.min(i + 1, ladder.length - 1)]
}

export function buildDecisionSupport({
  rec, homeAdj, awayAdj, homeStanding, awayStanding,
  homeQual, awayQual, apiCtx, home, away,
}: DecisionSupportParams): DecisionSupport {
  const hCode = home?.code ?? 'Home'
  const aCode = away?.code ?? 'Away'
  const predH = rec.scoreline.home
  const predA = rec.scoreline.away
  const support: string[] = []
  const challenge: string[] = []
  const confReasons: string[] = []

  // ── Model agreement ────────────────────────────────────────────────────────
  if (rec.agreement === 'full') {
    support.push(`All 3 models agree on this scoreline`)
  } else if (rec.agreement === 'majority') {
    support.push(`2 of 3 models favour this outcome`)
  } else {
    const parts = (['A', 'B', 'C'] as const)
      .map(m => { const sl = rec.modelScorelines[m]; return sl ? `Mdl ${m}: ${sl.h}–${sl.a}` : null })
      .filter(Boolean).join(' · ')
    challenge.push(`Models disagree — ${parts}`)
  }

  // ── Tournament scoring vs predicted goals ──────────────────────────────────
  if (homeStanding && homeStanding.played > 0) {
    const avgGf = homeStanding.gf / homeStanding.played
    const avgGa = homeStanding.ga / homeStanding.played

    if (avgGf >= 2.0 && predH >= 2)
      support.push(`${hCode} averaging ${avgGf.toFixed(1)} goals/game — supports ${predH}+ home goals`)
    else if (avgGf < 0.8 && predH >= 2)
      challenge.push(`${hCode} scoring only ${avgGf.toFixed(1)}/game — ${predH} home goals may be optimistic`)

    if (avgGa <= 0.5 && predA === 0)
      support.push(`${hCode} conceding only ${avgGa.toFixed(1)}/game — clean sheet plausible`)
    else if (avgGa >= 2.5 && predA === 0)
      challenge.push(`${hCode} conceding ${avgGa.toFixed(1)}/game — shutout unlikely`)
  }

  if (awayStanding && awayStanding.played > 0) {
    const avgGf = awayStanding.gf / awayStanding.played
    const avgGa = awayStanding.ga / awayStanding.played

    if (avgGf >= 2.5 && predA <= 1)
      challenge.push(`${aCode} averaging ${avgGf.toFixed(1)} goals/game — engine may underestimate their attack`)
    else if (avgGf >= 2.0 && predA >= 2)
      support.push(`${aCode} averaging ${avgGf.toFixed(1)} goals/game — supports ${predA}+ away goals`)

    if (avgGa <= 0.5 && predH >= 3)
      challenge.push(`${aCode} conceding only ${avgGa.toFixed(1)}/game — ${predH} home goals is ambitious`)
  }

  // ── Learning adjustments (actual vs expected performance) ─────────────────
  if (homeAdj) {
    const pct = Math.round(Math.abs(homeAdj.attackFactor - 1) * 100)
    if (homeAdj.attackFactor >= 1.15 && predH >= 2)
      support.push(`${hCode} scoring ${pct}% above model expectation`)
    else if (homeAdj.attackFactor <= 0.85 && predH >= 2)
      challenge.push(`${hCode} scoring ${pct}% below expectation — high home total at risk`)

    if (homeAdj.defenceFactor <= 0.85 && predA === 0)
      support.push(`${hCode} defence conceding ${Math.round((1 - homeAdj.defenceFactor) * 100)}% less than expected`)
    else if (homeAdj.defenceFactor >= 1.20 && predA === 0)
      challenge.push(`${hCode} defence conceding ${Math.round((homeAdj.defenceFactor - 1) * 100)}% more than expected — clean sheet at risk`)
  }

  if (awayAdj) {
    const pct = Math.round(Math.abs(awayAdj.attackFactor - 1) * 100)
    if (awayAdj.attackFactor >= 1.15 && predA <= 1)
      challenge.push(`${aCode} scoring ${pct}% above expectation — low away total at risk`)
    else if (awayAdj.attackFactor >= 1.15 && predA >= 2)
      support.push(`${aCode} scoring ${pct}% above expectation — supports their goals`)

    if (awayAdj.defenceFactor >= 1.20 && predH >= 2)
      challenge.push(`${aCode} defence leaking ${Math.round((awayAdj.defenceFactor - 1) * 100)}% more than expected — home may score more`)
  }

  // ── Qualification pressure ─────────────────────────────────────────────────
  if (homeQual === 'must_win') {
    if (predH > predA)
      support.push(`${hCode} must win — match pressure drives aggressive home play`)
    else
      challenge.push(`${hCode} must win but engine predicts a draw or loss — motivation mismatch`)
  }
  if (homeQual === 'rotation_risk')
    challenge.push(`${hCode} already qualified — rotation likely`)
  if (homeQual === 'eliminated')
    challenge.push(`${hCode} eliminated — motivation uncertain`)

  if (awayQual === 'must_win') {
    if (predA > predH)
      support.push(`${aCode} must win — pressure drives attacking away play`)
    else
      challenge.push(`${aCode} must win but engine predicts a ${predH > predA ? 'home win' : 'draw'} — expect ${aCode} aggression`)
  }
  if (awayQual === 'rotation_risk')
    challenge.push(`${aCode} already qualified — rotation likely`)
  if (awayQual === 'eliminated')
    challenge.push(`${aCode} eliminated — motivation uncertain`)

  // ── API context — absences / suspensions ──────────────────────────────────
  if (apiCtx) {
    const homeOut = apiCtx.home_absences.length + (apiCtx.home_suspensions?.length ?? 0)
    const awayOut = apiCtx.away_absences.length + (apiCtx.away_suspensions?.length ?? 0)
    if (homeOut >= 2) challenge.push(`${hCode} missing ${homeOut} players`)
    if (awayOut >= 2) challenge.push(`${aCode} missing ${awayOut} players`)
    if (homeOut === 1) confReasons.push(`Minor squad disruption for ${hCode}`)
    if (awayOut === 1) confReasons.push(`Minor squad disruption for ${aCode}`)
  }

  // ── Challenge level ────────────────────────────────────────────────────────
  const challengeLevel: 'none' | 'minor' | 'significant' =
    challenge.length >= 2 ? 'significant' :
    challenge.length === 1 ? 'minor' : 'none'

  // ── Alternative reasoning ──────────────────────────────────────────────────
  let alternativeReasoning: string | null = null
  if (rec.alternatives.length > 0 && challengeLevel !== 'none') {
    if (awayStanding && awayStanding.played > 0 && awayStanding.gf / awayStanding.played >= 2.0)
      alternativeReasoning = `${aCode} averaging ${(awayStanding.gf / awayStanding.played).toFixed(1)} goals/game raises the probability of both teams scoring`
    else if (rec.agreement === 'split')
      alternativeReasoning = 'Model disagreement suggests genuine uncertainty — alternatives are closer in probability than usual'
    else if (challenge.length >= 2)
      alternativeReasoning = 'Multiple context factors challenge the prediction — check alternatives before locking'
  }

  // ── Confidence adjustment ─────────────────────────────────────────────────
  confReasons.unshift(
    rec.agreement === 'full' ? 'All 3 models agree on this scoreline' :
    rec.agreement === 'majority' ? '2 of 3 models favour this outcome' :
    'Models disagree on the scoreline'
  )
  if (challengeLevel === 'significant') confReasons.push('Multiple context factors challenge this pick')
  if (homeQual === 'rotation_risk' || awayQual === 'rotation_risk') confReasons.push('Squad rotation may affect starting quality')

  const baseConf: ContextConfidence =
    rec.confidence === 'High' ? 'High' :
    rec.confidence === 'Medium' ? 'Medium' : 'Medium-Low'

  let contextConfidence: ContextConfidence = baseConf
  if (challengeLevel === 'significant') contextConfidence = stepDown(stepDown(contextConfidence))
  else if (challengeLevel === 'minor') contextConfidence = stepDown(contextConfidence)
  if (homeQual === 'rotation_risk' || awayQual === 'rotation_risk') contextConfidence = stepDown(contextConfidence)

  return {
    engineConfidence: rec.confidence,
    contextConfidence,
    supportFactors: support.slice(0, 3),
    challengeFactors: challenge.slice(0, 3),
    challengeLevel,
    alternativeReasoning,
    confidenceReasons: confReasons.slice(0, 3),
  }
}
