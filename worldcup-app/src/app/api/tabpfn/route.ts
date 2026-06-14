import { NextResponse } from 'next/server'
import { SEED_FIXTURES, SEED_TEAMS } from '@/lib/seed-data'

export const maxDuration = 300 // 5 min timeout for fit step

const BASE = 'https://api.priorlabs.ai'

// Altitude factor per venue (0=sea level, 0.5=moderate, 1=high)
const VENUE_ALTITUDE: Record<string, number> = {
  'Mexico City': 1, 'Guadalajara': 0.5, 'Monterrey': 0.25,
}
const VENUE_HEAT: Record<string, number> = {
  'Miami': 1, 'Dallas': 1, 'Houston': 1, 'Atlanta': 1,
}
// Host nation home venues
const HOST_VENUES: Record<string, string[]> = {
  usa: ['Los Angeles','Seattle','San Francisco Bay Area','Kansas City','New Jersey','Philadelphia','Boston','Miami','Dallas','Houston','Atlanta'],
  mex: ['Mexico City','Guadalajara','Monterrey'],
  can: ['Toronto','Vancouver'],
}

export async function POST() {
  const key = process.env.TABPFN_API_KEY
  if (!key) return NextResponse.json({ error: 'TABPFN_API_KEY not set' }, { status: 500 })

  const headers = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  try {
    // ── Build training CSVs ──────────────────────────────────────────────
    const xTrainRows = [
      // WC 2022 (Qatar - heat=1)
      [1620,1680,-60,0,1],[1720,1890,-170,0,1],[1620,1720,-100,0,1],[1890,1680,210,0,1],
      [1680,1720,-40,0,1],[1890,1620,270,0,1],[1970,1640,330,0,1],[1740,1740,0,0,1],
      [1740,1640,100,0,1],[1970,1740,230,0,1],[1640,1740,-100,0,1],[1740,1970,-230,0,1],
      [1980,1620,360,0,1],[1750,1730,20,0,1],[1730,1620,110,0,1],[1980,1750,230,0,1],
      [1730,1980,-250,0,1],[1620,1750,-130,0,1],[1830,1600,230,0,1],[2000,1650,350,0,1],
      [1600,1650,-50,0,1],[2000,1830,170,0,1],[1650,1830,-180,0,1],[1600,2000,-400,0,1],
      [1960,1600,360,0,1],[1940,1760,180,0,1],[1760,1600,160,0,1],[1960,1940,20,0,1],
      [1760,1960,-200,0,1],[1600,1940,-340,0,1],[1750,1840,-90,0,1],[1940,1700,240,0,1],
      [1750,1940,-190,0,1],[1840,1700,140,0,1],[1840,1940,-100,0,1],[1700,1750,-50,0,1],
      [1830,1620,210,0,1],[2050,1680,370,0,1],[1620,1680,-60,0,1],[2050,1830,220,0,1],
      [1680,1830,-150,0,1],[1620,2050,-430,0,1],[1840,1710,130,0,1],[1980,1640,340,0,1],
      [1710,1640,70,0,1],[1980,1840,140,0,1],[1640,1840,-200,0,1],[1710,1980,-270,0,1],
      // WC 2018 (Russia - heat=0)
      [1670,1600,70,0,0],[1650,1840,-190,0,0],[1700,1630,70,0,0],[1980,1960,20,0,0],
      [1990,1640,350,0,0],[1980,1750,230,0,0],[1730,1810,-80,0,0],[1840,1620,220,0,0],
      [1960,1760,200,0,0],[1790,1720,70,0,0],[1950,1500,450,0,0],[1590,1960,-370,0,0],
      [1780,1750,30,0,0],[1730,1700,30,0,0],[1670,1650,20,0,0],[1980,1700,280,0,0],
      [1630,1960,-330,0,0],[1990,1730,260,0,0],[1810,1640,170,0,0],[1980,1840,140,0,0],
      [2050,1600,450,0,0],[1620,1750,-130,0,0],[1830,1680,150,0,0],
      // WC 2014 (Brazil - altitude+heat)
      [1920,1640,280,1,1],[1840,1680,160,1,1],[1780,1730,50,1,1],[1910,1700,210,1,1],[1680,1680,0,1,1],
    ]
    const yTrainRows = [
      2,2,2,1,2,0, 0,1,2,1,2,2, 2,1,0,0,2,2, 1,0,2,0,0,0, 0,2,2,1,0,2,
      1,0,0,0,1,2, 0,0,1,0,2,0, 1,0,2,0,2,0,
      0,2,2,1, 0,1,2,0, 2,0,0,2, 2,2,0,0, 2,0,1,2, 0,0,0,
      0,1,0,0,1,
    ]

    const xHeader = 'elo_home,elo_away,elo_diff,altitude,heat'
    const xTrainCsv = xHeader + '\n' + xTrainRows.map(r => r.join(',')).join('\n')
    const yTrainCsv = 'outcome\n' + yTrainRows.join('\n')

    // ── Build test CSV (72 group fixtures) ───────────────────────────────
    const teamMap = Object.fromEntries(SEED_TEAMS.map(t => [t.id, t]))
    const testFixtureIds: string[] = []
    const xTestRows: number[][] = []

    for (const f of SEED_FIXTURES) {
      const home = teamMap[f.home_team_id]
      const away = teamMap[f.away_team_id]
      if (!home || !away) continue

      const altV = VENUE_ALTITUDE[f.venue] ?? 0
      const heatV = VENUE_HEAT[f.venue] ? 1 : 0

      // Venue-adjusted Elo
      const CONMEBOL = new Set(['mex','arg','col','ecu','bol','par','uru','bra','per'])
      const COLD = new Set(['nor','swe','ned','bel','ger','sco','eng','aus','sui','cze','bih','aut'])
      const HOT = new Set(['mar','sen','civ','egy','gha','tun','ksa','irq','irn','cpv','cod','alg','jor','qat'])

      let hElo = home.elo_rating
      let aElo = away.elo_rating

      if (altV > 0) {
        hElo += CONMEBOL.has(home.id) ? Math.round(80 * altV) : Math.round(-120 * altV)
        aElo += CONMEBOL.has(away.id) ? Math.round(80 * altV) : Math.round(-120 * altV)
      }
      if (heatV) {
        if (HOT.has(home.id)) hElo += 50
        else if (COLD.has(home.id)) hElo -= 60
        if (HOT.has(away.id)) aElo += 50
        else if (COLD.has(away.id)) aElo -= 60
      }
      // Host nation bonus
      for (const [host, venues] of Object.entries(HOST_VENUES)) {
        if (home.id === host && venues.includes(f.venue)) hElo += host === 'mex' ? 110 : host === 'usa' ? 90 : 80
        if (away.id === host && venues.includes(f.venue)) aElo += host === 'mex' ? 110 : host === 'usa' ? 90 : 80
      }

      testFixtureIds.push(f.id)
      xTestRows.push([hElo, aElo, hElo - aElo, altV, heatV])
    }

    const xTestCsv = xHeader + '\n' + xTestRows.map(r => r.join(',')).join('\n')

    // ── Step 2: prepare train upload ─────────────────────────────────────
    const prepTrain = await fetch(`${BASE}/tabpfn/prepare_train_set_upload`, {
      method: 'POST', headers,
      body: JSON.stringify({ x_train_info: { format: 'csv' }, y_train_info: { format: 'csv' } }),
    }).then(r => { if (!r.ok) throw new Error(`prepare_train: ${r.status}`); return r.json() })

    await Promise.all([
      fetch(prepTrain.x_train_info.signed_urls[0], {
        method: 'PUT', body: xTrainCsv, headers: prepTrain.x_train_info.required_headers,
      }).then(r => { if (!r.ok) throw new Error(`upload x_train: ${r.status}`) }),
      fetch(prepTrain.y_train_info.signed_urls[0], {
        method: 'PUT', body: yTrainCsv, headers: prepTrain.y_train_info.required_headers,
      }).then(r => { if (!r.ok) throw new Error(`upload y_train: ${r.status}`) }),
    ])

    // ── Step 3: fit ───────────────────────────────────────────────────────
    const fitRes = await fetch(`${BASE}/tabpfn/fit`, {
      method: 'POST', headers,
      body: JSON.stringify({ train_set_upload_id: prepTrain.train_set_upload_id, task: 'classification' }),
    }).then(r => { if (!r.ok) throw new Error(`fit: ${r.status}`); return r.json() })

    const fittedId = fitRes.fitted_train_set_id

    // ── Step 4: prepare test upload ───────────────────────────────────────
    const prepTest = await fetch(`${BASE}/tabpfn/prepare_test_set_upload`, {
      method: 'POST', headers,
      body: JSON.stringify({ fitted_train_set_id: fittedId, x_test_info: { format: 'csv' } }),
    }).then(r => { if (!r.ok) throw new Error(`prepare_test: ${r.status}`); return r.json() })

    await fetch(prepTest.x_test_info.signed_urls[0], {
      method: 'PUT', body: xTestCsv, headers: prepTest.x_test_info.required_headers,
    }).then(r => { if (!r.ok) throw new Error(`upload x_test: ${r.status}`) })

    // ── Step 5: predict ────────────────────────────────────────────────────
    const predRes = await fetch(`${BASE}/tabpfn/predict`, {
      method: 'POST', headers,
      body: JSON.stringify({
        test_set_upload_id: prepTest.test_set_upload_id,
        fitted_train_set_id: fittedId,
        task_config: { task: 'classification', predict_params: { output_type: 'probas' } },
      }),
    }).then(r => { if (!r.ok) throw new Error(`predict: ${r.status}`); return r.json() })

    // prediction is [[p_class0, p_class1, p_class2], ...] — classes follow y_train order
    // TabPFN sorts classes numerically: 0=home_win, 1=draw, 2=away_win
    const probMatrix: number[][] = predRes.prediction

    const predictions: Record<string, { home_win_prob: number; draw_prob: number; away_win_prob: number }> = {}
    testFixtureIds.forEach((fid, i) => {
      const row = probMatrix[i]
      if (!row) return
      const sum = row[0] + row[1] + row[2]
      predictions[fid] = {
        home_win_prob: Math.round((row[0] / sum) * 1000) / 1000,
        draw_prob:     Math.round((row[1] / sum) * 1000) / 1000,
        away_win_prob: Math.round((row[2] / sum) * 1000) / 1000,
      }
    })

    return NextResponse.json({ predictions, fitted_train_set_id: fittedId })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TabPFN error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
