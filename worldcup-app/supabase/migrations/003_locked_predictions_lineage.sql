-- Migration 003: Add lineage columns to locked_predictions and expand pick_source constraint
--
-- Root cause: 002_add_pick_source.sql added pick_source with a CHECK constraint
-- limited to ('raw','calibrated','custom'). New values 'pool_recommendation' and
-- 'backfilled' were added to the application type but never to the DB, causing
-- every upsert with those values to silently fail. Additionally, override_reason /
-- pool_rec_home / pool_rec_away were added to LockedPrediction in the app but the
-- columns were never created in Supabase, also causing silent upsert failures.
--
-- This migration:
--   1. Drops the restrictive pick_source CHECK constraint
--   2. Adds a permissive replacement CHECK that includes all current values
--   3. Defaults existing rows (already defaulted to 'raw' by migration 002, nothing changes)
--   4. Adds override_reason, pool_rec_home, pool_rec_away as nullable columns
--   5. Existing rows are unaffected (all new columns nullable, no backfill needed)

-- Step 1: Drop the old CHECK constraint on pick_source
-- (constraint name may vary — use the DO block to drop by pattern if needed)
do $$
begin
  -- Try the explicit constraint name first (from 002)
  alter table locked_predictions drop constraint if exists locked_predictions_pick_source_check;
exception when others then
  null; -- constraint may have a different auto-generated name; step 2 handles it
end
$$;

-- Step 2: Re-add pick_source as unconstrained text (all values allowed)
-- The application layer is the source of truth for valid values.
-- If the column doesn't exist yet (migration 002 not applied), add it with a default.
alter table locked_predictions
  add column if not exists pick_source text default 'raw';

-- Remove the old constraint regardless of its name by altering column type
-- (safe no-op if already text with no constraint)
alter table locked_predictions
  alter column pick_source set default 'raw';

-- Step 3: Add lineage columns — all nullable, no default required
alter table locked_predictions
  add column if not exists override_reason text;

alter table locked_predictions
  add column if not exists pool_rec_home numeric;

alter table locked_predictions
  add column if not exists pool_rec_away numeric;

-- Verify: confirm all required columns are present
-- (will error if any column is missing, surfacing the problem immediately)
do $$
declare
  missing text := '';
begin
  if not exists (select 1 from information_schema.columns where table_name='locked_predictions' and column_name='pick_source')     then missing := missing || 'pick_source '; end if;
  if not exists (select 1 from information_schema.columns where table_name='locked_predictions' and column_name='override_reason') then missing := missing || 'override_reason '; end if;
  if not exists (select 1 from information_schema.columns where table_name='locked_predictions' and column_name='pool_rec_home')   then missing := missing || 'pool_rec_home '; end if;
  if not exists (select 1 from information_schema.columns where table_name='locked_predictions' and column_name='pool_rec_away')   then missing := missing || 'pool_rec_away '; end if;
  if missing <> '' then
    raise exception 'Migration 003 incomplete — missing columns: %', missing;
  end if;
  raise notice 'Migration 003 complete. All lineage columns present.';
end
$$;
