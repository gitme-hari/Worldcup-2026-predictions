import { ModelSettings } from '@/components/settings/model-settings'
import { TabPFNSettings } from '@/components/settings/tabpfn-settings'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Model Settings</h1>
      <ModelSettings />
      <TabPFNSettings />
    </div>
  )
}
