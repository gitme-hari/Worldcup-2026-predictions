import { NextResponse } from 'next/server'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

// Map team IDs to ESPN display name fragments
const TEAM_ESPN_NAMES: Record<string, string[]> = {
  usa: ['united states', 'usa'],
  uru: ['uruguay'],
  pan: ['panama'],
  bol: ['bolivia'],
  arg: ['argentina'],
  chi: ['chile'],
  per: ['peru'],
  pol: ['poland'],
  bra: ['brazil'],
  col: ['colombia'],
  ecu: ['ecuador'],
  par: ['paraguay'],
  fra: ['france'],
  bel: ['belgium'],
  tun: ['tunisia'],
  mar: ['morocco'],
  ger: ['germany'],
  esp: ['spain'],
  den: ['denmark'],
  tur: ['turkey'],
  eng: ['england'],
  ned: ['netherlands'],
  irn: ['iran'],
  wal: ['wales'],
  por: ['portugal'],
  cro: ['croatia'],
  ksa: ['saudi arabia'],
  aus: ['australia'],
  ita: ['italy'],
  sui: ['switzerland'],
  nga: ['nigeria'],
  kor: ['south korea', 'korea republic'],
  jpn: ['japan'],
  sen: ['senegal'],
  cmr: ['cameroon'],
  nzl: ['new zealand'],
  mex: ['mexico'],
  can: ['canada'],
  crc: ['costa rica'],
  ukr: ['ukraine'],
  egy: ['egypt'],
  civ: ["côte d'ivoire", 'ivory coast'],
  alg: ['algeria'],
  rsa: ['south africa'],
  svk: ['slovakia'],
  aut: ['austria'],
  rom: ['romania'],
  mli: ['mali'],
}

function matchTeamId(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [id, aliases] of Object.entries(TEAM_ESPN_NAMES)) {
    if (aliases.some(a => lower.includes(a) || a.includes(lower))) return id
  }
  return null
}

export interface LiveDataResponse {
  teamAdjustments: Record<string, number>
  newsItems: Array<{ headline: string; teamIds: string[]; type: 'injury' | 'positive' | 'info' }>
  matchResults: Array<{ homeId: string; awayId: string; homeGoals: number; awayGoals: number }>
  fetchedAt: string
  errors: string[]
}

export async function GET(): Promise<NextResponse<LiveDataResponse>> {
  const teamAdjustments: Record<string, number> = {}
  const newsItems: LiveDataResponse['newsItems'] = []
  const matchResults: LiveDataResponse['matchResults'] = []
  const errors: string[] = []

  // --- Fetch WC scoreboard for completed match form ---
  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard`, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (res.ok) {
      const data = await res.json()
      for (const event of (data.events ?? [])) {
        const comp = event.competitions?.[0]
        if (!comp?.status?.type?.completed) continue

        const competitors = comp.competitors ?? []
        if (competitors.length !== 2) continue

        const [c1, c2] = competitors
        const id1 = matchTeamId(c1.team?.displayName ?? '')
        const id2 = matchTeamId(c2.team?.displayName ?? '')

        if (id1 && id2) {
          matchResults.push({
            homeId: id1,
            awayId: id2,
            homeGoals: parseInt(c1.score ?? '0'),
            awayGoals: parseInt(c2.score ?? '0'),
          })
        }

        for (const c of competitors) {
          const teamId = matchTeamId(c.team?.displayName ?? '')
          if (!teamId) continue
          if (c.winner === true) {
            teamAdjustments[teamId] = (teamAdjustments[teamId] ?? 0) + 0.10
          } else if (c.winner === false) {
            teamAdjustments[teamId] = (teamAdjustments[teamId] ?? 0) - 0.08
          } else {
            teamAdjustments[teamId] = (teamAdjustments[teamId] ?? 0) + 0.01
          }
        }
      }
    } else {
      errors.push(`scoreboard: HTTP ${res.status}`)
    }
  } catch {
    errors.push('scoreboard: fetch failed')
  }

  // --- Fetch ESPN WC news for injuries/suspensions ---
  try {
    const res = await fetch(`${ESPN_BASE}/news?limit=40`, {
      next: { revalidate: 600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (res.ok) {
      const data = await res.json()
      const INJURY_KW = ['injur', 'ruled out', 'suspended', 'suspension', 'doubtful', 'withdrawn', 'misses', 'out for', 'fitness concern', 'limped off']
      const POSITIVE_KW = ['returns', 'fit to play', 'available', 'recovered', 'back in training', 'cleared to play']

      for (const article of (data.articles ?? []).slice(0, 40)) {
        const text = `${article.headline ?? ''} ${article.description ?? ''}`.toLowerCase()
        const teamIds = Object.keys(TEAM_ESPN_NAMES).filter(id =>
          TEAM_ESPN_NAMES[id].some(alias => text.includes(alias))
        )
        if (!teamIds.length) continue

        const isInjury = INJURY_KW.some(kw => text.includes(kw))
        const isPositive = POSITIVE_KW.some(kw => text.includes(kw))

        if (isInjury) {
          teamIds.forEach(id => { teamAdjustments[id] = (teamAdjustments[id] ?? 0) - 0.05 })
          newsItems.push({ headline: article.headline, teamIds, type: 'injury' })
        } else if (isPositive) {
          teamIds.forEach(id => { teamAdjustments[id] = (teamAdjustments[id] ?? 0) + 0.03 })
          newsItems.push({ headline: article.headline, teamIds, type: 'positive' })
        } else if (teamIds.length) {
          newsItems.push({ headline: article.headline, teamIds, type: 'info' })
        }
      }
    } else {
      errors.push(`news: HTTP ${res.status}`)
    }
  } catch {
    errors.push('news: fetch failed')
  }

  // Clamp adjustments to [-0.4, 0.4]
  for (const id of Object.keys(teamAdjustments)) {
    teamAdjustments[id] = Math.max(-0.4, Math.min(0.4, teamAdjustments[id]))
  }

  return NextResponse.json({
    teamAdjustments,
    newsItems: newsItems.slice(0, 20),
    matchResults,
    fetchedAt: new Date().toISOString(),
    errors,
  })
}
