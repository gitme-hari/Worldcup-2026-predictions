// Tournament graph validation.
// Covers: static graph wiring, runtime resolution, result deletion, winner changes.
// All fixture IDs are official FIFA match numbers M73–M104.

import { describe, it, expect, beforeEach } from 'vitest'
import { KNOCKOUT_FIXTURES } from '../seed-data'
import { resolveTournament } from '../tournament-graph'

// ── Static graph wiring ───────────────────────────────────────────────────────
// These tests assert the graph connectivity in the data, independent of results.

const fix = Object.fromEntries(KNOCKOUT_FIXTURES.map(f => [f.id, f]))

describe('R32 → R16 graph wiring', () => {
  describe('Left bracket (M73–M80)', () => {
    it('M73 (RSA/CAN) winner → M90 home', () => {
      expect(fix['m73'].winnerAdvancesTo).toEqual({ fixture: 'm90', slot: 'home' })
    })
    it('M74 (GER/PAR) winner → M89 home', () => {
      expect(fix['m74'].winnerAdvancesTo).toEqual({ fixture: 'm89', slot: 'home' })
    })
    it('M75 (NED/MAR) winner → M90 away', () => {
      expect(fix['m75'].winnerAdvancesTo).toEqual({ fixture: 'm90', slot: 'away' })
    })
    it('M76 (BRA/JPN) winner → M91 home', () => {
      expect(fix['m76'].winnerAdvancesTo).toEqual({ fixture: 'm91', slot: 'home' })
    })
    it('M77 (FRA/SWE) winner → M89 away', () => {
      expect(fix['m77'].winnerAdvancesTo).toEqual({ fixture: 'm89', slot: 'away' })
    })
    it('M78 (CIV/NOR) winner → M91 away', () => {
      expect(fix['m78'].winnerAdvancesTo).toEqual({ fixture: 'm91', slot: 'away' })
    })
    it('M79 (MEX/ECU) winner → M92 home', () => {
      expect(fix['m79'].winnerAdvancesTo).toEqual({ fixture: 'm92', slot: 'home' })
    })
    it('M80 (ENG/COD) winner → M92 away', () => {
      expect(fix['m80'].winnerAdvancesTo).toEqual({ fixture: 'm92', slot: 'away' })
    })
  })

  describe('Right bracket (M81–M88)', () => {
    it('M81 (USA/BIH) winner → M94 home', () => {
      expect(fix['m81'].winnerAdvancesTo).toEqual({ fixture: 'm94', slot: 'home' })
    })
    it('M82 (BEL/SEN) winner → M94 away', () => {
      expect(fix['m82'].winnerAdvancesTo).toEqual({ fixture: 'm94', slot: 'away' })
    })
    it('M83 (POR/CRO) winner → M93 home', () => {
      expect(fix['m83'].winnerAdvancesTo).toEqual({ fixture: 'm93', slot: 'home' })
    })
    it('M84 (ESP/AUT) winner → M93 away', () => {
      expect(fix['m84'].winnerAdvancesTo).toEqual({ fixture: 'm93', slot: 'away' })
    })
    it('M85 (SUI/ALG) winner → M96 home', () => {
      expect(fix['m85'].winnerAdvancesTo).toEqual({ fixture: 'm96', slot: 'home' })
    })
    it('M86 (ARG/CPV) winner → M95 home', () => {
      expect(fix['m86'].winnerAdvancesTo).toEqual({ fixture: 'm95', slot: 'home' })
    })
    it('M87 (COL/GHA) winner → M96 away', () => {
      expect(fix['m87'].winnerAdvancesTo).toEqual({ fixture: 'm96', slot: 'away' })
    })
    it('M88 (AUS/EGY) winner → M95 away', () => {
      expect(fix['m88'].winnerAdvancesTo).toEqual({ fixture: 'm95', slot: 'away' })
    })
  })
})

describe('R16 sources (typed KnockoutSource)', () => {
  it('M89 home = winner of M74', () => expect(fix['m89'].homeSource).toEqual({ fixture: 'm74', type: 'winner' }))
  it('M89 away = winner of M77', () => expect(fix['m89'].awaySource).toEqual({ fixture: 'm77', type: 'winner' }))
  it('M90 home = winner of M73', () => expect(fix['m90'].homeSource).toEqual({ fixture: 'm73', type: 'winner' }))
  it('M90 away = winner of M75', () => expect(fix['m90'].awaySource).toEqual({ fixture: 'm75', type: 'winner' }))
  it('M91 home = winner of M76', () => expect(fix['m91'].homeSource).toEqual({ fixture: 'm76', type: 'winner' }))
  it('M91 away = winner of M78', () => expect(fix['m91'].awaySource).toEqual({ fixture: 'm78', type: 'winner' }))
  it('M92 home = winner of M79', () => expect(fix['m92'].homeSource).toEqual({ fixture: 'm79', type: 'winner' }))
  it('M92 away = winner of M80', () => expect(fix['m92'].awaySource).toEqual({ fixture: 'm80', type: 'winner' }))
  it('M93 home = winner of M83', () => expect(fix['m93'].homeSource).toEqual({ fixture: 'm83', type: 'winner' }))
  it('M93 away = winner of M84', () => expect(fix['m93'].awaySource).toEqual({ fixture: 'm84', type: 'winner' }))
  it('M94 home = winner of M81', () => expect(fix['m94'].homeSource).toEqual({ fixture: 'm81', type: 'winner' }))
  it('M94 away = winner of M82', () => expect(fix['m94'].awaySource).toEqual({ fixture: 'm82', type: 'winner' }))
  it('M95 home = winner of M86', () => expect(fix['m95'].homeSource).toEqual({ fixture: 'm86', type: 'winner' }))
  it('M95 away = winner of M88', () => expect(fix['m95'].awaySource).toEqual({ fixture: 'm88', type: 'winner' }))
  it('M96 home = winner of M85', () => expect(fix['m96'].homeSource).toEqual({ fixture: 'm85', type: 'winner' }))
  it('M96 away = winner of M87', () => expect(fix['m96'].awaySource).toEqual({ fixture: 'm87', type: 'winner' }))
})

