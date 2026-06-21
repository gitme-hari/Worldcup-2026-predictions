import { AnalysisPanel } from '@/components/analysis/analysis-panel'

export default function AnalysisPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-900">Performance</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Track your picks against actual results and review engine diagnostics.
        </p>
      </div>
      <AnalysisPanel />
    </div>
  )
}
