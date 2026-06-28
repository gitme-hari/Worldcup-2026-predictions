'use client'
// Learning Repository — Supabase is source of truth; localStorage is a
// session cache to avoid redundant round-trips. All writes go to Supabase.
// Reads try localStorage first, fall back to Supabase, then update cache.

import { supabase } from './supabase'
import type { RecommendationInsight, ChangelogEntry } from './recommendation-insight'

// ── Cache keys ────────────────────────────────────────────────────────────────

const CACHE_KEYS = {
  snapshots: (fixtureId: string) => `wc26_snap_cache_${fixtureId}`,
  reviews: 'wc26_match_reviews_cache',
}

function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function cacheSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore quota errors */ }
}

// ── Recommendation Snapshots ──────────────────────────────────────────────────

export interface SnapshotRow {
  id?: string
  fixture_id: string
  event: string
  scoreline_h: number
  scoreline_a: number
  confidence: string
  insight: RecommendationInsight
  driver: string | null
  created_at?: string
}

export async function saveRecommendationSnapshot(
  fixtureId: string,
  event: string,
  insight: RecommendationInsight,
  driver: string | null = null,
): Promise<void> {
  const row: Omit<SnapshotRow, 'id' | 'created_at'> = {
    fixture_id: fixtureId,
    event,
    scoreline_h: insight.scoreline.home,
    scoreline_a: insight.scoreline.away,
    confidence: insight.confidence,
    insight,
    driver,
  }
  const { error } = await supabase.from('recommendation_snapshots').insert(row)
  if (error) console.warn('[learning-repository] snapshot write failed:', error.message)
  // Invalidate cache for this fixture so next read fetches fresh data
  if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEYS.snapshots(fixtureId))
}

export async function getRecommendationHistory(fixtureId: string): Promise<SnapshotRow[]> {
  const cacheKey = CACHE_KEYS.snapshots(fixtureId)
  const cached = cacheGet<SnapshotRow[]>(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('recommendation_snapshots')
    .select('*')
    .eq('fixture_id', fixtureId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.warn('[learning-repository] snapshot read failed:', error?.message)
    return []
  }
  cacheSet(cacheKey, data)
  return data as SnapshotRow[]
}

// Returns a plain-English "what changed" string for a given look-back window.
export async function getWhatChangedSince(fixtureId: string, hours = 24): Promise<string> {
  const rows = await getRecommendationHistory(fixtureId)
  if (rows.length < 2) return 'No changes recorded yet.'

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const recent = rows.filter(r => (r.created_at ?? '') >= cutoff)
  if (recent.length === 0) return `No changes in the last ${hours} hours.`

  // Diff the most recent vs the oldest within the window
  const newest = recent[0]
  const oldest = recent[recent.length - 1]

  const parts: string[] = []
  if (newest.scoreline_h !== oldest.scoreline_h || newest.scoreline_a !== oldest.scoreline_a) {
    parts.push(
      `Scoreline updated ${oldest.scoreline_h}–${oldest.scoreline_a} → ${newest.scoreline_h}–${newest.scoreline_a}`,
    )
  }
  if (newest.confidence !== oldest.confidence) {
    parts.push(`Confidence changed from ${oldest.confidence} to ${newest.confidence}`)
  }
  if (newest.driver) parts.push(newest.driver)

  return parts.length > 0 ? parts.join(' · ') : `${recent.length} update(s) in the last ${hours}h — no scoreline change.`
}

// Derives a ChangelogEntry list from stored snapshots (for display in Matches).
export async function getChangelogEntries(fixtureId: string): Promise<ChangelogEntry[]> {
  const rows = await getRecommendationHistory(fixtureId)
  return rows.map((r, i) => {
    const prev = rows[i + 1]
    const entry: ChangelogEntry = {
      timestamp: r.created_at ?? r.insight.freshness.generatedAt,
      event: r.event as ChangelogEntry['event'],
      description: r.driver ?? r.event,
      driver: r.driver ?? '',
      scorelineBefore: prev ? { home: prev.scoreline_h, away: prev.scoreline_a } : undefined,
      scorelineAfter: { home: r.scoreline_h, away: r.scoreline_a },
      confidenceBefore: prev?.confidence,
      confidenceAfter: r.confidence,
    }
    return entry
  })
}

// ── Match Reviews ─────────────────────────────────────────────────────────────

export interface MatchReviewRow {
  fixture_id: string
  engine_h: number | null
  engine_a: number | null
  my_h: number
  my_a: number
  actual_h: number
  actual_a: number
  my_pts: number
  engine_pts: number | null
  overridden: boolean
  override_reason: string | null
  evidence: string[] | null
  impact_verdict: string
  lesson: string
  blind_spot: string | null
  engine_version: string
  created_at?: string
}

export async function saveMatchReview(review: MatchReviewRow): Promise<void> {
  const { error } = await supabase
    .from('match_reviews')
    .upsert(review, { onConflict: 'fixture_id' })
  if (error) console.warn('[learning-repository] match review write failed:', error.message)
  if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEYS.reviews)
}

export async function getMatchReviews(): Promise<MatchReviewRow[]> {
  const cached = cacheGet<MatchReviewRow[]>(CACHE_KEYS.reviews)
  if (cached) return cached

  const { data, error } = await supabase
    .from('match_reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.warn('[learning-repository] match reviews read failed:', error?.message)
    return []
  }
  cacheSet(CACHE_KEYS.reviews, data)
  return data as MatchReviewRow[]
}

export async function getMatchReview(fixtureId: string): Promise<MatchReviewRow | null> {
  const all = await getMatchReviews()
  return all.find(r => r.fixture_id === fixtureId) ?? null
}
