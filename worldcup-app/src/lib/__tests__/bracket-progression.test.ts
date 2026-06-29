// Validates that the official FIFA WC 2026 bracket progression wiring is correct.
// All assertions are derived from the official FIFA match numbering M73–M104.

import { describe, it, expect } from 'vitest'
import { KNOCKOUT_FIXTURES } from '../seed-data'

// Build a lookup: fixtureId → fixture
const fix = Object.fromEntries(KNOCKOUT_FIXTURES.map(f => [f.id, f]))

// ── Helper ────────────────────────────────────────────────────────────────────

function advances(fromId: string, expectedTo: string, expectedSlot: 'home' | 'away') {
  const f = fix[fromId]
  if (!f) throw new Error(`Fixture ${fromId} not found`)
  expect(f.winnerAdvancesTo).toBe(expectedTo)
  expect(f.winnerSlot).toBe(expectedSlot)
}

function feeds(toId: string, homeFrom: string, awayFrom: string) {
  const f = fix[toId]
  if (!f) throw new Error(`Fixture ${toId} not found`)
  expect(f.homeSource).toBe(`W:${homeFrom}`)
  expect(f.awaySource).toBe(`W:${awayFrom}`)
}

// ── R32 → R16 ────────────────────────────────────────────────────────────────
// Left bracket

describe('R32 → R16 progression (left bracket)', () => {
  // Pod 1: M74(GER/PAR) + M77(FRA/SWE) → M89(r16-1)
  it('r32-2 (GER/PAR) winner → r16-1 home', () => advances('r32-2', 'r16-1', 'home'))
  it('r32-5 (FRA/SWE) winner → r16-1 away', () => advances('r32-5', 'r16-1', 'away'))

  // Pod 2: M73(RSA/CAN) + M75(NED/MAR) → M90(r16-2)
  it('r32-1 (RSA/CAN) winner → r16-2 home', () => advances('r32-1', 'r16-2', 'home'))
  it('r32-3 (NED/MAR) winner → r16-2 away', () => advances('r32-3', 'r16-2', 'away'))

  // Pod 3: M76(BRA/JPN) + M78(CIV/NOR) → M91(r16-3)
  it('r32-4 (BRA/JPN) winner → r16-3 home', () => advances('r32-4', 'r16-3', 'home'))
  it('r32-6 (CIV/NOR) winner → r16-3 away', () => advances('r32-6', 'r16-3', 'away'))

  // Pod 4: M79(MEX/ECU) + M80(ENG/COD) → M92(r16-4)
  it('r32-7 (MEX/ECU) winner → r16-4 home', () => advances('r32-7', 'r16-4', 'home'))
  it('r32-8 (ENG/COD) winner → r16-4 away', () => advances('r32-8', 'r16-4', 'away'))
})

// Right bracket
describe('R32 → R16 progression (right bracket)', () => {
  // Pod 5: M83(POR/CRO) + M84(ESP/AUT) → M93(r16-5)
  it('r32-11 (POR/CRO) winner → r16-5 home', () => advances('r32-11', 'r16-5', 'home'))
  it('r32-12 (ESP/AUT) winner → r16-5 away', () => advances('r32-12', 'r16-5', 'away'))

  // Pod 6: M81(USA/BIH) + M82(BEL/SEN) → M94(r16-6)
  it('r32-9 (USA/BIH) winner → r16-6 home', () => advances('r32-9', 'r16-6', 'home'))
  it('r32-10 (BEL/SEN) winner → r16-6 away', () => advances('r32-10', 'r16-6', 'away'))

  // Pod 7: M86(ARG/CPV) + M88(AUS/EGY) → M95(r16-7)
  it('r32-14 (ARG/CPV) winner → r16-7 home', () => advances('r32-14', 'r16-7', 'home'))
  it('r32-16 (AUS/EGY) winner → r16-7 away', () => advances('r32-16', 'r16-7', 'away'))

  // Pod 8: M85(SUI/ALG) + M87(COL/GHA) → M96(r16-8)
  it('r32-13 (SUI/ALG) winner → r16-8 home', () => advances('r32-13', 'r16-8', 'home'))
  it('r32-15 (COL/GHA) winner → r16-8 away', () => advances('r32-15', 'r16-8', 'away'))
})

// ── R16 → QF ─────────────────────────────────────────────────────────────────

