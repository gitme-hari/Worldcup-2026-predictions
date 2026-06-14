import { NextResponse } from 'next/server'

const MIGRATION_SQL = `
create table if not exists actual_results (
  fixture_id text primary key,
  home_goals int not null,
  away_goals int not null,
  entered_at timestamptz default now()
);

create table if not exists locked_predictions (
  fixture_id text primary key,
  model text not null,
  home_goals float not null,
  away_goals float not null,
  home_win_prob float not null,
  draw_prob float not null,
  away_win_prob float not null,
  locked_at timestamptz default now()
);

create table if not exists human_predictions (
  fixture_id text primary key,
  home_goals int not null,
  away_goals int not null,
  comment text default '',
  created_at timestamptz default now()
);

create table if not exists bonus_predictions (
  key text primary key,
  team_id text,
  model text default 'hybrid'
);
`

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${url}/rest/v1/actual_results?limit=1`, {
    headers: { 'Authorization': `Bearer ${key}`, 'apikey': key }
  })

  const tablesExist = res.status !== 404 && res.status !== 400

  return NextResponse.json({
    tablesExist,
    sql: tablesExist ? null : MIGRATION_SQL
  })
}
