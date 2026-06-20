'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchAllFromCloud } from '@/lib/sync'

interface SyncState {
  status: 'idle' | 'syncing' | 'ok' | 'error'
  error: string | null
  retry: () => void
}

const SyncContext = createContext<SyncState>({ status: 'idle', error: null, retry: () => {} })
export function useSyncState() { return useContext(SyncContext) }

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncState['status']>('idle')
  const [error, setError] = useState<string | null>(null)

  const sync = useCallback(() => {
    setStatus('syncing')
    setError(null)
    fetchAllFromCloud().then(result => {
      if (!result.ok) {
        console.error('[SyncProvider] Cloud fetch failed:', result.error)
        setError(result.error)
        setStatus('error')
        return
      }

      if (result.results.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_results') ?? '[]')
        const merged = [...existing]
        for (const r of result.results) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === r.fixture_id)
          const full = { id: `res-${r.fixture_id}`, fixture_id: r.fixture_id, home_goals: r.home_goals, away_goals: r.away_goals, entered_at: r.entered_at }
          if (idx >= 0) merged[idx] = full
          else merged.push(full)
        }
        localStorage.setItem('wc26_results', JSON.stringify(merged))
      }

      if (result.lockedPreds.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_locked_preds') ?? '[]')
        const merged = [...existing]
        for (const p of result.lockedPreds) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === p.fixture_id)
          if (idx >= 0) merged[idx] = p
          else merged.push(p)
        }
        localStorage.setItem('wc26_locked_preds', JSON.stringify(merged))
      }

      if (result.humanPreds.length > 0) {
        const existing = JSON.parse(localStorage.getItem('wc26_human_preds') ?? '[]')
        const merged = [...existing]
        for (const p of result.humanPreds) {
          const idx = merged.findIndex((e: { fixture_id: string }) => e.fixture_id === p.fixture_id)
          const full = { id: `human-${p.fixture_id}`, ...p }
          if (idx >= 0) merged[idx] = full
          else merged.push(full)
        }
        localStorage.setItem('wc26_human_preds', JSON.stringify(merged))
      }

      setStatus('ok')
      window.dispatchEvent(new Event('supabase-sync-complete'))
    })
  }, [])

  useEffect(() => { sync() }, [sync])

  return (
    <SyncContext.Provider value={{ status, error, retry: sync }}>
      {children}
    </SyncContext.Provider>
  )
}
