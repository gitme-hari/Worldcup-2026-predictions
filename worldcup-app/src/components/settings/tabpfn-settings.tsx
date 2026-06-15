'use client'
import { useState, useEffect } from 'react'
import { getTabPFNPredictions, saveTabPFNPredictions } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function TabPFNSettings() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [lastFetch, setLastFetch] = useState<string | null>(null)
  const [predCount, setPredCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    const preds = getTabPFNPredictions()
    if (preds.length > 0) {
      setLastFetch(preds[0].fetched_at)
      setPredCount(preds.length)
    }
  }, [])

  if (!mounted) return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />

  const handleFetch = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/tabpfn', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? `HTTP ${res.status}` })
        return
      }
      const predictions = data.predictions as Record<string, { home_win_prob: number; draw_prob: number; away_win_prob: number }>
      const toSave = Object.entries(predictions).map(([fixture_id, p]) => ({
        fixture_id,
        home_win_prob: p.home_win_prob,
        draw_prob: p.draw_prob,
        away_win_prob: p.away_win_prob,
      }))
      saveTabPFNPredictions(toSave)
      const count = toSave.length
      setPredCount(count)
      setLastFetch(new Date().toISOString())
      setStatus({ type: 'success', message: `Updated ${count} predictions` })
      window.dispatchEvent(new Event('storage'))
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TabPFN Predictions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-500">
          Fetch win/draw/loss probabilities from TabPFN (PriorLabs) for all 72 group-stage fixtures.
          Results are applied to Model C predictions and stored locally.
          Requires <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">TABPFN_API_KEY</code> to be set on the server.
        </p>

        {lastFetch && (
          <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Last fetched: {new Date(lastFetch).toLocaleString()} &mdash; {predCount} fixtures cached
          </div>
        )}

        {status && (
          <div className={`rounded-md px-3 py-2 text-xs font-medium ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {status.type === 'success' ? '✓ ' : '✗ '}{status.message}
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Fetching…' : 'Fetch TabPFN Predictions'}
        </Button>
      </CardContent>
    </Card>
  )
}
