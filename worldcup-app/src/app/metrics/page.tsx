import { MetricsPanel } from '@/components/metrics/metrics-panel'

export default function MetricsPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Model Metrics</h1>
      <MetricsPanel />
    </div>
  )
}
