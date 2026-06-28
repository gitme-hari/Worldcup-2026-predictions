'use client'
import { getFixtures, getTeams, getResults, getLockedPredictions, getPoolRecommendations } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

function poolScore(predH: number, predA: number, actH: number, actA: number): number {
  if (predH === actH && predA === actA) return 4
  const predGD = predH - predA
  const actGD  = actH  - actA
  const predW  = predGD > 0 ? 'H' : predGD < 0 ? 'A' : 'D'
  const actW   = actGD  > 0 ? 'H' : actGD  < 0 ? 'A' : 'D'
  if (predW === actW && predGD === actGD) return 2
  if (predW === actW) return 1
  return 0
}

function pts(n: number) {
  return n === 1 ? '1 pt' : `${n} pts`
}

const DELTA_STYLE: Record<string, string> = {
  pos: 'text-green-600 font-semibold',
  neg: 'text-red-500 font-semibold',
  zero: 'text-zinc-400',
}

export function OverrideROI() {
  const fixtures    = getFixtures()
  const teams       = getTeams()
  const results     = getResults()
  const lockedPreds = getLockedPredictions()
  const poolRecs    = getPoolRecommendations()
  const teamMap     = Object.fromEntries(teams.map(t => [t.id, t]))
  const resultMap   = Object.fromEntries(results.map(r => [r.fixture_id, r]))

  type Row = {
    fixtureId: string
    homeCode: string
    awayCode: string
    recHome: number
    recAway: number
    lockedHome: number
    lockedAway: number
    actualHome: number
    actualAway: number
    recPts: number
    myPts: number
    delta: number
    source: string
  }

  const rows: Row[] = []

  for (const rec of poolRecs) {
    const result = resultMap[rec.fixture_id]
    if (!result) continue  // pending — skip

    const locked = lockedPreds.find(p => p.fixture_id === rec.fixture_id)
    if (!locked) continue  // no locked pick — skip

    const fixture = fixtures.find(f => f.id === rec.fixture_id)
    if (!fixture) continue

    const home = teamMap[fixture.home_team_id]
    const away = teamMap[fixture.away_team_id]

    const recPts = poolScore(rec.recommended_home, rec.recommended_away, result.home_goals, result.away_goals)
    const myPts  = poolScore(locked.home_goals, locked.away_goals, result.home_goals, result.away_goals)

    rows.push({
      fixtureId: rec.fixture_id,
      homeCode: home?.code ?? fixture.home_team_id,
      awayCode: away?.code ?? fixture.away_team_id,
      recHome: rec.recommended_home,
      recAway: rec.recommended_away,
      lockedHome: locked.home_goals,
      lockedAway: locked.away_goals,
      actualHome: result.home_goals,
      actualAway: result.away_goals,
      recPts,
      myPts,
      delta: myPts - recPts,
      source: locked.pick_source ?? 'unknown',
    })
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Override ROI
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">Pool recommendation vs your locked pick, scored by pool rules.</p>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400 py-2">
            No completed matches with both a pool recommendation and a locked pick yet.
            Lock picks via the Dashboard and enter results to see ROI.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalRecPts = rows.reduce((s, r) => s + r.recPts, 0)
  const totalMyPts  = rows.reduce((s, r) => s + r.myPts,  0)
  const netGain     = totalMyPts - totalRecPts
  const overrides   = rows.filter(r => r.source === 'custom').length
  const accepted    = rows.filter(r => r.source === 'pool_recommendation').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Override ROI
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">Pool recommendation vs your locked pick — {rows.length} completed match{rows.length !== 1 ? 'es' : ''}</p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-zinc-50 px-2 py-2.5">
            <p className="text-xs text-zinc-400">Rec total</p>
            <p className="text-lg font-bold text-zinc-700">{totalRecPts}</p>
            <p className="text-xs text-zinc-400">pts</p>
          </div>
          <div className="rounded-lg bg-blue-50 px-2 py-2.5">
            <p className="text-xs text-blue-500">My total</p>
            <p className="text-lg font-bold text-blue-700">{totalMyPts}</p>
            <p className="text-xs text-blue-400">pts</p>
          </div>
          <div className={`rounded-lg px-2 py-2.5 ${netGain > 0 ? 'bg-green-50' : netGain < 0 ? 'bg-red-50' : 'bg-zinc-50'}`}>
            <p className={`text-xs ${netGain > 0 ? 'text-green-600' : netGain < 0 ? 'text-red-500' : 'text-zinc-400'}`}>Net gain</p>
            <p className={`text-lg font-bold ${netGain > 0 ? 'text-green-700' : netGain < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
              {netGain > 0 ? '+' : ''}{netGain}
            </p>
            <p className={`text-xs ${netGain > 0 ? 'text-green-500' : netGain < 0 ? 'text-red-400' : 'text-zinc-400'}`}>pts</p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-2 py-2.5">
            <p className="text-xs text-zinc-400">Overrides</p>
            <p className="text-lg font-bold text-zinc-700">{overrides}</p>
            <p className="text-xs text-zinc-400">of {rows.length}</p>
          </div>
        </div>

        {(accepted > 0 || overrides > 0) && (
          <p className="text-xs text-zinc-400">
            {accepted} accepted pool pick{accepted !== 1 ? 's' : ''} · {overrides} custom override{overrides !== 1 ? 's' : ''}
            {netGain > 0
              ? ` — overrides gained +${netGain} pts vs following recommendations`
              : netGain < 0
              ? ` — overrides cost ${Math.abs(netGain)} pts vs following recommendations`
              : ' — overrides broke even vs recommendations'}
          </p>
        )}

        {/* Per-match table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-3 py-2 text-left font-medium text-zinc-500">Match</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">Rec</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">My Pick</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">Actual</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">Rec pts</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">My pts</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-500">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const deltaStyle = row.delta > 0 ? DELTA_STYLE.pos : row.delta < 0 ? DELTA_STYLE.neg : DELTA_STYLE.zero
                const isOverride = row.source === 'custom'
                return (
                  <tr key={row.fixtureId} className={`border-b border-zinc-50 ${isOverride ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-medium text-zinc-900">{row.homeCode}</span>
                      <span className="text-zinc-300 mx-1">v</span>
                      <span className="font-medium text-zinc-900">{row.awayCode}</span>
                      {isOverride && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700 font-medium">override</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-zinc-500">
                      {row.recHome}–{row.recAway}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-700">
                      {row.lockedHome}–{row.lockedAway}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-zinc-900">
                      {row.actualHome}–{row.actualAway}
                    </td>
                    <td className="px-3 py-2.5 text-center text-zinc-500">{pts(row.recPts)}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{pts(row.myPts)}</td>
                    <td className={`px-3 py-2.5 text-center ${deltaStyle}`}>
                      {row.delta > 0 ? `+${row.delta}` : row.delta < 0 ? `${row.delta}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </CardContent>
    </Card>
  )
}
