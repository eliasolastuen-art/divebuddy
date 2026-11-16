-- HT2026-schemat i Supabase: pass, gruppkopplingar, tränare + närvaro, viktiga datum.
-- Se PLAN.md avsnitt 1.

create table club_staff (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  profile_id uuid unique references profiles(id) on delete set null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create table schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  place text not null default '',
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  cancel_reason text,
  training_id uuid references trainings(id) on delete set null,
  is_extra boolean not null default false,
  note text,
  legacy_id text unique,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index schedule_sessions_club_date_idx on schedule_sessions (club_id, session_date);
create index schedule_sessions_training_idx on schedule_sessions (training_id);

create table schedule_session_groups (
  session_id uuid not null references schedule_sessions(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  primary key (session_id, group_id)
);
create index schedule_session_groups_group_idx on schedule_session_groups (group_id);

create table schedule_session_coaches (
  session_id uuid not null references schedule_sessions(id) on delete cascade,
  staff_id uuid not null references club_staff(id) on delete cascade,
  attendance text check (attendance in ('narvarande', 'franvarande', 'ersatt')),
  actual_start time,
  actual_end time,
  note text,
  primary key (session_id, staff_id)
);
create index schedule_session_coaches_staff_idx on schedule_session_coaches (staff_id);

create table club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  title text not null,
  type text not null check (type in ('comp', 'camp', 'cancelled', 'tryout', 'edu', 'event')),
  note text,
  group_ids uuid[] not null default '{}',
  staff_ids uuid[] not null default '{}',
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index club_events_club_date_idx on club_events (club_id, start_date);

alter table live_sessions
  add column schedule_session_id uuid references schedule_sessions(id) on delete set null;

create trigger schedule_sessions_updated before update on schedule_sessions
  for each row execute function update_updated_at();
create trigger club_events_updated before update on club_events
  for each row execute function update_updated_at();

create or replace function get_my_group_id() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from athletes where profile_id = auth.uid() limit 1
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table club_staff enable row level security;
alter table schedule_sessions enable row level security;
alter table schedule_session_groups enable row level security;
alter table schedule_session_coaches enable row level security;
alter table club_events enable row level security;

-- club_staff: coach/admin läser, admin skriver
create policy "Staff can view club staff" on club_staff for select
  using (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')));
create policy "Admin can manage club staff" on club_staff for all
  using (club_id = get_my_club_id() and has_role('admin'))
  with check (club_id = get_my_club_id() and has_role('admin'));

-- schedule_sessions
create policy "Staff can manage schedule sessions" on schedule_sessions for all
  using (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')));
create policy "Athletes can view own group sessions" on schedule_sessions for select
  using (club_id = get_my_club_id() and exists (
    select 1 from schedule_session_groups g
    where g.session_id = schedule_sessions.id and g.group_id = get_my_group_id()
  ));

-- schedule_session_groups
create policy "Staff can manage session groups" on schedule_session_groups for all
  using (exists (
    select 1 from schedule_sessions s where s.id = session_id
      and s.club_id = get_my_club_id() and (has_role('coach') or has_role('admin'))
  ))
  with check (exists (
    select 1 from schedule_sessions s where s.id = session_id
      and s.club_id = get_my_club_id() and (has_role('coach') or has_role('admin'))
  ));
create policy "Athletes can view own group links" on schedule_session_groups for select
  using (group_id = get_my_group_id());

-- schedule_session_coaches: bara coach/admin
create policy "Staff can manage session coaches" on schedule_session_coaches for all
  using (exists (
    select 1 from schedule_sessions s where s.id = session_id
      and s.club_id = get_my_club_id() and (has_role('coach') or has_role('admin'))
  ))
  with check (exists (
    select 1 from schedule_sessions s where s.id = session_id
      and s.club_id = get_my_club_id() and (has_role('coach') or has_role('admin'))
  ));

-- club_events
create policy "Staff can manage club events" on club_events for all
  using (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')));
create policy "Athletes can view own group events" on club_events for select
  using (club_id = get_my_club_id() and (group_ids = '{}' or get_my_group_id() = any(group_ids)));