describe('R16 → QF progression', () => {
  // Left bracket feeds: r16-1 + r16-2 → qf-1 (M97)
  it('r16-1 (M89) winner → qf-1 home', () => advances('r16-1', 'qf-1', 'home'))
  it('r16-2 (M90) winner → qf-1 away', () => advances('r16-2', 'qf-1', 'away'))
  it('qf-1 receives W(r16-1) home, W(r16-2) away', () => feeds('qf-1', 'r16-1', 'r16-2'))

  // Left bracket feeds: r16-3 + r16-4 → qf-3 (M99)
  it('r16-3 (M91) winner → qf-3 home', () => advances('r16-3', 'qf-3', 'home'))
  it('r16-4 (M92) winner → qf-3 away', () => advances('r16-4', 'qf-3', 'away'))
  it('qf-3 receives W(r16-3) home, W(r16-4) away', () => feeds('qf-3', 'r16-3', 'r16-4'))

  // Right bracket feeds: r16-5 + r16-6 → qf-2 (M98)
  it('r16-5 (M93) winner → qf-2 home', () => advances('r16-5', 'qf-2', 'home'))
  it('r16-6 (M94) winner → qf-2 away', () => advances('r16-6', 'qf-2', 'away'))
  it('qf-2 receives W(r16-5) home, W(r16-6) away', () => feeds('qf-2', 'r16-5', 'r16-6'))

  // Right bracket feeds: r16-7 + r16-8 → qf-4 (M100)
  it('r16-7 (M95) winner → qf-4 home', () => advances('r16-7', 'qf-4', 'home'))
  it('r16-8 (M96) winner → qf-4 away', () => advances('r16-8', 'qf-4', 'away'))
  it('qf-4 receives W(r16-7) home, W(r16-8) away', () => feeds('qf-4', 'r16-7', 'r16-8'))
})

// ── QF → SF ───────────────────────────────────────────────────────────────────

describe('QF → SF progression', () => {
  // Left-side QFs → sf-1 (M101)
  it('qf-1 (M97) winner → sf-1 home', () => advances('qf-1', 'sf-1', 'home'))
  it('qf-3 (M99) winner → sf-1 away', () => advances('qf-3', 'sf-1', 'away'))
  it('sf-1 receives W(qf-1) home, W(qf-3) away', () => feeds('sf-1', 'qf-1', 'qf-3'))

  // Right-side QFs → sf-2 (M102)
  it('qf-2 (M98) winner → sf-2 home', () => advances('qf-2', 'sf-2', 'home'))
  it('qf-4 (M100) winner → sf-2 away', () => advances('qf-4', 'sf-2', 'away'))
  it('sf-2 receives W(qf-2) home, W(qf-4) away', () => feeds('sf-2', 'qf-2', 'qf-4'))
})

// ── SF → Final + Third-place ──────────────────────────────────────────────────

describe('SF → Final and Third-place', () => {
  it('sf-1 winner → final home', () => {
    expect(fix['sf-1'].winnerAdvancesTo).toBe('final')
    expect(fix['sf-1'].winnerSlot).toBe('home')
  })
  it('sf-2 winner → final away', () => {
    expect(fix['sf-2'].winnerAdvancesTo).toBe('final')
    expect(fix['sf-2'].winnerSlot).toBe('away')
  })
  it('sf-1 loser → third-place home', () => {
    expect(fix['sf-1'].loserAdvancesTo).toBe('third-place')
    expect(fix['sf-1'].loserSlot).toBe('home')
  })
  it('sf-2 loser → third-place away', () => {
    expect(fix['sf-2'].loserAdvancesTo).toBe('third-place')
    expect(fix['sf-2'].loserSlot).toBe('away')
  })
  it('final receives W(sf-1) home, W(sf-2) away', () => feeds('final', 'sf-1', 'sf-2'))
  it('third-place: sources are L:sf-1 and L:sf-2', () => {
    expect(fix['third-place'].homeSource).toBe('L:sf-1')
    expect(fix['third-place'].awaySource).toBe('L:sf-2')
  })
})

// ── Specifically validate RSA/CAN → r16-2 (the reported bug) ─────────────────

describe('RSA/CAN progression sanity check', () => {
  it('r32-1 (RSA/CAN) feeds r16-2, not r16-1', () => {
    expect(fix['r32-1'].winnerAdvancesTo).toBe('r16-2')
    expect(fix['r32-1'].winnerAdvancesTo).not.toBe('r16-1')
  })
  it('r32-1 winner fills r16-2 home slot', () => {
    expect(fix['r32-1'].winnerSlot).toBe('home')
  })
  it('r16-2 home source is r32-1 (RSA/CAN)', () => {
    expect(fix['r16-2'].homeSource).toBe('W:r32-1')
  })
  it('r16-2 connects onward to qf-1 as away', () => {
    expect(fix['r16-2'].winnerAdvancesTo).toBe('qf-1')
    expect(fix['r16-2'].winnerSlot).toBe('away')
  })
})
