'use client'
import { useState, useEffect } from 'react'
import { getTeams, getBonusPredictions, saveBonusPrediction, getFixtures, getPredictions, getConfig, getOverride } from '@/lib/store'
import { computeGroupStandings, getEffectivePrediction } from '@/lib/models'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Edit2 } from 'lucide-react'
import type { SeedTeam } from '@/lib/seed-data'

const BONUS_QUESTIONS = [
  { key: 'champion', label: '🏆 World Champion' },
  { key: 'sf1', label: 'Semi-Finalist 1' },
  { key: 'sf2', label: 'Semi-Finalist 2' },
  { key: 'sf3', label: 'Semi-Finalist 3' },
  { key: 'sf4', label: 'Semi-Finalist 4' },
  { key: 'top_scorer_team', label: '⚽ Top Scorer Team' },
  ...('ABCDEFGHIJKL'.split('').map(g => ({ key: `winner_group_${g}`, label: `Group ${g} Winner` }))),
]

function TeamPicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (teamId: string) => void
}) {
  const teams = getTeams()
  return (
    <Modal open={open} onClose={onClose} title="Select team">
      <div className="max-h-80 overflow-y-auto space-y-1">
        <button
          onClick={() => { onSelect(''); onClose() }}
          className="w-full rounded px-3 py-2 text-sm text-left text-zinc-400 hover:bg-zinc-100"
        >
          — Clear selection
        </button>
        {'ABCDEFGHIJKL'.split('').map(g => {
          const groupTeams = teams.filter(t => t.group === g)
          return (
            <div key={g}>
              <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase">Group {g}</div>
              {groupTeams.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t.id); onClose() }}
                  className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm text-left hover:bg-zinc-100"
                >
                  <span className="text-lg">{t.flag_url}</span>
                  <span className="font-medium text-zinc-900">{t.name}</span>
                  <span className="ml-auto text-xs text-zinc-400">{t.code}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export function BonusPredictionsPanel() {
  const [mounted, setMounted] = useState(false)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [bonus, setBonus] = useState<Array<{ key: string; team_id: string | null }>>([])
  const [teams, setTeams] = useState<SeedTeam[]>([])
  const [autoFilled, setAutoFilled] = useState(false)

  useEffect(() => {
    setMounted(true)
    setBonus(getBonusPredictions())
    setTeams(getTeams())
  }, [])

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const getTeamId = (key: string) => bonus.find(b => b.key === key)?.team_id ?? null

  const handleAutoFill = () => {
    const fixtures = getFixtures()
    const predictions = getPredictions()
    const config = getConfig()

    const getScore = (fid: string) => {
      const ovr = getOverride(fid)
      if (ovr) return { home: ovr.home_goals, away: ovr.away_goals }
      const pred = getEffectivePrediction(predictions as any, fid, config.active_model, {
        a: config.weight_a, b: config.weight_b, c: config.weight_c
      })
      if (!pred) return null
      return { home: Math.round(pred.home_goals), away: Math.round(pred.away_goals) }
    }

    const standings = computeGroupStandings(fixtures as any, teams, getScore)

    'ABCDEFGHIJKL'.split('').forEach(g => {
      const winner = standings[g]?.[0]?.team
      if (winner) saveBonusPrediction(`winner_group_${g}`, winner.id)
    })

    // Pick champion as team with highest Elo among predicted group winners
    const winners = 'ABCDEFGHIJKL'.split('').map(g => standings[g]?.[0]?.team).filter(Boolean)
    winners.sort((a, b) => (b?.elo_rating ?? 0) - (a?.elo_rating ?? 0))
    if (winners[0]) saveBonusPrediction('champion', winners[0].id)
    if (winners[1]) saveBonusPrediction('sf1', winners[1].id)
    if (winners[2]) saveBonusPrediction('sf2', winners[2].id)
    if (winners[3]) saveBonusPrediction('sf3', winners[3].id)
    if (winners[4]) saveBonusPrediction('sf4', winners[4].id)

    setBonus(getBonusPredictions())
    setAutoFilled(true)
    setTimeout(() => setAutoFilled(false), 2000)
  }

  const handleSelect = (teamId: string) => {
    if (!pickerFor) return
    saveBonusPrediction(pickerFor, teamId || null)
    setBonus(getBonusPredictions())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleAutoFill}>
          {autoFilled ? '✓ Auto-filled' : 'Auto-fill from Model'}
        </Button>
        <span className="text-xs text-zinc-400">Fills predictions based on the current active model's group standings.</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {BONUS_QUESTIONS.map(q => {
          const teamId = getTeamId(q.key)
          const team = teamId ? teamMap[teamId] : null
          return (
            <button key={q.key} onClick={() => setPickerFor(q.key)} className="block w-full text-left">
          <Card className="hover:border-zinc-300 cursor-pointer">
              <CardContent className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-xs font-medium text-zinc-700">{q.label}</div>
                  {team ? (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span>{team.flag_url}</span>
                      <span className="text-sm font-semibold text-zinc-900">{team.name}</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-zinc-300 italic">Not set</div>
                  )}
                </div>
                <Edit2 className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
              </CardContent>
            </Card>
          </button>
          )
        })}
      </div>

      <TeamPicker
        open={!!pickerFor}
        onClose={() => setPickerFor(null)}
        onSelect={handleSelect}
      />
    </div>
  )
}