describe('R16 → QF graph wiring', () => {
  it('M89 winner → M97 home', () => expect(fix['m89'].winnerAdvancesTo).toEqual({ fixture: 'm97', slot: 'home' }))
  it('M90 winner → M97 away', () => expect(fix['m90'].winnerAdvancesTo).toEqual({ fixture: 'm97', slot: 'away' }))
  it('M91 winner → M99 home', () => expect(fix['m91'].winnerAdvancesTo).toEqual({ fixture: 'm99', slot: 'home' }))
  it('M92 winner → M99 away', () => expect(fix['m92'].winnerAdvancesTo).toEqual({ fixture: 'm99', slot: 'away' }))
  it('M93 winner → M98 home', () => expect(fix['m93'].winnerAdvancesTo).toEqual({ fixture: 'm98', slot: 'home' }))
  it('M94 winner → M98 away', () => expect(fix['m94'].winnerAdvancesTo).toEqual({ fixture: 'm98', slot: 'away' }))
  it('M95 winner → M100 home', () => expect(fix['m95'].winnerAdvancesTo).toEqual({ fixture: 'm100', slot: 'home' }))
  it('M96 winner → M100 away', () => expect(fix['m96'].winnerAdvancesTo).toEqual({ fixture: 'm100', slot: 'away' }))
})

describe('QF → SF graph wiring', () => {
  it('M97 winner → M101 home', () => expect(fix['m97'].winnerAdvancesTo).toEqual({ fixture: 'm101', slot: 'home' }))
  it('M99 winner → M101 away', () => expect(fix['m99'].winnerAdvancesTo).toEqual({ fixture: 'm101', slot: 'away' }))
  it('M98 winner → M102 home', () => expect(fix['m98'].winnerAdvancesTo).toEqual({ fixture: 'm102', slot: 'home' }))
  it('M100 winner → M102 away', () => expect(fix['m100'].winnerAdvancesTo).toEqual({ fixture: 'm102', slot: 'away' }))
})

describe('SF → Final + 3rd Place', () => {
  it('M101 winner → M104 home', () => expect(fix['m101'].winnerAdvancesTo).toEqual({ fixture: 'm104', slot: 'home' }))
  it('M102 winner → M104 away', () => expect(fix['m102'].winnerAdvancesTo).toEqual({ fixture: 'm104', slot: 'away' }))
  it('M101 loser → M103 home', () => expect(fix['m101'].loserAdvancesTo).toEqual({ fixture: 'm103', slot: 'home' }))
  it('M102 loser → M103 away', () => expect(fix['m102'].loserAdvancesTo).toEqual({ fixture: 'm103', slot: 'away' }))
  it('M103 home = loser of M101', () => expect(fix['m103'].homeSource).toEqual({ fixture: 'm101', type: 'loser' }))
  it('M103 away = loser of M102', () => expect(fix['m103'].awaySource).toEqual({ fixture: 'm102', type: 'loser' }))
  it('M104 home = winner of M101', () => expect(fix['m104'].homeSource).toEqual({ fixture: 'm101', type: 'winner' }))
  it('M104 away = winner of M102', () => expect(fix['m104'].awaySource).toEqual({ fixture: 'm102', type: 'winner' }))
})

// ── Runtime resolution ────────────────────────────────────────────────────────
// These tests exercise resolveTournament() with actual results.

