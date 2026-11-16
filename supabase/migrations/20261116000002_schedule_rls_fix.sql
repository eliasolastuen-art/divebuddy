-- Bryt RLS-rekursionen schedule_sessions ↔ schedule_session_groups/_coaches:
-- kopplingstabellerna slår upp passets klubb via en security definer-funktion.

create or replace function schedule_session_club_id(sid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from schedule_sessions where id = sid
$$;

drop policy "Staff can manage session groups" on schedule_session_groups;
create policy "Staff can manage session groups" on schedule_session_groups for all
  using (schedule_session_club_id(session_id) = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (schedule_session_club_id(session_id) = get_my_club_id() and (has_role('coach') or has_role('admin')));

drop policy "Staff can manage session coaches" on schedule_session_coaches;
create policy "Staff can manage session coaches" on schedule_session_coaches for all
  using (schedule_session_club_id(session_id) = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (schedule_session_club_id(session_id) = get_my_club_id() and (has_role('coach') or has_role('admin')));
