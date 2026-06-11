-- World Cup 2026 Predictions — Supabase Schema
-- Run this in Supabase SQL editor to set up the production database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teams
create table teams (
  id text primary key,
  name text not null,
  code text not null,
  "group" text not null,
  flag_url text,
  elo_rating integer not null default 1700,
  created_at timestamptz default now()
);

-- Fixtures
create table fixtures (
  id text primary key,
  home_team_id text not null references teams(id),
  away_team_id text not null references teams(id),
  "group" text,
  stage text not null check (stage in ('group','r32','r16','qf','sf','final')),
  matchday integer,
  kickoff_utc timestamptz not null,
  venue text,
  created_at timestamptz default now()
);

-- Model predictions (one row per fixture per model)
create table predictions (
  id text primary key,
  fixture_id text not null references fixtures(id),
  model text not null check (model in ('A','B','C')),
  home_goals numeric(4,2) not null,
  away_goals numeric(4,2) not null,
  home_win_prob numeric(5,4) not null,
  draw_prob numeric(5,4) not null,
  away_win_prob numeric(5,4) not null,
  created_at timestamptz default now(),
  unique(fixture_id, model)
);

-- Actual results entered by admin
create table actual_results (
  id text primary key default gen_random_uuid()::text,
  fixture_id text not null references fixtures(id) unique,
  home_goals integer not null,
  away_goals integer not null,
  entered_at timestamptz default now()
);

-- Manual score overrides for predictions/standings
create table overrides (
  id text primary key default gen_random_uuid()::text,
  fixture_id text not null references fixtures(id) unique,
  home_goals numeric(4,1) not null,
  away_goals numeric(4,1) not null,
  created_at timestamptz default now()
);

-- Bracket slot overrides (which team advances in knockout)
create table bracket_overrides (
  id text primary key default gen_random_uuid()::text,
  slot_key text not null unique,
  team_id text not null references teams(id),
  created_at timestamptz default now()
);

-- Global model configuration (single row)
create table model_config (
  id text primary key default '1',
  active_model text not null default 'A' check (active_model in ('A','B','C','hybrid')),
  weight_a numeric(5,2) not null default 33,
  weight_b numeric(5,2) not null default 33,
  weight_c numeric(5,2) not null default 34,
  updated_at timestamptz default now()
);

insert into model_config (id) values ('1') on conflict do nothing;

-- Bonus predictions (champion, semis, group winners, top scorer team)
create table bonus_predictions (
  id text primary key default gen_random_uuid()::text,
  model text not null default 'hybrid',
  key text not null unique,
  team_id text references teams(id),
  updated_at timestamptz default now()
);

-- Row Level Security — allow all for authenticated users in V1
-- Adjust to role-based in production
alter table teams enable row level security;
alter table fixtures enable row level security;
alter table predictions enable row level security;
alter table actual_results enable row level security;
alter table overrides enable row level security;
alter table bracket_overrides enable row level security;
alter table model_config enable row level security;
alter table bonus_predictions enable row level security;

-- Allow all authenticated reads
create policy "Auth read teams" on teams for select to authenticated using (true);
create policy "Auth read fixtures" on fixtures for select to authenticated using (true);
create policy "Auth read predictions" on predictions for select to authenticated using (true);
create policy "Auth read results" on actual_results for select to authenticated using (true);
create policy "Auth read overrides" on overrides for select to authenticated using (true);
create policy "Auth read bracket" on bracket_overrides for select to authenticated using (true);
create policy "Auth read config" on model_config for select to authenticated using (true);
create policy "Auth read bonus" on bonus_predictions for select to authenticated using (true);

-- Allow authenticated writes (all users = admin in V1)
create policy "Auth write results" on actual_results for all to authenticated using (true);
create policy "Auth write overrides" on overrides for all to authenticated using (true);
create policy "Auth write bracket" on bracket_overrides for all to authenticated using (true);
create policy "Auth write config" on model_config for all to authenticated using (true);
create policy "Auth write bonus" on bonus_predictions for all to authenticated using (true);
