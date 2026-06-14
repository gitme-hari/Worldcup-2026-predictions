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
  tabpfnPreds: 'wc26_tabpfn_preds',
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

  // Client-side only: overlay TabPFN predictions on Model C
  if (typeof window !== 'undefined') {
    const tabpfnPreds = getTabPFNPredictions()
    if (tabpfnPreds.length > 0) {
      const tabpfnMap = Object.fromEntries(tabpfnPreds.map(p => [p.fixture_id, p]))
      return basePreds.map(pred => {
        if (pred.model !== 'C') return pred
        const tp = tabpfnMap[pred.fixture_id]
        if (!tp) return pred
        return {
          ...pred,
          home_win_prob: tp.home_win_prob,
          draw_prob: tp.draw_prob,
          away_win_prob: tp.away_win_prob,
        }
      })
    }
  }

  return basePreds
}

export function getPredictionsForFixture(fixtureId: string): SeedPrediction[] {
  return getPredictions().filter(p => p.fixture_id === fixtureId)
}

// --- TabPFN Predictions ---
export interface TabPFNPrediction {
  fixture_id: string
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
  fetched_at: string
}

export function getTabPFNPredictions(): TabPFNPrediction[] {
  return load<TabPFNPrediction[]>(KEYS.tabpfnPreds, [])
}

export function saveTabPFNPredictions(preds: Omit<TabPFNPrediction, 'fetched_at'>[]) {
  const now = new Date().toISOString()
  save(KEYS.tabpfnPreds, preds.map(p => ({ ...p, fetched_at: now })))
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
}

export function deleteResult(fixtureId: string) {
  const results = getResults().filter(r => r.fixture_id !== fixtureId)
  save(KEYS.results, results)
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
}

export function deleteLockedPrediction(fixtureId: string) {
  save(KEYS.lockedPreds, getLockedPredictions().filter(p => p.fixture_id !== fixtureId))
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
}

export function deleteHumanPrediction(fixtureId: string) {
  save(KEYS.humanPreds, getHumanPredictions().filter(p => p.fixture_id !== fixtureId))
}

// Returns per-team bias corrections learned from human overrides
// For each team the user consistently over/under-predicted vs model,
// compute an average delta that can be used as a Model D adjustment
export function computeHumanBiases(): Record<string, number> {
  const humanPreds = getHumanPredictions()
  const lockedPreds = getLockedPredictions()
  const fixtures = getFixtures()

  const teamDeltas: Record<string, number[]> = {}

  for (const hp of humanPreds) {
    const locked = lockedPreds.find(p => p.fixture_id === hp.fixture_id)
    if (!locked) continue
    const fixture = fixtures.find(f => f.id === hp.fixture_id)
    if (!fixture) continue

    const homeDelta = hp.home_goals - locked.home_goals
    const awayDelta = hp.away_goals - locked.away_goals

    if (!teamDeltas[fixture.home_team_id]) teamDeltas[fixture.home_team_id] = []
    teamDeltas[fixture.home_team_id].push(homeDelta)

    if (!teamDeltas[fixture.away_team_id]) teamDeltas[fixture.away_team_id] = []
    teamDeltas[fixture.away_team_id].push(awayDelta)
  }

  const biases: Record<string, number> = {}
  for (const [teamId, deltas] of Object.entries(teamDeltas)) {
    const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length
    if (Math.abs(avg) > 0.01) {
      biases[teamId] = Math.round(avg * 100) / 100
    }
  }
  return biases
}

export function getBestModel(): 'A' | 'B' | 'C' | null {
  const metrics = computeMetrics()
  const withData = metrics.filter(m => m.total > 0)
  if (!withData.length) return null
  return withData.sort((a, b) => b.accuracy - a.accuracy)[0].model
}
