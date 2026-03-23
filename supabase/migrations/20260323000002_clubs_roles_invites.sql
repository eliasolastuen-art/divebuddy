-- Clubs table
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Seed club
insert into clubs (name) values ('Växjö Simhopp');

-- Add club_id to profiles
alter table profiles add column if not exists club_id uuid references clubs(id);

-- Multi-role table
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'coach', 'athlete')),
  unique (profile_id, role)
);

alter table user_roles enable row level security;

create policy "Users can view own roles"
  on user_roles for select using (auth.uid() = profile_id);

-- Invites table
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  club_id uuid references clubs(id),
  roles text[] not null,
  created_by uuid references profiles(id),
  accepted boolean default false,
  created_at timestamptz default now()
);

alter table invites enable row level security;

create policy "Anyone can read invites by email"
  on invites for select using (true);

create policy "Authenticated users can insert invites"
  on invites for insert with check (auth.uid() is not null);

create policy "Authenticated users can update invites"
  on invites for update using (auth.uid() is not null);
