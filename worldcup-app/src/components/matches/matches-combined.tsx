'use client'
import { useState, useEffect } from 'react'
import { ResultsEntry } from '@/components/results/results-entry'
import { BonusPredictionsPanel } from '@/components/bonus/bonus-predictions'

export function MatchesCombined() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-zinc-100" />)}
    </div>
  )
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left: matches + results */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Matches & Results</h2>
        <ResultsEntry />
      </div>
      {/* Right: bonus predictions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Bonus Predictions</h2>
        <BonusPredictionsPanel />
      </div>
    </div>
  )
}
