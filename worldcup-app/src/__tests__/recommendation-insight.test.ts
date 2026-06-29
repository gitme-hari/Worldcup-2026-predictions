import { describe, it, expect } from 'vitest'
import { buildRecommendationInsight, computeFreshness } from '@/lib/recommendation-insight'
import type { BuildInsightParams } from '@/lib/recommendation-insight'

const rec = {
  scoreline: { home: 2, away: 0 },
  confidence: 'High' as const,
}

const support = {
  confidenceReasons: ['Home team on 3-match winning run'],
  supportFactors: ['Strong home record'],
  challengeFactors: [],
  challengeLevel: 'none' as const,
  netEffect: 'Home advantage confirmed by recent form.',
}

const baseParams: BuildInsightParams = {
  fixtureId: 'fix1',
  rec: rec as any,
  support: support as any,
  now: '2026-06-15T10:00:00Z',
}

describe('computeFreshness', () => {
  it('Fresh when age < 30 min', () => {
    const gen = '2026-06-15T10:00:00Z'
    const now = '2026-06-15T10:15:00Z'
    expect(computeFreshness(gen, now)).toBe('Fresh')
  })

  it('Refreshing when 30 min <= age < 6 h', () => {
    const gen = '2026-06-15T10:00:00Z'
    const now = '2026-06-15T13:00:00Z'
    expect(computeFreshness(gen, now)).toBe('Refreshing')
  })

  it('Stale when age >= 6 h', () => {
    const gen = '2026-06-15T00:00:00Z'
    const now = '2026-06-15T10:00:00Z'
    expect(computeFreshness(gen, now)).toBe('Stale')
  })
})

describe('buildRecommendationInsight', () => {
  it('maps basic fields correctly', () => {
    const insight = buildRecommendationInsight(baseParams)
    expect(insight.fixtureId).toBe('fix1')
    expect(insight.scoreline).toEqual({ home: 2, away: 0 })
    expect(insight.confidence).toBe('High')
    expect(insight.snapshotVersion).toBe(1)
  })

  it('freshness is Fresh when generatedAt matches now', () => {
    const insight = buildRecommendationInsight(baseParams)
    expect(insight.freshness.status).toBe('Fresh')
    expect(insight.freshness.generatedAt).toBe('2026-06-15T10:00:00Z')
  })

  it('uses netEffect as summary when no overriding signals', () => {
    const insight = buildRecommendationInsight(baseParams)
    expect(insight.summary).toBe('Home advantage confirmed by recent form.')
  })

  it('summary prioritises significant challenge factor', () => {
    const challengeSupport = {
      ...support,
      challengeLevel: 'significant' as const,
      challengeFactors: ['Key striker suspended for this match'],
    }
    const insight = buildRecommendationInsight({ ...baseParams, support: challengeSupport as any })
    expect(insight.summary).toContain('Context challenges this pick')
  })

  it('summary uses strong learning signal when present with support', () => {
    const insight = buildRecommendationInsight({
      ...baseParams,
      appliedLearning: [{
        signalId: 'away_attack_underestimated',
        lesson: 'Away attacks are consistently underestimated.',
        strength: 'Strong',
        source: 'tournament_form',
        adjustmentDescription: 'Away xG increased by 15%',
        adjustmentMagnitude: 0.15,
        confidence: 'High',
      }],
    })
    expect(insight.summary).toContain('away attacks are consistently underestimated')
  })

  it('netXgAdjustment accumulates away signal magnitudes', () => {
    const insight = buildRecommendationInsight({
      ...baseParams,
      appliedLearning: [
        {
          signalId: 'away_attack_underestimated',
          lesson: '',
          strength: 'Strong',
          source: 'tournament_form',
          adjustmentDescription: '',
          adjustmentMagnitude: 0.12,
          confidence: 'High',
        },
      ],
    })
    expect(insight.netXgAdjustment.away).toBeCloseTo(0.12)
    expect(insight.netXgAdjustment.home).toBe(0)
  })

  it('netXgAdjustment accumulates home signal magnitudes', () => {
    const insight = buildRecommendationInsight({
      ...baseParams,
      appliedLearning: [
        {
          signalId: 'home_attack_underestimated',
          lesson: '',
          strength: 'Strong',
          source: 'tournament_form',
          adjustmentDescription: '',
          adjustmentMagnitude: 0.10,
          confidence: 'High',
        },
      ],
    })
    expect(insight.netXgAdjustment.home).toBeCloseTo(0.10)
  })

  it('multiple learning signals accumulate correctly', () => {
    const insight = buildRecommendationInsight({
      ...baseParams,
      appliedLearning: [
        { signalId: 'away_attack_underestimated', lesson: '', strength: 'Strong', source: 'tournament_form', adjustmentDescription: '', adjustmentMagnitude: 0.12, confidence: 'High' },
        { signalId: 'away_something_else', lesson: '', strength: 'Moderate', source: 'tournament_form', adjustmentDescription: '', adjustmentMagnitude: 0.08, confidence: 'Medium' },
      ],
    })
    expect(insight.netXgAdjustment.away).toBeCloseTo(0.2)
  })

  it('passes through priorChangelog', () => {
    const changelog = [{
      timestamp: '2026-06-14T10:00:00Z',
      event: 'created' as const,
      description: 'Initial recommendation',
      driver: 'Engine v1',
    }]
    const insight = buildRecommendationInsight({ ...baseParams, priorChangelog: changelog })
    expect(insight.changelog).toHaveLength(1)
  })

  it('recommendationNotes populated from netEffect', () => {
    const insight = buildRecommendationInsight(baseParams)
    expect(insight.recommendationNotes).toContain('Home advantage confirmed by recent form.')
  })

  it('recommendationNotes empty when no netEffect', () => {
    const noEffect = { ...support, netEffect: undefined }
    const insight = buildRecommendationInsight({ ...baseParams, support: noEffect as any })
    expect(insight.recommendationNotes).toHaveLength(0)
  })

  it('apiContext passed through', () => {
    const apiContext = { homeAbsences: 2, awayAbsences: 0, lineupConfirmed: true, notes: ['GK out'] }
    const insight = buildRecommendationInsight({ ...baseParams, apiContext })
    expect(insight.apiContext?.homeAbsences).toBe(2)
    expect(insight.apiContext?.lineupConfirmed).toBe(true)
  })

  it('summary: lineup confirmed with no challenge', () => {
    const insight = buildRecommendationInsight({
      ...baseParams,
      support: { ...support, netEffect: undefined } as any,
      apiContext: { homeAbsences: 0, awayAbsences: 0, lineupConfirmed: true, notes: [] },
    })
    expect(insight.summary).toContain('Lineup confirmed')
  })
})
