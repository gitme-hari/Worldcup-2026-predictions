'use client'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useSyncState } from '@/components/sync-provider'

export function SyncErrorBanner() {
  const { status, error, retry } = useSyncState()
  if (status !== 'error') return null
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="flex-1 text-amber-800">
        Cloud sync failed — showing local data.{error ? ` (${error})` : ''}
      </span>
      <button
        onClick={retry}
        className="flex items-center gap-1.5 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  )
}
