import { ModelSettings } from '@/components/settings/model-settings'
import { TabPFNSettings } from '@/components/settings/tabpfn-settings'
import { SyncStatus } from '@/components/settings/sync-status'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Model Settings</h1>
      <ModelSettings />
      <TabPFNSettings />
      <h2 className="text-base font-semibold text-zinc-900 pt-2">Sync</h2>
      <SyncStatus />
    </div>
  )
}
