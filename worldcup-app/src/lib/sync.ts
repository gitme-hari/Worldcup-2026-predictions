'use client'
import { supabase } from './supabase'

export interface CloudResult {
  fixture_id: string
  home_goals: number
  away_goals: number
  entered_at: string
}

export interface CloudLockedPred {
  fixture_id: string
  model: string
  home_goals: number
  away_goals: number
  home_win_prob: number
  draw_prob: number
  away_win_prob: number
  locked_at: string
}

export interface CloudHumanPred {
  fixture_id: string
  home_goals: number
  away_goals: number
  comment: string
  created_at: string
}

export async function fetchAllFromCloud(): Promise<{
  results: CloudResult[]
  lockedPreds: CloudLockedPred[]
  humanPreds: CloudHumanPred[]
} | null> {
  try {
    const [r1, r2, r3] = await Promise.all([
      supabase.from('actual_results').select('*'),
      supabase.from('locked_predictions').select('*'),
      supabase.from('human_predictions').select('*'),
    ])
    if (r1.error || r2.error || r3.error) return null
    return {
      results: r1.data ?? [],
      lockedPreds: r2.data ?? [],
      humanPreds: r3.data ?? [],
    }
  } catch {
    return null
  }
}

export async function syncResult(fixtureId: string, homeGoals: number, awayGoals: number) {
  await supabase.from('actual_results').upsert({
    fixture_id: fixtureId, home_goals: homeGoals, away_goals: awayGoals,
  }, { onConflict: 'fixture_id' })
}

export async function deleteResultFromCloud(fixtureId: string) {
  await supabase.from('actual_results').delete().eq('fixture_id', fixtureId)
}

export async function syncLockedPred(pred: Omit<CloudLockedPred, 'locked_at'>) {
  await supabase.from('locked_predictions').upsert(pred, { onConflict: 'fixture_id' })
}

export async function deleteLockedPredFromCloud(fixtureId: string) {
  await supabase.from('locked_predictions').delete().eq('fixture_id', fixtureId)
}

export async function syncHumanPred(pred: Omit<CloudHumanPred, 'created_at'>) {
  await supabase.from('human_predictions').upsert(pred, { onConflict: 'fixture_id' })
}
