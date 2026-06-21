'use client'
import { useState } from 'react'
import { getResults, getLockedPredictions, getHumanPredictions } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface AuditResult {
  local: {
    results: number
    lockedPreds: number
    humanPreds: number
    lockedFixtureIds: string[]
    humanFixtureIds: string[]
  }
  cloud: {
    results: number
    lockedPreds: number
    humanPreds: number
    lockedFixtureIds: string[]
    humanFixtureIds: string[]
    fetchError: string | null
  }
  schemaProbe: {
    hasOverrideReason: boolean | null
    hasPoolRecHome: boolean | null
    hasPoolRecAway: boolean | null
    pickSourceValues: string[]
    probeError: string | null
  }
  syncProbe: {
    upsertError: string | null
    upsertTested: boolean
  }
  gaps: {
    lockedMissingFromCloud: string[]
    lockedMissingLocally: string[]
    humanMissingFromCloud: string[]
    humanMissingLocally: string[]
  }
  timestamp: string
}

async function runAudit(): Promise<AuditResult> {
  // ── Local ──────────────────────────────────────────────────────────────────
  const localResults     = getResults()
  const localLocked      = getLockedPredictions()
  const localHuman       = getHumanPredictions()
  const localLockedIds   = localLocked.map(p => p.fixture_id)
  const localHumanIds    = localHuman.map(p => p.fixture_id)

  // ── Cloud ──────────────────────────────────────────────────────────────────
  let cloudLockedIds: string[]   = []
  let cloudHumanIds: string[]    = []
  let cloudResultsCount          = 0
  let cloudLockedCount           = 0
  let cloudHumanCount            = 0
  let fetchError: string | null  = null

  try {
    const [r1, r2, r3] = await Promise.all([
      supabase.from('actual_results').select('fixture_id'),
      supabase.from('locked_predictions').select('fixture_id'),
      supabase.from('human_predictions').select('fixture_id'),
    ])
    if (r1.error) { fetchError = `actual_results: ${r1.error.message}`; }
    else cloudResultsCount = (r1.data ?? []).length

    if (r2.error) { fetchError = (fetchError ? fetchError + ' | ' : '') + `locked_predictions: ${r2.error.message}` }
    else { cloudLockedIds = (r2.data ?? []).map(r => r.fixture_id); cloudLockedCount = cloudLockedIds.length }

    if (r3.error) { fetchError = (fetchError ? fetchError + ' | ' : '') + `human_predictions: ${r3.error.message}` }
    else { cloudHumanIds = (r3.data ?? []).map(r => r.fixture_id); cloudHumanCount = cloudHumanIds.length }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Unknown error'
  }

  // ── Schema probe — check if new columns exist in locked_predictions ─────────
  let hasOverrideReason: boolean | null   = null
  let hasPoolRecHome: boolean | null      = null
  let hasPoolRecAway: boolean | null      = null
  let pickSourceValues: string[]          = []
  let probeError: string | null          = null

  try {
    // Try selecting the new columns — Supabase returns error if column doesn't exist
    const { data, error } = await supabase
      .from('locked_predictions')
      .select('fixture_id, pick_source, override_reason, pool_rec_home, pool_rec_away')
      .limit(5)

    if (error) {
      probeError = error.message
      // Try narrower probes to isolate which column is missing
      const p1 = await supabase.from('locked_predictions').select('override_reason').limit(1)
      hasOverrideReason = !p1.error
      const p2 = await supabase.from('locked_predictions').select('pool_rec_home').limit(1)
      hasPoolRecHome = !p2.error
      const p3 = await supabase.from('locked_predictions').select('pool_rec_away').limit(1)
      hasPoolRecAway = !p3.error
    } else {
      hasOverrideReason = true
      hasPoolRecHome    = true
      hasPoolRecAway    = true
      pickSourceValues  = [...new Set((data ?? []).map(r => r.pick_source).filter(Boolean))]
    }
  } catch (e) {
    probeError = e instanceof Error ? e.message : 'Unknown error'
  }

  // ── Sync probe — attempt a live upsert with a sentinel payload ─────────────
  // Use a non-existent fixture_id ('__audit_probe__') so it won't collide.
  // We immediately delete it after to leave no trace.
  let upsertError: string | null = null
  let upsertTested = false

  try {
    const testPayload = {
      fixture_id:      '__audit_probe__',
      model:           'A',
      home_goals:      0,
      away_goals:      0,
      home_win_prob:   0,
      draw_prob:       0,
      away_win_prob:   0,
      pick_source:     'raw' as const,
    }
    const { error: uErr } = await supabase
      .from('locked_predictions')
      .upsert(testPayload, { onConflict: 'fixture_id' })
    upsertTested = true
    if (uErr) {
      upsertError = uErr.message
    } else {
      // Clean up the sentinel row
      await supabase.from('locked_predictions').delete().eq('fixture_id', '__audit_probe__')
    }
  } catch (e) {
    upsertError = e instanceof Error ? e.message : 'Unknown error'
    upsertTested = true
  }

  // ── Gap analysis ───────────────────────────────────────────────────────────
  const cloudLockedSet   = new Set(cloudLockedIds)
  const cloudHumanSet    = new Set(cloudHumanIds)
  const localLockedSet   = new Set(localLockedIds)
  const localHumanSet    = new Set(localHumanIds)

  const lockedMissingFromCloud  = localLockedIds.filter(id => !cloudLockedSet.has(id))
  const lockedMissingLocally    = cloudLockedIds.filter(id => !localLockedSet.has(id))
  const humanMissingFromCloud   = localHumanIds.filter(id => !cloudHumanSet.has(id))
  const humanMissingLocally     = cloudHumanIds.filter(id => !localHumanSet.has(id))

  return {
    local: {
      results:          localResults.length,
      lockedPreds:      localLocked.length,
      humanPreds:       localHuman.length,
      lockedFixtureIds: localLockedIds,
      humanFixtureIds:  localHumanIds,
    },
    cloud: {
      results:          cloudResultsCount,
      lockedPreds:      cloudLockedCount,
      humanPreds:       cloudHumanCount,
      lockedFixtureIds: cloudLockedIds,
      humanFixtureIds:  cloudHumanIds,
      fetchError,
    },
    schemaProbe: { hasOverrideReason, hasPoolRecHome, hasPoolRecAway, pickSourceValues, probeError },
    syncProbe:   { upsertError, upsertTested },
    gaps: { lockedMissingFromCloud, lockedMissingLocally, humanMissingFromCloud, humanMissingLocally },
    timestamp: new Date().toISOString(),
  }
}

