-- Phase A1: store one row per meaningful recommendation event per fixture.
-- Used by learning-repository.ts to build RecommendationInsight changelog and
-- to answer "what changed since yesterday" queries in the Matches page.

CREATE TABLE IF NOT EXISTS recommendation_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id    text NOT NULL,
  event         text NOT NULL,       -- 'created' | 'learning_applied' | 'api_context_updated' | 'scoreline_changed' | 'locked'
  scoreline_h   smallint NOT NULL,
  scoreline_a   smallint NOT NULL,
  confidence    text NOT NULL,       -- 'High' | 'Medium' | 'Low'
  insight       jsonb NOT NULL,      -- full RecommendationInsight snapshot
  driver        text,                -- plain-English cause e.g. "Defensive momentum signal (Strong)"
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_snapshots_fixture_time
  ON recommendation_snapshots (fixture_id, created_at DESC);
