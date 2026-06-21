'use client'
import { useState } from 'react'
import { ModelSettings } from '@/components/settings/model-settings'
import { SyncStatus } from '@/components/settings/sync-status'
import { BackfillTool } from '@/components/settings/backfill-tool'
import { SyncAudit } from '@/components/settings/sync-audit'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">App Settings</h1>

      <h2 className="text-base font-semibold text-zinc-900">Sync</h2>
      <SyncStatus />
      <SyncAudit />

      <h2 className="text-base font-semibold text-zinc-900 pt-2">Recovery</h2>
      <BackfillTool />

      {/* Advanced Engine Settings — collapsed by default */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-700">Advanced Engine Settings</p>
            <p className="text-xs text-zinc-400 mt-0.5">Internal model selection and hybrid weights. Not needed for normal use.</p>
          </div>
          {showAdvanced
            ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
        </button>
        {showAdvanced && (
          <div className="border-t border-zinc-100 p-4">
            <ModelSettings />
          </div>
        )}
      </div>
    </div>
  )
}
