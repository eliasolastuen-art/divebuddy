create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  coach_id text not null,
  group_id uuid references groups(id),
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table live_session_athletes (
  session_id uuid references live_sessions(id) on delete cascade,
  athlete_id uuid references athletes(id) on delete cascade,
  is_present boolean default true,
  primary key (session_id, athlete_id)
);

create table live_dive_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references live_sessions(id) on delete cascade,
  athlete_id uuid references athletes(id),
  dive_code text,
  dive_name text,
  dd numeric(4,1),
  status text default 'pending' check (status in ('pending','done')),
  coach_feedback text,
  created_at timestamptz default now()
);