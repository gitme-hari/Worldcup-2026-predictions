import { ResultsEntry } from '@/components/results/results-entry'

export default function ResultsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Enter Results</h1>
      <p className="text-xs text-zinc-500">Enter actual match scores as the tournament progresses. Results update model performance metrics automatically.</p>
      <ResultsEntry />
    </div>
  )
}
