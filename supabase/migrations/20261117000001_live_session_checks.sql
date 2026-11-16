-- Del 2, sprint 1: avbockade övningar per live-session, så att de finns kvar
-- när man lämnar passet och kommer tillbaka ("Fortsätt passet", "4 av 6 klara").

create table if not exists live_session_checks (
  session_id uuid not null references live_sessions(id) on delete cascade,
  training_block_item_id uuid not null references training_block_items(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (session_id, training_block_item_id)
);

alter table live_session_checks enable row level security;

drop policy if exists "Club members can view session checks" on live_session_checks;
create policy "Club members can view session checks" on live_session_checks
  for select using (session_id in (select id from live_sessions where club_id = get_my_club_id()));

drop policy if exists "Coach and admin can manage session checks" on live_session_checks;
create policy "Coach and admin can manage session checks" on live_session_checks
  for all
  using (session_id in (select id from live_sessions where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')))
  with check (session_id in (select id from live_sessions where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')));

-- Gamla testsessioner från mars som aldrig avslutades (16 st den 17 nov)
update live_sessions set status = 'ended', ended_at = coalesce(ended_at, started_at)
  where status = 'active' and started_at < '2026-04-01';
