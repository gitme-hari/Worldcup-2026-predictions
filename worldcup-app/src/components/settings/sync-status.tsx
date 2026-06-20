'use client'
import { useState } from 'react'
import { fetchAllFromCloud } from '@/lib/sync'
import { Card } from '@/components/ui/card'

export function SyncStatus() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [counts, setCounts] = useState<{ results: number; lockedPreds: number; humanPreds: number } | null>(null)

  async function handleCheck() {
    setStatus('loading')
    const data = await fetchAllFromCloud()
    if (!data.ok) {
      setStatus('error')
      return
    }
    setCounts({ results: data.results.length, lockedPreds: data.lockedPreds.length, humanPreds: data.humanPreds.length })
    setStatus('ok')
  }

  return (
    <Card>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Cloud Sync (Supabase)</p>
            <p className="text-xs text-zinc-500 mt-0.5">Data syncs automatically across devices on page load.</p>
          </div>
          <button
            onClick={handleCheck}
            disabled={status === 'loading'}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {status === 'loading' ? 'Checking…' : 'Check connection'}
          </button>
        </div>

        {status === 'ok' && counts && (
          <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-800 space-y-0.5">
            <p className="font-semibold">Connected</p>
            <p>Results in cloud: {counts.results}</p>
            <p>Locked predictions: {counts.lockedPreds}</p>
            <p>Human predictions: {counts.humanPreds}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-800">
            <p className="font-semibold">Connection failed</p>
            <p>Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
