'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFixture, getTeam, getPredictions, getResult, getOverride, saveOverride, deleteOverride, getConfig } from '@/lib/store'
import { computeHybrid } from '@/lib/models'
import { formatDate, formatTime, pct, goals, MODEL_LABELS, MODEL_TEXT_COLORS, STAGE_LABELS } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Edit2, X, Check } from 'lucide-react'
import Link from 'next/link'

function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-16 text-right font-medium text-blue-600">{pct(home)}</span>
        <div className="h-2 flex-1 flex rounded-full overflow-hidden bg-zinc-100">
          <div className="h-full bg-blue-500" style={{ width: `${home * 100}%` }} />
          <div className="h-full bg-zinc-300" style={{ width: `${draw * 100}%` }} />
          <div className="h-full bg-red-400" style={{ width: `${away * 100}%` }} />
        </div>
        <span className="w-16 font-medium text-red-500">{pct(away)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="w-16 text-right">Home win</span>
        <div className="flex-1 text-center">{pct(draw)} Draw</div>
        <span className="w-16">Away win</span>
      </div>
    </div>
  )
}

function ModelPredRow({ model, fixtureId }: { model: 'A' | 'B' | 'C' | 'hybrid'; fixtureId: string }) {
  const predictions = getPredictions()
  const config = getConfig()
  const pred = model === 'hybrid'
    ? computeHybrid(predictions as any, fixtureId, { a: config.weight_a, b: config.weight_b, c: config.weight_c })
    : predictions.find(p => p.fixture_id === fixtureId && p.model === model)

  if (!pred) return null

  return (
    <div className="space-y-2 rounded-lg border border-zinc-100 p-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${MODEL_TEXT_COLORS[model]}`}>{MODEL_LABELS[model]}</span>
        <span className="text-sm font-bold text-zinc-900">
          {goals(pred.home_goals)} – {goals(pred.away_goals)}
        </span>
      </div>
      <ProbBar home={pred.home_win_prob} draw={pred.draw_prob} away={pred.away_win_prob} />
    </div>
  )
}

function OverridePanel({ fixtureId }: { fixtureId: string }) {
  const existing = getOverride(fixtureId)
  const [editing, setEditing] = useState(!existing)
  const [home, setHome] = useState(String(existing?.home_goals ?? ''))
  const [away, setAway] = useState(String(existing?.away_goals ?? ''))

  const handleSave = () => {
    const h = parseFloat(home)
    const a = parseFloat(away)
    if (isNaN(h) || isNaN(a)) return
    saveOverride({ fixture_id: fixtureId, home_goals: h, away_goals: a })
    setEditing(false)
    window.location.reload()
  }

  const handleDelete = () => {
    deleteOverride(fixtureId)
    setHome(''); setAway(''); setEditing(true)
    window.location.reload()
  }

  if (!editing && existing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-orange-600">{existing.home_goals} – {existing.away_goals}</span>
        <Badge variant="warning">Override</Badge>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={handleDelete}><X className="h-3.5 w-3.5 text-red-400" /></Button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2">
      <Input label="Home goals" type="number" min="0" max="20" step="1" value={home} onChange={e => setHome(e.target.value)} className="w-20" />
      <span className="pb-1.5 text-zinc-400">–</span>
      <Input label="Away goals" type="number" min="0" max="20" step="1" value={away} onChange={e => setAway(e.target.value)} className="w-20" />
      <Button size="sm" variant="primary" onClick={handleSave} className="mb-0.5">
        <Check className="h-3.5 w-3.5" />
      </Button>
      {existing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="mb-0.5">Cancel</Button>}
    </div>
  )
}

export function MatchDetail({ fixtureId }: { fixtureId: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixture = getFixture(fixtureId)
  if (!fixture) return <div className="p-4 text-sm text-zinc-400">Match not found</div>

  const home = getTeam(fixture.home_team_id)
  const away = getTeam(fixture.away_team_id)
  const result = getResult(fixtureId)

  return (
    <div className="space-y-4">
      <Link href="/matches" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to matches
      </Link>

      {/* Match header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-3xl">{home?.flag_url}</span>
              <span className="text-sm font-bold text-zinc-900">{home?.name}</span>
              <span className="text-xs text-zinc-400">{home?.code}</span>
            </div>
            <div className="text-center">
              {result ? (
                <div>
                  <div className="text-2xl font-black text-zinc-900">{result.home_goals} – {result.away_goals}</div>
                  <Badge variant="success" className="mt-1">Final</Badge>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold text-zinc-400">VS</div>
                  <div className="text-xs text-zinc-400 mt-1">{formatDate(fixture.kickoff_utc)} {formatTime(fixture.kickoff_utc)}</div>
                  {fixture.group && <Badge variant="outline" className="mt-1">Group {fixture.group} · MD{fixture.matchday}</Badge>}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-3xl">{away?.flag_url}</span>
              <span className="text-sm font-bold text-zinc-900">{away?.name}</span>
              <span className="text-xs text-zinc-400">{away?.code}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model predictions */}
      <Card>
        <CardHeader><CardTitle>Model Predictions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ModelPredRow model="A" fixtureId={fixtureId} />
          <ModelPredRow model="B" fixtureId={fixtureId} />
          <ModelPredRow model="C" fixtureId={fixtureId} />
          <ModelPredRow model="hybrid" fixtureId={fixtureId} />
        </CardContent>
      </Card>

      {/* Override */}
      <Card>
        <CardHeader><CardTitle>Score Override</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400 mb-3">Override the predicted score for this match. Used in group standings if set.</p>
          <OverridePanel fixtureId={fixtureId} />
        </CardContent>
      </Card>
    </div>
  )
}
