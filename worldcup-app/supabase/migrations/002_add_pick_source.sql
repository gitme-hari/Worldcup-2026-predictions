-- Add pick_source to locked_predictions so we know if user chose raw, calibrated, or custom scoreline
alter table locked_predictions
  add column if not exists pick_source text default 'raw' check (pick_source in ('raw', 'calibrated', 'custom'));
