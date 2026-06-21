'use client'
import { useSyncState } from '@/components/sync-provider'

export function SyncStatusBadge() {
  const { status } = useSyncState()

  const label =
    status === 'syncing' ? 'Syncing…' :
    status === 'error'   ? 'Offline'  :
    'Synced ✓'

  const cls =
    status === 'syncing' ? 'bg-amber-100 text-amber-700' :
    status === 'error'   ? 'bg-zinc-100 text-zinc-500'   :
    'bg-emerald-100 text-emerald-700'

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
