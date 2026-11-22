-- Profiles: one row per user with their role, created automatically at sign-up.
-- Policies: DB-05 (RLS on every table), SEC-02 (permissions on the server).

-- Vector search for AI matching (used from Phase 3).
create extension if not exists vector with schema extensions;

create type public.app_role as enum ('candidate', 'recruiter', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'candidate',
  full_name text check (char_length(full_name) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user. role is chosen at sign-up (candidate or recruiter) and only changed by the server or an admin.';

alter table public.profiles enable row level security;

-- Users can read and update only their own profile.
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level privileges: users may change their name, never their role.
-- Inserts happen only through the sign-up trigger; deletes cascade from auth.users.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up. Only 'candidate' or 'recruiter' can
-- be requested through sign-up metadata; 'admin' is never accepted here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  display_name text := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when requested_role = 'recruiter' then 'recruiter'::public.app_role
         else 'candidate'::public.app_role end,
    nullif(left(display_name, 200), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The signed-in user's role, for use in RLS policies and the API.
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.my_role() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
