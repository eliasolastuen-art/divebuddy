alter table invites
  add column if not exists athlete_id uuid references athletes(id),
  add column if not exists token      text;
