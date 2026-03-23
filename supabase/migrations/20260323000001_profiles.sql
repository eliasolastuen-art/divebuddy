create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('coach', 'athlete')) default 'athlete',
  created_at timestamp with time zone default now()
);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can only read their own profile
create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);
