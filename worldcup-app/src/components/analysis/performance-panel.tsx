'use client'
import { useState, useEffect } from 'react'
import { SyncErrorBanner } from '@/components/ui/sync-error-banner'
import { TabDecisionReview } from './tabs/tab-decision-review'
import { TabOverrideIntelligence } from './tabs/tab-override-intelligence'
import { TabEngineLearning } from './tabs/tab-engine-learning'
import { TabBlindSpots } from './tabs/tab-blind-spots'
import { TabExactScore } from './tabs/tab-exact-score'
import { TabDiagnostics } from './tabs/tab-diagnostics'
import { UpcomingAssistant } from './upcoming-assistant'

const TABS = [
  { id: 'review',     label: 'Decision Review' },
  { id: 'overrides',  label: 'Override Intelligence' },
  { id: 'learning',   label: 'Engine Learning' },
  { id: 'blindspots', label: 'Blind Spots' },
  { id: 'exactscore', label: 'Exact Score' },
  { id: 'diagnostics',label: 'Diagnostics' },
] as const

type TabId = typeof TABS[number]['id']

export function PerformancePanel() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<TabId>('review')

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  return (
    <div className="space-y-4">
      <SyncErrorBanner />

      {/* Upcoming risk review always visible at top */}
      <UpcomingAssistant />

      {/* Tab bar */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
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
        {tab === 'review'      && <TabDecisionReview />}
        {tab === 'overrides'   && <TabOverrideIntelligence />}
        {tab === 'learning'    && <TabEngineLearning />}
        {tab === 'blindspots'  && <TabBlindSpots />}
        {tab === 'exactscore'  && <TabExactScore />}
        {tab === 'diagnostics' && <TabDiagnostics />}
      </div>
    </div>
  )
}
