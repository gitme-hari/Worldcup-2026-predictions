'use client'
import { useEffect } from 'react'
import { fetchAllFromCloud } from '@/lib/sync'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetchAllFromCloud().then(data => {
      if (!data) return

      if (data.results.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_results') ?? '[]')
        const merged = [...existing]
        for (const r of data.results) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === r.fixture_id)
          const full = { id: `res-${r.fixture_id}`, fixture_id: r.fixture_id, home_goals: r.home_goals, away_goals: r.away_goals, entered_at: r.entered_at }
          if (idx >= 0) merged[idx] = full
          else merged.push(full)
        }
        localStorage.setItem('wc26_results', JSON.stringify(merged))
      }

      if (data.lockedPreds.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_locked_preds') ?? '[]')
        const merged = [...existing]
        for (const p of data.lockedPreds) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === p.fixture_id)
          if (idx >= 0) merged[idx] = p
          else merged.push(p)
        }
        localStorage.setItem('wc26_locked_preds', JSON.stringify(merged))
      }

      if (data.humanPreds.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_human_preds') ?? '[]')
        const merged = [...existing]
        for (const p of data.humanPreds) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === p.fixture_id)
          const full = { id: `human-${p.fixture_id}`, ...p }
          if (idx >= 0) merged[idx] = full
          else merged.push(full)
        }
        localStorage.setItem('wc26_human_preds', JSON.stringify(merged))
      }

      window.dispatchEvent(new Event('supabase-sync-complete'))
    })
  }, [])

  return <>{children}</>
}
