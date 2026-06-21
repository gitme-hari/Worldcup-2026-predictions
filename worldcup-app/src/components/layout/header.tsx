'use client'
import { Nav } from './nav'
import { SyncStatusBadge } from '@/components/dashboard/sync-status-badge'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3">
        <div className="flex h-12 items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-bold text-zinc-900">WC26</span>
            <span className="hidden text-xs text-zinc-400 sm:block">Predictions</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Nav />
          </div>
          <SyncStatusBadge />
        </div>
      </div>
    </header>
  )
}