describe('resolveTournament — M73 (RSA/CAN) → M90', () => {
  it('CAN wins 0-1: CAN appears as M90 home', () => {
    const results = [{ fixture_id: 'm73', home_goals: 0, away_goals: 1 }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    expect(resolved['m90'].home_team_id).toBe('can')
    expect(resolved['m90'].away_team_id).toBe('')  // not yet set
  })

  it('RSA wins 2-0: RSA appears as M90 home', () => {
    const results = [{ fixture_id: 'm73', home_goals: 2, away_goals: 0 }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    expect(resolved['m90'].home_team_id).toBe('rsa')
  })

  it('winner does NOT appear in M89 (wrong R16 match)', () => {
    const results = [{ fixture_id: 'm73', home_goals: 0, away_goals: 1 }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    expect(resolved['m89'].home_team_id).not.toBe('can')
    expect(resolved['m89'].away_team_id).not.toBe('can')
  })
})

describe('resolveTournament — deleting a result clears downstream slot', () => {
  it('with result: M90 home is populated', () => {
    const results = [{ fixture_id: 'm73', home_goals: 0, away_goals: 1 }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    expect(resolved['m90'].home_team_id).toBe('can')
  })

  it('without result: M90 home is empty', () => {
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, []).map(f => [f.id, f]))
    expect(resolved['m90'].home_team_id).toBe('')
  })
})

describe('resolveTournament — changing winner updates downstream', () => {
  const getM90Home = (homeGoals: number, awayGoals: number) => {
    const results = [{ fixture_id: 'm73', home_goals: homeGoals, away_goals: awayGoals }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    return resolved['m90'].home_team_id
  }

  it('RSA wins 3-0 (home win): M90 home = rsa', () => expect(getM90Home(3, 0)).toBe('rsa'))
  it('CAN wins 0-1 (away win): M90 home = can', () => expect(getM90Home(0, 1)).toBe('can'))
})

describe('resolveTournament — full chain propagation', () => {
  it('entering R32 + R16 results propagates to QF', () => {
    const results = [
      { fixture_id: 'm73', home_goals: 2, away_goals: 0 },  // RSA wins → M90 home
      { fixture_id: 'm75', home_goals: 0, away_goals: 1 },  // MAR wins → M90 away
      { fixture_id: 'm90', home_goals: 1, away_goals: 0 },  // RSA wins R16 → M97 away
    ]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    // M90 should have RSA home, MAR away
    expect(resolved['m90'].home_team_id).toBe('rsa')
    expect(resolved['m90'].away_team_id).toBe('mar')
    // M97 away should be RSA (winner of M90)
    expect(resolved['m97'].away_team_id).toBe('rsa')
  })
})

describe('resolveTournament — SF loser → 3rd place', () => {
  it('SF loser correctly routed to M103', () => {
    // Need to build up results all the way to SF
    const results = [
      // Left bracket: fill M89 and M90 so M97 has teams, then M99 and M97 to reach M101
      { fixture_id: 'm74', home_goals: 1, away_goals: 0 },  // GER wins → M89 home
      { fixture_id: 'm77', home_goals: 0, away_goals: 1 },  // SWE wins → M89 away
      { fixture_id: 'm73', home_goals: 1, away_goals: 0 },  // RSA wins → M90 home
      { fixture_id: 'm75', home_goals: 1, away_goals: 0 },  // NED wins → M90 away
      { fixture_id: 'm76', home_goals: 1, away_goals: 0 },  // BRA wins → M91 home
      { fixture_id: 'm78', home_goals: 1, away_goals: 0 },  // CIV wins → M91 away
      { fixture_id: 'm79', home_goals: 1, away_goals: 0 },  // MEX wins → M92 home
      { fixture_id: 'm80', home_goals: 1, away_goals: 0 },  // ENG wins → M92 away
      { fixture_id: 'm89', home_goals: 1, away_goals: 0 },  // GER wins → M97 home
      { fixture_id: 'm90', home_goals: 1, away_goals: 0 },  // RSA wins → M97 away
      { fixture_id: 'm91', home_goals: 1, away_goals: 0 },  // BRA wins → M99 home
      { fixture_id: 'm92', home_goals: 1, away_goals: 0 },  // MEX wins → M99 away
      { fixture_id: 'm97', home_goals: 1, away_goals: 0 },  // GER wins → M101 home
      { fixture_id: 'm99', home_goals: 0, away_goals: 1 },  // MEX wins → M101 away
      { fixture_id: 'm101', home_goals: 2, away_goals: 1 }, // GER wins final; MEX loses → M103 home
    ]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    // GER won M101, so MEX (loser) goes to M103 home
    expect(resolved['m103'].home_team_id).toBe('mex')
    // GER (winner) goes to M104 home
    expect(resolved['m104'].home_team_id).toBe('ger')
  })
})

describe('resolveTournament — draw is ignored (knockout guard)', () => {
  it('a draw result does not advance any team', () => {
    const results = [{ fixture_id: 'm73', home_goals: 1, away_goals: 1 }]
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    expect(resolved['m90'].home_team_id).toBe('')
  })
})

describe('resolveTournament — M104 never populated from R32 results alone', () => {
  it('only R32 results: M104 teams are still TBD', () => {
    const results = Array.from({ length: 16 }, (_, i) => ({
      fixture_id: `m${73 + i}`,
      home_goals: 1,
      away_goals: 0,
    }))
    const resolved = Object.fromEntries(resolveTournament(KNOCKOUT_FIXTURES, results).map(f => [f.id, f]))
    // Final should still be TBD — R16/QF/SF results not entered
    expect(resolved['m104'].home_team_id).toBe('')
    expect(resolved['m104'].away_team_id).toBe('')
  })
})
