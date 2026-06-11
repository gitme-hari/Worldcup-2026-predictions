'use client'
import { useState, useEffect } from 'react'
import { getConfig, saveConfig } from '@/lib/store'
import type { ModelConfig, ModelKey } from '@/lib/types'
import { MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

const MODELS: { key: ModelKey; label: string; description: string }[] = [
  {
    key: 'A',
    label: 'Model A — Poisson',
    description: 'Uses team Elo/SPI-style ratings with a bivariate Poisson scoring model. Outputs expected goals, most likely scores, and win/draw/loss probabilities. Strong baseline, transparent assumptions.',
  },
  {
    key: 'B',
    label: 'Model B — Machine Learning',
    description: 'Gradient boosting / random forest ensemble trained on historical match features including team ratings, form, and head-to-head. Captures non-linear patterns that Poisson misses.',
  },
  {
    key: 'C',
    label: 'Model C — Live Intelligence',
    description: 'Market-calibrated base predictions dynamically adjusted with live ESPN data: match results, injury news, and player availability. Refresh on the dashboard to pull the latest intelligence before each matchday.',
  },
  {
    key: 'hybrid',
    label: 'Hybrid — Weighted Blend',
    description: 'Weighted average of Models A, B, and C. Adjust weights below. Useful for blending model strengths throughout the tournament.',
  },
]

export function ModelSettings() {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ModelConfig | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
    setConfig(getConfig())
  }, [])

  if (!mounted || !config) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const handleSelectModel = (model: ModelKey) => {
    setConfig(prev => prev ? { ...prev, active_model: model } : prev)
  }

  const handleWeight = (key: 'weight_a' | 'weight_b' | 'weight_c', val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return
    setConfig(prev => prev ? { ...prev, [key]: n } : prev)
  }

  const handleSave = () => {
    if (!config) return
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'))
  }

  const totalWeight = config.weight_a + config.weight_b + config.weight_c

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Active Model</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {MODELS.map(m => (
            <button
              key={m.key}
              onClick={() => handleSelectModel(m.key)}
              className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                config.active_model === m.key
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${config.active_model === m.key ? 'text-white' : 'text-zinc-900'}`}>
                  {m.label}
                </span>
                {config.active_model === m.key && <Check className="h-4 w-4 text-white" />}
              </div>
              <p className={`mt-1 text-xs leading-relaxed ${config.active_model === m.key ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {m.description}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Hybrid weights */}
      <Card className={config.active_model !== 'hybrid' ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle>Hybrid Weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-zinc-500">Set the relative weight for each model. They will be normalized automatically.</p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Model A weight"
              type="number"
              min="0"
              max="100"
              value={config.weight_a}
              onChange={e => handleWeight('weight_a', e.target.value)}
            />
            <Input
              label="Model B weight"
              type="number"
              min="0"
              max="100"
              value={config.weight_b}
              onChange={e => handleWeight('weight_b', e.target.value)}
            />
            <Input
              label="Model C weight"
              type="number"
              min="0"
              max="100"
              value={config.weight_c}
              onChange={e => handleWeight('weight_c', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full overflow-hidden bg-zinc-100 flex">
              <div className="h-full bg-blue-500" style={{ width: `${(config.weight_a / totalWeight) * 100}%` }} />
              <div className="h-full bg-purple-500" style={{ width: `${(config.weight_b / totalWeight) * 100}%` }} />
              <div className="h-full bg-green-500" style={{ width: `${(config.weight_c / totalWeight) * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />A: {totalWeight > 0 ? ((config.weight_a / totalWeight) * 100).toFixed(0) : 0}%</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" />B: {totalWeight > 0 ? ((config.weight_b / totalWeight) * 100).toFixed(0) : 0}%</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />C: {totalWeight > 0 ? ((config.weight_c / totalWeight) * 100).toFixed(0) : 0}%</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="primary" size="lg" onClick={handleSave} className="w-full">
        {saved ? '✓ Saved' : 'Save Settings'}
      </Button>
    </div>
  )
}
