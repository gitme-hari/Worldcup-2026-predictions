'use client'
// Client-side data store using localStorage for V1
// Replace with Supabase queries when backend is wired up

import { SEED_TEAMS, SEED_FIXTURES, SEED_PREDICTIONS } from './seed-data'
import type { SeedTeam, SeedFixture, SeedPrediction } from './seed-data'
import type { ActualResult, Override, ModelConfig, BonusPrediction, ModelMetric, HumanPrediction } from './types'
import { brierScore, logLoss, getOutcome } from './models'

const KEYS = {
  config: 'wc26_config',
  results: 'wc26_results',
  overrides: 'wc26_overrides',
  bonus: 'wc26_bonus',
  bracketOverrides: 'wc26_bracket_overrides',
  liveData: 'wc26_live_data',
  lockedPreds: 'wc26_locked_preds',
  humanPreds: 'wc26_human_preds',
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// --- Teams ---
export function getTeams(): SeedTeam[] {
  return SEED_TEAMS
}

export function getTeam(id: string): SeedTeam | undefined {
  return SEED_TEAMS.find(t => t.id === id)
}

// --- Fixtures ---
export function getFixtures(): SeedFixture[] {
  return SEED_FIXTURES
}

export function getFixture(id: string): SeedFixture | undefined {
  return SEED_FIXTURES.find(f => f.id === id)
}

// --- Live Data (Model C dynamic adjustments) ---
export interface LiveData {
  teamAdjustments: Record<string, number>
  newsItems: Array<{ headline: string; teamIds: string[]; type: 'injury' | 'positive' | 'info' }>
  matchResults: Array<{ homeId: string; awayId: string; homeGoals: number; awayGoals: number }>
  fetchedAt: string
  errors: string[]
}

export function getLiveData(): LiveData | null {
  return load<LiveData | null>(KEYS.liveData, null)
}

export function saveLiveData(data: LiveData) {
  save(KEYS.liveData, data)
}

export async function fetchLiveData(): Promise<LiveData> {
  const res = await fetch('/api/live-data')
  const data: LiveData = await res.json()
  saveLiveData(data)
  return data
}

// --- Predictions ---
export function getPredictions(): SeedPrediction[] {
  const liveData = getLiveData()
  let basePreds: SeedPrediction[]

  if (!liveData || Object.keys(liveData.teamAdjustments).length === 0) {
    basePreds = SEED_PREDICTIONS
  } else {
    basePreds = SEED_PREDICTIONS.map(pred => {
      if (pred.model !== 'C') return pred

      const fixture = SEED_FIXTURES.find(f => f.id === pred.fixture_id)
      if (!fixture) return pred

      const homeAdj = liveData.teamAdjustments[fixture.home_team_id] ?? 0
      const awayAdj = liveData.teamAdjustments[fixture.away_team_id] ?? 0
      const net = homeAdj - awayAdj
      if (Math.abs(net) < 0.01) return pred

      const newHW = Math.max(0.03, Math.min(0.93, pred.home_win_prob + net * 0.5))
      const newAW = Math.max(0.03, Math.min(0.93, pred.away_win_prob - net * 0.5))
      const newD = Math.max(0.03, 1 - newHW - newAW)
      const tot = newHW + newD + newAW

      return {
        ...pred,
        home_goals: Math.max(0.1, Math.round(pred.home_goals * (1 + homeAdj * 0.4) * 10) / 10),
        away_goals: Math.max(0.1, Math.round(pred.away_goals * (1 + awayAdj * 0.4) * 10) / 10),
        home_win_prob: Math.round((newHW / tot) * 100) / 100,
        draw_prob: Math.round((newD / tot) * 100) / 100,
        away_win_prob: Math.round((newAW / tot) * 100) / 100,
      }
    })
  }

  return basePreds
}

export function getPredictionsForFixture(fixtureId: string): SeedPrediction[] {
  return getPredictions().filter(p => p.fixture_id === fixtureId)
}


// --- Config ---
const DEFAULT_CONFIG: ModelConfig = {
  id: '1',
  active_model: 'A',
  weight_a: 33,
  weight_b: 33,
  weight_c: 34,
}

export function getConfig(): ModelConfig {
  return load(KEYS.config, DEFAULT_CONFIG)
}

export function saveConfig(config: ModelConfig) {
  save(KEYS.config, config)
}

// --- Actual Results ---
export function getResults(): ActualResult[] {
  return load<ActualResult[]>(KEYS.results, [])
}

export function getResult(fixtureId: string): ActualResult | undefined {
  return getResults().find(r => r.fixture_id === fixtureId)
}

export function saveResult(result: Omit<ActualResult, 'id' | 'entered_at'>) {
  const results = getResults()
  const existing = results.findIndex(r => r.fixture_id === result.fixture_id)
  const full: ActualResult = {
    id: `res-${result.fixture_id}`,
    ...result,
    entered_at: new Date().toISOString(),
  }
  if (existing >= 0) results[existing] = full
  else results.push(full)
  save(KEYS.results, results)
  if (typeof window !== 'undefined') {
    import('./sync').then(({ syncResult }) => {
      syncResult(result.fixture_id, result.home_goals, result.away_goals)
    })
  }
}

export function deleteResult(fixtureId: string) {
  const results = getResults().filter(r => r.fixture_id !== fixtureId)
  save(KEYS.results, results)
  if (typeof window !== 'undefined') {
    import('./sync').then(({ deleteResultFromCloud }) => {
      deleteResultFromCloud(fixtureId)
    })
  }
}

// --- Score Overrides ---
export function getOverrides(): Override[] {
  return load<Override[]>(KEYS.overrides, [])
}

export function getOverride(fixtureId: string): Override | undefined {
  return getOverrides().find(o => o.fixture_id === fixtureId)
}

export function saveOverride(override: Omit<Override, 'id'>) {
  const overrides = getOverrides()
  const existing = overrides.findIndex(o => o.fixture_id === override.fixture_id)
  const full: Override = { id: `ovr-${override.fixture_id}`, ...override }
  if (existing >= 0) overrides[existing] = full
  else overrides.push(full)
  save(KEYS.overrides, overrides)
}

export function deleteOverride(fixtureId: string) {
  const overrides = getOverrides().filter(o => o.fixture_id !== fixtureId)
  save(KEYS.overrides, overrides)
}

// --- Bracket team overrides (knockout stage) ---
export function getBracketOverrides(): Record<string, string> {
  return load<Record<string, string>>(KEYS.bracketOverrides, {})
}

export function saveBracketOverride(slotKey: string, teamId: string) {
  const overrides = getBracketOverrides()
  overrides[slotKey] = teamId
  save(KEYS.bracketOverrides, overrides)
}

// --- Bonus Predictions ---
const DEFAULT_BONUS_KEYS = [
  'champion', 'sf1', 'sf2', 'sf3', 'sf4', 'top_scorer_team',
  ...('ABCDEFGHIJKL'.split('').map(g => `winner_group_${g}`)),
]

export function getBonusPredictions(): BonusPrediction[] {
  return load<BonusPrediction[]>(KEYS.bonus, [])
}

export function saveBonusPrediction(key: string, teamId: string | null) {
  const bonus = getBonusPredictions()
  const existing = bonus.findIndex(b => b.key === key)
  const full: BonusPrediction = {
    id: `bonus-${key}`,
    model: 'hybrid',
    key,
    team_id: teamId,
  }
  if (existing >= 0) bonus[existing] = full
  else bonus.push(full)
  save(KEYS.bonus, bonus)
}

// --- Metrics computation ---
export interface ComputedMetrics {
  model: 'A' | 'B' | 'C'
  total: number
  correct: number
  accuracy: number
  avgBrier: number
  avgLogLoss: number
  homeMAE: number
  awayMAE: number
  totalGoalsMAE: number
}

export function computeMetrics(): ComputedMetrics[] {
  const results = getResults()
  const predictions = getPredictions()

  const models: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']
  return models.map(model => {
    const modelPreds = predictions.filter(p => p.model === model)
    let correct = 0, brierSum = 0, logLossSum = 0
    let homeMAESum = 0, awayMAESum = 0, count = 0

    results.forEach(result => {
      const pred = modelPreds.find(p => p.fixture_id === result.fixture_id)
      if (!pred) return
      count++

      const predOutcome = getOutcome(pred.home_goals, pred.away_goals)
      const actualOutcome = getOutcome(result.home_goals, result.away_goals)
      if (predOutcome === actualOutcome) correct++

      brierSum += brierScore(pred.home_win_prob, pred.draw_prob, pred.away_win_prob,
        result.home_goals, result.away_goals)
      logLossSum += logLoss(pred.home_win_prob, pred.draw_prob, pred.away_win_prob,
        result.home_goals, result.away_goals)
      homeMAESum += Math.abs(pred.home_goals - result.home_goals)
      awayMAESum += Math.abs(pred.away_goals - result.away_goals)
    })

    return {
      model,
      total: count,
      correct,
      accuracy: count > 0 ? correct / count : 0,
      avgBrier: count > 0 ? brierSum / count : 0,
      avgLogLoss: count > 0 ? logLossSum / count : 0,
      homeMAE: count > 0 ? homeMAESum / count : 0,
      awayMAE: count > 0 ? awayMAESum / count : 0,
      totalGoalsMAE: count > 0 ? (homeMAESum + awayMAESum) / count : 0,
    }
  })
}

// --- Locked Predictions (per-match model selection, saved before kickoff) ---
export interface LockedPrediction {
  fixture_id: string
  model: string
  home_goals: number
  away_goals: number
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
  locked_at: string
  pick_source?: 'raw' | 'calibrated' | 'custom'
  // Lineage fields — stored locally only, not synced to Supabase until migration
  override_reason?: string
  pool_rec_home?: number
  pool_rec_away?: number
}

export function getLockedPredictions(): LockedPrediction[] {
  return load<LockedPrediction[]>(KEYS.lockedPreds, [])
}

export function getLockedPrediction(fixtureId: string): LockedPrediction | undefined {
  return getLockedPredictions().find(p => p.fixture_id === fixtureId)
}

export function saveLockPrediction(pred: Omit<LockedPrediction, 'locked_at'>) {
  const preds = getLockedPredictions()
  const idx = preds.findIndex(p => p.fixture_id === pred.fixture_id)
  const full: LockedPrediction = { ...pred, locked_at: new Date().toISOString() }
  if (idx >= 0) preds[idx] = full
  else preds.push(full)
  save(KEYS.lockedPreds, preds)
  if (typeof window !== 'undefined') {
    import('./sync').then(({ syncLockedPred }) => {
      syncLockedPred(pred)
    })
  }
}

export function deleteLockedPrediction(fixtureId: string) {
  save(KEYS.lockedPreds, getLockedPredictions().filter(p => p.fixture_id !== fixtureId))
  if (typeof window !== 'undefined') {
    import('./sync').then(({ deleteLockedPredFromCloud }) => {
      deleteLockedPredFromCloud(fixtureId)
    })
  }
}

// --- Human Predictions ---
export function getHumanPredictions(): HumanPrediction[] {
  return load<HumanPrediction[]>(KEYS.humanPreds, [])
}

export function getHumanPrediction(fixtureId: string): HumanPrediction | undefined {
  return getHumanPredictions().find(p => p.fixture_id === fixtureId)
}

export function saveHumanPrediction(pred: Omit<HumanPrediction, 'id' | 'created_at'>) {
  const preds = getHumanPredictions()
  const idx = preds.findIndex(p => p.fixture_id === pred.fixture_id)
  const full: HumanPrediction = {
    id: `human-${pred.fixture_id}`,
    ...pred,
    created_at: new Date().toISOString(),
  }
  if (idx >= 0) preds[idx] = full
  else preds.push(full)
  save(KEYS.humanPreds, preds)
  if (typeof window !== 'undefined') {
    import('./sync').then(({ syncHumanPred }) => {
      syncHumanPred({ fixture_id: pred.fixture_id, home_goals: pred.home_goals, away_goals: pred.away_goals, comment: pred.comment })
    })
  }
}

export function deleteHumanPrediction(fixtureId: string) {
  save(KEYS.humanPreds, getHumanPredictions().filter(p => p.fixture_id !== fixtureId))
}

export interface HumanBiasSummary {
  teamId: string
  samples: number
  avg: number
  // reliable = 3+ samples, low = 2 samples, insufficient = 1 sample
  confidence: 'reliable' | 'low' | 'insufficient'
  qualified: boolean  // backward compat: confidence !== 'insufficient' && |avg| > 0.01
}

// Compares human overrides against the ORIGINAL seed model prediction (not the locked value).
// Falls back to active model when no LockedPrediction exists (sync-gap defence).
// Only counts overrides that have a completed result (completed = has actual score).
export function computeHumanBiasData(): HumanBiasSummary[] {
  const humanPreds = getHumanPredictions()
  const lockedPreds = getLockedPredictions()
  const allPreds = getPredictions()
  const fixtures = getFixtures()
  const results = getResults()
  const activeModel = (load<{ active_model?: string }>(KEYS.config, {}).active_model ?? 'A') as 'A' | 'B' | 'C'

  const teamDeltas: Record<string, number[]> = {}

  for (const hp of humanPreds) {
    // Only use completed overrides (match has a result)
    if (!results.find(r => r.fixture_id === hp.fixture_id)) continue
    const fixture = fixtures.find(f => f.id === hp.fixture_id)
    if (!fixture) continue

    const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
    const modelKey = (locked?.model as 'A' | 'B' | 'C' | undefined) || activeModel
    const origPred = allPreds.find(p => p.fixture_id === hp.fixture_id && p.model === modelKey)
    if (!origPred) continue

    const homeDelta = hp.home_goals - origPred.home_goals
    const awayDelta = hp.away_goals - origPred.away_goals

    if (!teamDeltas[fixture.home_team_id]) teamDeltas[fixture.home_team_id] = []
    teamDeltas[fixture.home_team_id].push(homeDelta)
    if (!teamDeltas[fixture.away_team_id]) teamDeltas[fixture.away_team_id] = []
    teamDeltas[fixture.away_team_id].push(awayDelta)
  }

  return Object.entries(teamDeltas).map(([teamId, deltas]) => {
    const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length
    const rounded = Math.round(avg * 100) / 100
    const confidence: HumanBiasSummary['confidence'] = deltas.length >= 3 ? 'reliable' : deltas.length >= 2 ? 'low' : 'insufficient'
    return {
      teamId,
      samples: deltas.length,
      avg: rounded,
      confidence,
      qualified: confidence !== 'insufficient' && Math.abs(rounded) > 0.01,
    }
  })
}

export function computeHumanBiases(): Record<string, number> {
  const result: Record<string, number> = {}
  for (const entry of computeHumanBiasData()) {
    if (entry.qualified) result[entry.teamId] = entry.avg
  }
  return result
}

export interface ModelCalibration {
  model: 'A' | 'B' | 'C'
  homeScale: number
  awayScale: number
  matchCount: number
}

export function computeCalibration(): ModelCalibration[] {
  const results = getResults()
  const lockedPreds = getLockedPredictions()

  return (['A', 'B', 'C'] as const).map(model => {
    const pairs = results.flatMap(r => {
      const locked = lockedPreds.find(p => p.fixture_id === r.fixture_id && p.model === model)
      if (!locked || locked.home_goals <= 0 || locked.away_goals <= 0) return []
      return [{ predHome: locked.home_goals, predAway: locked.away_goals, actHome: r.home_goals, actAway: r.away_goals }]
    })

    if (pairs.length < 3) return { model, homeScale: 1, awayScale: 1, matchCount: pairs.length }

    const homeScale = pairs.reduce((s, p) => s + p.actHome / p.predHome, 0) / pairs.length
    const awayScale = pairs.reduce((s, p) => s + p.actAway / p.predAway, 0) / pairs.length

    return {
      model,
      homeScale: Math.round(Math.min(2, Math.max(0.5, homeScale)) * 100) / 100,
      awayScale: Math.round(Math.min(2, Math.max(0.5, awayScale)) * 100) / 100,
      matchCount: pairs.length,
    }
  })
}

export function getBestModel(): 'A' | 'B' | 'C' | null {
  const metrics = computeMetrics()
  const withData = metrics.filter(m => m.total > 0)
  if (!withData.length) return null
  return withData.sort((a, b) => b.accuracy - a.accuracy)[0].model
}

// --- Pool Recommendations (immutable snapshots, written once per fixture) ---

export interface PoolRecommendation {
  fixture_id: string
  recommended_home: number
  recommended_away: number
  recommended_model: 'A' | 'B' | 'C'
  recommendation_reason: string
  generated_at: string
}

const POOL_RECS_KEY = 'wc26_pool_recs'

export function getPoolRecommendations(): PoolRecommendation[] {
  return load<PoolRecommendation[]>(POOL_RECS_KEY, [])
}

export function getPoolRecommendation(fixtureId: string): PoolRecommendation | undefined {
  return getPoolRecommendations().find(r => r.fixture_id === fixtureId)
}

// Write-once: if a recommendation already exists for this fixture, do not overwrite it.
export function savePoolRecommendation(rec: Omit<PoolRecommendation, 'generated_at'>) {
  const existing = getPoolRecommendations()
  if (existing.some(r => r.fixture_id === rec.fixture_id)) return
  const full: PoolRecommendation = { ...rec, generated_at: new Date().toISOString() }
  save(POOL_RECS_KEY, [...existing, full])
}