function ColStatus({ ok, label }: { ok: boolean | null; label: string }) {
  const color = ok === null ? 'text-zinc-400' : ok ? 'text-green-600' : 'text-red-500'
  const icon  = ok === null ? '?' : ok ? '✓' : '✗'
  return <span className={`font-mono ${color}`}>{icon} {label}</span>
}

function GapList({ ids, emptyMsg }: { ids: string[]; emptyMsg: string }) {
  if (ids.length === 0) return <p className="text-xs text-green-600">{emptyMsg}</p>
  return (
    <ul className="space-y-0.5 mt-1">
      {ids.map(id => (
        <li key={id} className="font-mono text-xs text-red-600 bg-red-50 rounded px-2 py-0.5">{id}</li>
      ))}
    </ul>
  )
}

export function SyncAudit() {
  const [status, setStatus]   = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult]   = useState<AuditResult | null>(null)

  async function run() {
    setStatus('running')
    setResult(null)
    const r = await runAudit()
    setResult(r)
    setStatus('done')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-zinc-500" /> Sync Audit
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-0.5">
          Compares local localStorage with Supabase — identifies missing picks and schema gaps.
          Read-only except for a transient probe row that is immediately deleted.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          onClick={run}
          disabled={status === 'running'}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          {status === 'running' ? 'Running audit…' : 'Run Sync Audit'}
        </button>

        {status === 'done' && result && (() => {
          const { local, cloud, schemaProbe, syncProbe, gaps } = result
          const hasGaps  = gaps.lockedMissingFromCloud.length > 0 || gaps.lockedMissingLocally.length > 0 ||
                           gaps.humanMissingFromCloud.length > 0  || gaps.humanMissingLocally.length > 0
          const hasSchemaProblem = schemaProbe.hasOverrideReason === false ||
                                   schemaProbe.hasPoolRecHome === false ||
                                   schemaProbe.hasPoolRecAway === false

          return (
            <div className="space-y-4 text-xs">
              <p className="text-zinc-400">Audit completed at {new Date(result.timestamp).toLocaleTimeString('en-GB')}</p>

              {/* ── Counts ──────────────────────────────────────────────── */}
              <div>
                <p className="font-semibold text-zinc-700 mb-2">Counts</p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="text-zinc-400" />
                  <div className="font-medium text-zinc-500">Results</div>
                  <div className="font-medium text-zinc-500">Locked</div>
                  <div className="font-medium text-zinc-500">Human</div>
                  <div className="text-zinc-500 text-left">Local</div>
                  <div className="font-mono text-zinc-900">{local.results}</div>
                  <div className="font-mono text-zinc-900">{local.lockedPreds}</div>
                  <div className="font-mono text-zinc-900">{local.humanPreds}</div>
                  <div className="text-zinc-500 text-left">Cloud</div>
                  <div className={`font-mono ${cloud.fetchError ? 'text-red-500' : 'text-zinc-900'}`}>
                    {cloud.fetchError ? 'err' : cloud.results}
                  </div>
                  <div className={`font-mono ${cloud.fetchError ? 'text-red-500' : 'text-zinc-900'}`}>
                    {cloud.fetchError ? 'err' : cloud.lockedPreds}
                  </div>
                  <div className={`font-mono ${cloud.fetchError ? 'text-red-500' : 'text-zinc-900'}`}>
                    {cloud.fetchError ? 'err' : cloud.humanPreds}
                  </div>
                </div>
                {cloud.fetchError && (
                  <p className="mt-1 text-red-600 bg-red-50 rounded px-2 py-1">Cloud fetch error: {cloud.fetchError}</p>
                )}
              </div>

              {/* ── Gap analysis ─────────────────────────────────────────── */}
              <div>
                <p className="font-semibold text-zinc-700 mb-2">
                  Gap Analysis {!hasGaps && <span className="text-green-600 font-normal">— no gaps found</span>}
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-zinc-500 font-medium">Locked picks — missing from cloud ({gaps.lockedMissingFromCloud.length})</p>
                    <GapList ids={gaps.lockedMissingFromCloud} emptyMsg="All local locked picks exist in cloud ✓" />
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Locked picks — missing locally ({gaps.lockedMissingLocally.length})</p>
                    <GapList ids={gaps.lockedMissingLocally} emptyMsg="No cloud locked picks are missing locally ✓" />
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Human picks — missing from cloud ({gaps.humanMissingFromCloud.length})</p>
                    <GapList ids={gaps.humanMissingFromCloud} emptyMsg="All local human picks exist in cloud ✓" />
                  </div>
                  <div>
                    <p className="text-zinc-500 font-medium">Human picks — missing locally ({gaps.humanMissingLocally.length})</p>
                    <GapList ids={gaps.humanMissingLocally} emptyMsg="No cloud human picks are missing locally ✓" />
                  </div>
                </div>
              </div>

              {/* ── Schema probe ─────────────────────────────────────────── */}
              <div>
                <p className="font-semibold text-zinc-700 mb-2">
                  Schema Probe (locked_predictions)
                  {hasSchemaProblem && <span className="ml-1 text-red-500">— columns missing!</span>}
                </p>
                <div className="space-y-1">
                  <ColStatus ok={schemaProbe.hasOverrideReason} label="override_reason column" />
                  <br />
                  <ColStatus ok={schemaProbe.hasPoolRecHome} label="pool_rec_home column" />
                  <br />
                  <ColStatus ok={schemaProbe.hasPoolRecAway} label="pool_rec_away column" />
                  {schemaProbe.pickSourceValues.length > 0 && (
                    <p className="mt-1 text-zinc-500">
                      pick_source values seen in cloud: {schemaProbe.pickSourceValues.map(v => `'${v}'`).join(', ')}
                    </p>
                  )}
                  {schemaProbe.probeError && (
                    <p className="mt-1 text-red-600 bg-red-50 rounded px-2 py-1">Schema probe error: {schemaProbe.probeError}</p>
                  )}
                  {hasSchemaProblem && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                      <p className="font-semibold">Root cause identified:</p>
                      <p className="mt-0.5">
                        saveLockPrediction() passes override_reason / pool_rec_home / pool_rec_away to
                        syncLockedPred(), but these columns do not exist in Supabase.
                        Every upsert is silently failing — picks are saved locally but never reach the cloud.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sync probe ───────────────────────────────────────────── */}
              <div>
                <p className="font-semibold text-zinc-700 mb-2">Live Upsert Probe</p>
                {!syncProbe.upsertTested ? (
                  <p className="text-zinc-400">Not tested.</p>
                ) : syncProbe.upsertError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    <p className="font-semibold">Upsert failed:</p>
                    <p className="mt-0.5 font-mono">{syncProbe.upsertError}</p>
                    <p className="mt-1">This confirms syncLockedPred() silently fails on every save.</p>
                  </div>
                ) : (
                  <p className="text-green-600">✓ Basic upsert to locked_predictions succeeded (no schema error for base columns)</p>
                )}
              </div>

              {/* ── Diagnosis summary ────────────────────────────────────── */}
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-1.5">
                <p className="font-semibold text-zinc-700">Diagnosis</p>
                <p className="text-zinc-600">
                  {hasSchemaProblem
                    ? 'Root cause C + D: saveLockPrediction() calls syncLockedPred() correctly, but the payload includes columns (override_reason, pool_rec_home, pool_rec_away) that do not exist in the Supabase locked_predictions table. Supabase returns a column-not-found error, which is silently swallowed. Fix: strip unknown columns from the syncLockedPred() payload, or run the Supabase migration to add the columns.'
                    : gaps.lockedMissingFromCloud.length > 0
                    ? 'Root cause A: Picks exist locally but are missing from cloud. syncLockedPred() may have been called but failed, or was never called for these fixture IDs. Check whether the fixtures were locked before sync was wired up.'
                    : gaps.lockedMissingLocally.length > 0
                    ? 'Root cause B: Cloud has picks that are not in localStorage. The web app is not loading them on startup. Check whether initFromCloud() is called on page load.'
                    : 'No obvious issues detected. Counts match and upsert probe succeeded.'}
                </p>
              </div>

            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
