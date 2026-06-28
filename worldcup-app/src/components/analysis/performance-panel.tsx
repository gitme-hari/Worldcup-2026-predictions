'use client'
import { useState, useEffect, useMemo } from 'react'
import { SyncErrorBanner } from '@/components/ui/sync-error-banner'
import { KeyInsightsCard } from './key-insights-card'
import { TabReview } from './tabs/tab-review'
import { TabLearning } from './tabs/tab-learning'
import { TabDiagnostics } from './tabs/tab-diagnostics'
import { computePerformanceData } from './performance-data'

const TABS = [
  { id: 'review',      label: 'Review' },
  { id: 'learning',    label: 'Learning' },
  { id: 'diagnostics', label: 'Diagnostics' },
] as const

type TabId = typeof TABS[number]['id']

export function PerformancePanel() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<TabId>('review')

  useEffect(() => setMounted(true), [])

  const data = useMemo(() => {
    if (!mounted) return null
    return computePerformanceData()
  }, [mounted])

  if (!mounted || !data) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  return (
    <div className="space-y-4">
      <SyncErrorBanner />

      {/* Always-visible insights card */}
      <KeyInsightsCard data={data} />

      {/* Tab bar */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {tab === 'review'      && <TabReview data={data} />}
        {tab === 'learning'    && <TabLearning data={data} />}
        {tab === 'diagnostics' && <TabDiagnostics data={data} />}
      </div>
    </div>
  )
}
