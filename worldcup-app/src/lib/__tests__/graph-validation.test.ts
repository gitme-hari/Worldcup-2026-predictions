import { describe, it, expect } from 'vitest'
import { KNOCKOUT_FIXTURES } from '../seed-data'

// Validate that every edge in the tournament graph is consistent:
// - every fixture referenced by winnerAdvancesTo/loserAdvancesTo exists
// - every homeSource/awaySource fixture exists and has a winnerAdvancesTo/loserAdvancesTo pointing back correctly
// This test is generated from the graph itself — no hardcoded assertions per match.

describe('Tournament graph self-consistency', () => {
  const byId = new Map(KNOCKOUT_FIXTURES.map(f => [f.id, f]))

  it('all fixtures referenced by winnerAdvancesTo exist', () => {
    for (const f of KNOCKOUT_FIXTURES) {
      if (f.winnerAdvancesTo) {
        expect(byId.has(f.winnerAdvancesTo.fixture),
          `${f.id}.winnerAdvancesTo.fixture="${f.winnerAdvancesTo.fixture}" not found`
        ).toBe(true)
      }
    }
  })

  it('all fixtures referenced by loserAdvancesTo exist', () => {
    for (const f of KNOCKOUT_FIXTURES) {
      if (f.loserAdvancesTo) {
        expect(byId.has(f.loserAdvancesTo.fixture),
          `${f.id}.loserAdvancesTo.fixture="${f.loserAdvancesTo.fixture}" not found`
        ).toBe(true)
      }
    }
  })

  it('all homeSource/awaySource fixtures exist', () => {
    for (const f of KNOCKOUT_FIXTURES) {
      for (const src of [f.homeSource, f.awaySource]) {
        if (src) {
          expect(byId.has(src.fixture),
            `${f.id} source fixture="${src.fixture}" not found`
          ).toBe(true)
        }
      }
    }
  })

  // For every edge A→B (winner slot), verify B declares A as a source
  it('winnerAdvancesTo edges are mirrored by homeSource/awaySource', () => {
    for (const f of KNOCKOUT_FIXTURES) {
      if (!f.winnerAdvancesTo) continue
      const target = byId.get(f.winnerAdvancesTo.fixture)!
      const slot = f.winnerAdvancesTo.slot
      const src = slot === 'home' ? target.homeSource : target.awaySource
      expect(src,
        `${f.id} → ${f.winnerAdvancesTo.fixture}[${slot}] but target has no matching ${slot}Source`
      ).toBeDefined()
      expect(src?.fixture,
        `${f.id} → ${f.winnerAdvancesTo.fixture}[${slot}] source fixture mismatch`
      ).toBe(f.id)
      expect(src?.type).toBe('winner')
    }
  })

  // loserAdvancesTo edges mirrored by source
  it('loserAdvancesTo edges are mirrored by homeSource/awaySource', () => {
    for (const f of KNOCKOUT_FIXTURES) {
      if (!f.loserAdvancesTo) continue
      const target = byId.get(f.loserAdvancesTo.fixture)!
      const slot = f.loserAdvancesTo.slot
      const src = slot === 'home' ? target.homeSource : target.awaySource
      expect(src,
        `${f.id}.loserAdvancesTo → ${f.loserAdvancesTo.fixture}[${slot}] but no matching ${slot}Source`
      ).toBeDefined()
      expect(src?.fixture).toBe(f.id)
      expect(src?.type).toBe('loser')
    }
  })

  // Verify every non-R32 fixture has BOTH homeSource and awaySource defined
  it('all non-R32 fixtures have both homeSource and awaySource', () => {
    const derived = KNOCKOUT_FIXTURES.filter(f => f.stage !== 'r32')
    for (const f of derived) {
      expect(f.homeSource, `${f.id} missing homeSource`).toBeDefined()
      expect(f.awaySource, `${f.id} missing awaySource`).toBeDefined()
    }
  })

  // Verify every R32 fixture has a winnerAdvancesTo
  it('all R32 fixtures advance their winner somewhere', () => {
    const r32 = KNOCKOUT_FIXTURES.filter(f => f.stage === 'r32')
    for (const f of r32) {
      expect(f.winnerAdvancesTo,
        `${f.id} (R32) missing winnerAdvancesTo`
      ).toBeDefined()
    }
  })

  // Verify slot uniqueness: no two fixtures advance to the same (fixture, slot) target
  it('no two fixtures share the same winner target slot', () => {
    const seen = new Set<string>()
    for (const f of KNOCKOUT_FIXTURES) {
      if (f.winnerAdvancesTo) {
        const key = `${f.winnerAdvancesTo.fixture}:${f.winnerAdvancesTo.slot}`
        expect(seen.has(key),
          `Duplicate winner slot: ${f.id} and another fixture both target ${key}`
        ).toBe(false)
        seen.add(key)
      }
    }
  })

  it('no two fixtures share the same loser target slot', () => {
    const seen = new Set<string>()
    for (const f of KNOCKOUT_FIXTURES) {
      if (f.loserAdvancesTo) {
        const key = `${f.loserAdvancesTo.fixture}:${f.loserAdvancesTo.slot}`
        expect(seen.has(key),
          `Duplicate loser slot: ${f.id} and another fixture both target ${key}`
        ).toBe(false)
        seen.add(key)
      }
    }
  })

  // Structural counts
  it('has exactly 16 R32 fixtures', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'r32')).toHaveLength(16)
  })
  it('has exactly 8 R16 fixtures', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'r16')).toHaveLength(8)
  })
  it('has exactly 4 QF fixtures', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'qf')).toHaveLength(4)
  })
  it('has exactly 2 SF fixtures', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'sf')).toHaveLength(2)
  })
  it('has exactly 1 third-place fixture', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'third_place')).toHaveLength(1)
  })
  it('has exactly 1 final fixture', () => {
    expect(KNOCKOUT_FIXTURES.filter(f => f.stage === 'final')).toHaveLength(1)
  })

  // Stage-by-stage edge coverage
  it('all R32 winners advance to R16', () => {
    const r32 = KNOCKOUT_FIXTURES.filter(f => f.stage === 'r32')
    const r16ids = new Set(KNOCKOUT_FIXTURES.filter(f => f.stage === 'r16').map(f => f.id))
    for (const f of r32) {
      expect(r16ids.has(f.winnerAdvancesTo!.fixture),
        `${f.id} R32 winner goes to ${f.winnerAdvancesTo?.fixture} which is not an R16 match`
      ).toBe(true)
    }
  })

  it('all R16 winners advance to QF', () => {
    const r16 = KNOCKOUT_FIXTURES.filter(f => f.stage === 'r16')
    const qfids = new Set(KNOCKOUT_FIXTURES.filter(f => f.stage === 'qf').map(f => f.id))
    for (const f of r16) {
      expect(qfids.has(f.winnerAdvancesTo!.fixture),
        `${f.id} R16 winner goes to ${f.winnerAdvancesTo?.fixture} which is not a QF match`
      ).toBe(true)
    }
  })

  it('all QF winners advance to SF', () => {
    const qf = KNOCKOUT_FIXTURES.filter(f => f.stage === 'qf')
    const sfids = new Set(KNOCKOUT_FIXTURES.filter(f => f.stage === 'sf').map(f => f.id))
    for (const f of qf) {
      expect(sfids.has(f.winnerAdvancesTo!.fixture),
        `${f.id} QF winner goes to ${f.winnerAdvancesTo?.fixture} which is not a SF match`
      ).toBe(true)
    }
  })

  it('both SF winners advance to Final', () => {
    const sf = KNOCKOUT_FIXTURES.filter(f => f.stage === 'sf')
    const finalId = KNOCKOUT_FIXTURES.find(f => f.stage === 'final')!.id
    for (const f of sf) {
      expect(f.winnerAdvancesTo?.fixture).toBe(finalId)
    }
  })

  it('both SF losers advance to third-place match', () => {
    const sf = KNOCKOUT_FIXTURES.filter(f => f.stage === 'sf')
    const thirdId = KNOCKOUT_FIXTURES.find(f => f.stage === 'third_place')!.id
    for (const f of sf) {
      expect(f.loserAdvancesTo?.fixture,
        `${f.id} SF loser should go to third-place match`
      ).toBe(thirdId)
    }
  })
})
