'use client'
// Client-side data store using localStorage for V1
// Replace with Supabase queries when backend is wired up

import { SEED_TEAMS, SEED_FIXTURES, SEED_PREDICTIONS } from './seed-data'
import type { SeedTeam, SeedFixture, SeedPrediction } from './seed-data'
import type { ActualResult, Override, ModelConfig, BonusPrediction, ModelMetric } from './types'
import { brierScore, logLoss, getOutcome } from './models'

const KEYS = {
  config: 'wc26_config',
  results: 'wc26_results',
  overrides: 'wc26_overrides',
  bonus: 'wc26_bonus',
  bracketOverrides: 'wc26_bracket_overrides',
  liveData: 'wc26_live_data',
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
  if (!liveData || Object.keys(liveData.teamAdjustments).length === 0) {
    return SEED_PREDICTIONS
  }

  const teamMap = Object.fromEntries(SEED_TEAMS.map(t => [t.id, t]))

  return SEED_PREDICTIONS.map(pred => {
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

export function getBestModel(): 'A' | 'B' | 'C' | null {
  const metrics = computeMetrics()
  const withData = metrics.filter(m => m.total > 0)
  if (!withData.length) return null
  return withData.sort((a, b) => b.accuracy - a.accuracy)[0].model
}
