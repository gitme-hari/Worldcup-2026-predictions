'use client'
import { useState, useEffect } from 'react'
import { getTeams, getFixtures, getResult } from '@/lib/store'
import type { SeedFixture, SeedTeam } from '@/lib/seed-data'

// Layout constants
const H   = 640   // column height px
const CW  = 116   // match-column width px
const NW  = 28    // connector SVG width px
const CEN = 148   // center (Final) column width px
const LINE = '#d4d4d8'

// Center-Y of item i among n items distributed via justify-around in height H
function cy(n: number, i: number) { return H * (2 * i + 1) / (2 * n) }

// ── Team slot ────────────────────────────────────────────────────────────────

function TeamSlot({ team, isWinner, score }: { team: SeedTeam | null; isWinner: boolean; score?: number }) {
  const bg = isWinner ? 'border-emerald-300 bg-emerald-50' : !team ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'
  return (
    <div className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] leading-none ${bg}`}>
      {team ? (
        <>
          <span>{team.flag_url}</span>
          <span className={`font-medium ${isWinner ? 'text-emerald-700' : 'text-zinc-900'}`}>{team.code}</span>
          {score !== undefined && (
            <span className={`ml-auto tabular-nums font-bold ${isWinner ? 'text-emerald-700' : 'text-zinc-500'}`}>{score}</span>
          )}
        </>
      ) : <span className="text-zinc-300 italic text-[10px]">TBD</span>}
    </div>
  )
}

// ── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ fix, tm }: { fix: SeedFixture; tm: Record<string, SeedTeam> }) {
  const home = fix.home_team_id ? tm[fix.home_team_id] ?? null : null
  const away = fix.away_team_id ? tm[fix.away_team_id] ?? null : null
  const r = getResult(fix.id)
  const w = r && r.home_goals > r.away_goals ? fix.home_team_id
    : r && r.away_goals > r.home_goals ? fix.away_team_id : null
  return (
    <div className="w-full">
      <div className="rounded border border-zinc-200 bg-white p-0.5 shadow-sm">
        <TeamSlot team={home} isWinner={w === fix.home_team_id && !!w} score={r?.home_goals} />
        <div className="my-0.5 border-t border-zinc-100" />
        <TeamSlot team={away} isWinner={w === fix.away_team_id && !!w} score={r?.away_goals} />
      </div>
      <div className="text-center text-[8px] text-zinc-300 mt-0.5 select-none">{fix.id.toUpperCase()}</div>
    </div>
  )
}

// ── Bracket connector SVG ────────────────────────────────────────────────────
// nL > nR → merge (pairs on left collapse to single on right)
// nL < nR → split (single on left forks to pair on right)

function Conn({ nL, nR }: { nL: number; nR: number }) {
  const mx = NW / 2
  const paths: string[] = []
  if (nL >= nR) {
    // merge
    for (let j = 0; j < nR; j++) {
      const y1 = cy(nL, j * 2), y2 = cy(nL, j * 2 + 1), yo = cy(nR, j)
      paths.push(`M0,${y1}H${mx}V${y2}M0,${y2}H${mx}M${mx},${yo}H${NW}`)
    }
  } else {
    // split
    for (let i = 0; i < nL; i++) {
      const yi = cy(nL, i), y1 = cy(nR, i * 2), y2 = cy(nR, i * 2 + 1)
      paths.push(`M0,${yi}H${mx}M${mx},${y1}V${y2}M${mx},${y1}H${NW}M${mx},${y2}H${NW}`)
    }
  }
  return (
    <svg width={NW} height={H} className="shrink-0">
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />)}
    </svg>
  )
}

// Single horizontal at H/2 (SF → Final)
function Straight() {
  return (
    <svg width={NW} height={H} className="shrink-0">
      <path d={`M0,${H / 2}H${NW}`} fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Match column ─────────────────────────────────────────────────────────────

function Col({ ids, fm, tm }: { ids: string[]; fm: Record<string, SeedFixture>; tm: Record<string, SeedTeam> }) {
  return (
    <div style={{ width: CW, height: H, flexShrink: 0 }} className="flex flex-col justify-around px-1.5">
      {ids.map(id => fm[id] ? <MatchCard key={id} fix={fm[id]} tm={tm} /> : <div key={id} />)}
    </div>
  )
}

// ── Bracket layout constants ─────────────────────────────────────────────────

const LR32 = ['m74', 'm77', 'm73', 'm75', 'm76', 'm78', 'm79', 'm80']
const LR16 = ['m89', 'm90', 'm91', 'm92']
const LQF  = ['m97', 'm99']
const LSF  = ['m101']
const RSF  = ['m102']
const RQF  = ['m98', 'm100']
const RR16 = ['m93', 'm94', 'm95', 'm96']
const RR32 = ['m83', 'm84', 'm81', 'm82', 'm86', 'm88', 'm85', 'm87']

// Header labels and widths aligned 1-to-1 with rendered elements
const HDR: { label: string; w: number }[] = [
  { label: 'Round of 32',   w: CW  },
  { label: '',              w: NW  },
  { label: 'Round of 16',  w: CW  },
  { label: '',              w: NW  },
  { label: 'Quarter-Final', w: CW  },
  { label: '',              w: NW  },
  { label: 'Semi-Final',    w: CW  },
  { label: '',              w: NW  },
  { label: 'Final',         w: CEN },
  { label: '',              w: NW  },
  { label: 'Semi-Final',    w: CW  },
  { label: '',              w: NW  },
  { label: 'Quarter-Final', w: CW  },
  { label: '',              w: NW  },
  { label: 'Round of 16',  w: CW  },
  { label: '',              w: NW  },
  { label: 'Round of 32',   w: CW  },
]

// ── Full bracket ─────────────────────────────────────────────────────────────

function Bracket({ fm, tm }: { fm: Record<string, SeedFixture>; tm: Record<string, SeedTeam> }) {
  const finalFix = fm['m104']
  const thirdFix = fm['m103']
  const fr = finalFix ? getResult(finalFix.id) : null
  const champId = fr && fr.home_goals > fr.away_goals ? finalFix?.home_team_id
    : fr && fr.away_goals > fr.home_goals ? finalFix?.away_team_id : null
  const champ = champId ? tm[champId] : null

  return (
    <div>
      {/* Header row */}
      <div className="flex mb-1.5">
        {HDR.map((h, i) => (
          <div key={i} style={{ width: h.w, flexShrink: 0, overflow: 'visible' }}
            className="text-center text-[9px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
            {h.label}
          </div>
        ))}
      </div>

      {/* Bracket row */}
      <div className="flex items-start">
        <Col ids={LR32} fm={fm} tm={tm} />
        <Conn nL={8} nR={4} />
        <Col ids={LR16} fm={fm} tm={tm} />
        <Conn nL={4} nR={2} />
        <Col ids={LQF} fm={fm} tm={tm} />
        <Conn nL={2} nR={1} />
        <Col ids={LSF} fm={fm} tm={tm} />
        <Straight />

        {/* Center: Final */}
        <div style={{ width: CEN, height: H, flexShrink: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: H / 2, transform: 'translateY(-50%)', left: 0, right: 0, padding: '0 8px' }}>
            {finalFix && <MatchCard fix={finalFix} tm={tm} />}
            {champ && (
              <div className="mt-2 text-center">
                <div className="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Champion</div>
                <div className="rounded border-2 border-amber-400 bg-amber-50 px-2 py-2 mt-0.5">
                  <div className="text-xl">{champ.flag_url}</div>
                  <div className="text-[10px] font-bold text-amber-800 leading-tight mt-0.5">{champ.name}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Straight />
        <Col ids={RSF} fm={fm} tm={tm} />
        <Conn nL={1} nR={2} />
        <Col ids={RQF} fm={fm} tm={tm} />
        <Conn nL={2} nR={4} />
        <Col ids={RR16} fm={fm} tm={tm} />
        <Conn nL={4} nR={8} />
        <Col ids={RR32} fm={fm} tm={tm} />
      </div>

      {/* 3rd Place — below the bracket */}
      {thirdFix && (
        <div className="mt-6 flex justify-center gap-4 items-start">
          <div style={{ width: CW }} className="px-1.5">
            <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-1">3rd Place</div>
            <MatchCard fix={thirdFix} tm={tm} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export function KnockoutBracket() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-96 animate-pulse rounded-lg bg-zinc-100" />

  const teams = getTeams()
  const tm = Object.fromEntries(teams.map(t => [t.id, t]))
  const fixtures = getFixtures().filter(f => f.stage !== 'group')
  const fm = Object.fromEntries(fixtures.map(f => [f.id, f]))

  return (
    <div className="-mx-3 px-3 overflow-x-auto pb-4 select-none">
      <div style={{ minWidth: 1300 }}>
        <Bracket fm={fm} tm={tm} />
      </div>
      <p className="text-[10px] text-zinc-400 mt-2 text-center lg:hidden">Scroll left/right to see full bracket</p>
    </div>
  )
}
