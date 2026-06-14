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
