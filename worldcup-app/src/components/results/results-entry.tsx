'use client'
import { useState, useEffect } from 'react'
import { getFixtures, getTeams, getResult, saveResult, deleteResult } from '@/lib/store'
import { formatDate, formatTime } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Check, X, Trash2 } from 'lucide-react'
import type { SeedFixture } from '@/lib/seed-data'

function ResultRow({ fixture, homeTeam, awayTeam }: {
  fixture: SeedFixture
  homeTeam: { name: string; code: string; flag_url: string } | undefined
  awayTeam: { name: string; code: string; flag_url: string } | undefined
}) {
  const existing = getResult(fixture.id)
  const [editing, setEditing] = useState(false)
  const [home, setHome] = useState(String(existing?.home_goals ?? ''))
  const [away, setAway] = useState(String(existing?.away_goals ?? ''))
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const h = parseInt(home, 10)
    const a = parseInt(away, 10)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    saveResult({ fixture_id: fixture.id, home_goals: h, away_goals: a })
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = () => {
    deleteResult(fixture.id)
    setHome(''); setAway('')
    setEditing(true)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-50 px-4 py-2.5 last:border-0">
      {/* Match info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-zinc-400 shrink-0">{formatDate(fixture.kickoff_utc)}</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span>{homeTeam?.flag_url}</span>
          <span className="text-xs font-medium text-zinc-900 hidden sm:block truncate">{homeTeam?.name}</span>
          <span className="text-xs font-medium text-zinc-900 sm:hidden">{homeTeam?.code}</span>
          <span className="text-xs text-zinc-400">vs</span>
          <span>{awayTeam?.flag_url}</span>
          <span className="text-xs font-medium text-zinc-900 hidden sm:block truncate">{awayTeam?.name}</span>
          <span className="text-xs font-medium text-zinc-900 sm:hidden">{awayTeam?.code}</span>
        </div>
        {fixture.group && <Badge variant="outline" className="shrink-0">Grp {fixture.group}</Badge>}
      </div>

      {/* Result input/display */}
      <div className="flex items-center gap-2 shrink-0">
        {existing && !editing ? (
          <>
            <span className="text-sm font-bold text-zinc-900">{existing.home_goals} – {existing.away_goals}</span>
            <Badge variant="success">Saved</Badge>
            <Button size="sm" variant="ghost" onClick={() => { setHome(String(existing.home_goals)); setAway(String(existing.away_goals)); setEditing(true) }}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
          </>
        ) : (
          <>
            <input
              type="number"
              min="0"
              max="20"
              value={home}
              onChange={e => setHome(e.target.value)}
              placeholder="0"
              className="w-12 rounded border border-zinc-300 px-2 py-1 text-center text-sm font-bold focus:border-blue-500 focus:outline-none"
            />
            <span className="text-zinc-400">–</span>
            <input
              type="number"
              min="0"
              max="20"
              value={away}
              onChange={e => setAway(e.target.value)}
              placeholder="0"
              className="w-12 rounded border border-zinc-300 px-2 py-1 text-center text-sm font-bold focus:border-blue-500 focus:outline-none"
            />
            <Button size="sm" variant="primary" onClick={handleSave}>
              {saved ? <Check className="h-3.5 w-3.5" /> : 'Save'}
            </Button>
            {existing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </>
        )}
      </div>
    </div>
  )
}

export function ResultsEntry() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'entered'>('pending')
  const [groupFilter, setGroupFilter] = useState('All')
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const fixtures = getFixtures()
  const teams = getTeams()
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  let filtered = fixtures.filter(f => f.stage === 'group')
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())

  if (groupFilter !== 'All') filtered = filtered.filter(f => f.group === groupFilter)
  if (filter === 'pending') filtered = filtered.filter(f => !getResult(f.id))
  if (filter === 'entered') filtered = filtered.filter(f => !!getResult(f.id))

  const allResults = fixtures.filter(f => getResult(f.id)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded border border-zinc-200 p-0.5">
          {(['all', 'pending', 'entered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Select
          options={['All', ...'ABCDEFGHIJKL'.split('')].map(g => ({ value: g, label: g === 'All' ? 'All Groups' : `Group ${g}` }))}
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
        />
        <span className="text-xs text-zinc-400">{allResults} results entered</span>
      </div>

      <Card>
        <div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-400">No matches match filter</p>
          ) : filtered.map(f => (
            <ResultRow
              key={f.id}
              fixture={f}
              homeTeam={teamMap[f.home_team_id]}
              awayTeam={teamMap[f.away_team_id]}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
