-- "What Lynx knows about you" (chunk 2.4, ADR 0010): facts about a candidate,
-- each with its source. The candidate can see, edit and delete every one.

create table public.lynx_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in (
    'summary', 'experience', 'education', 'skill', 'project', 'certification',
    'language', 'achievement', 'preference', 'goal', 'personal', 'other'
  )),
  text text not null check (char_length(text) between 1 and 300),
  -- cv: read from a CV; candidate: told or corrected by the candidate;
  -- interview / chat: later phases.
  source text not null check (source in ('cv', 'interview', 'chat', 'candidate')),
  -- For CV facts: the CV version they came from. Deleting the CV deletes them.
  cv_version_id uuid references public.cv_versions (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lynx_facts_cv_source check ((source = 'cv') = (cv_version_id is not null))
);

comment on table public.lynx_facts is
  'What Lynx knows about a candidate, with the source of each fact. Candidates control all of it.';

create index lynx_facts_user on public.lynx_facts (user_id, category, created_at);
create index lynx_facts_cv_version on public.lynx_facts (cv_version_id);

create trigger lynx_facts_touch_updated_at
  before update on public.lynx_facts
  for each row execute function public.touch_updated_at();

alter table public.lynx_facts enable row level security;

create policy "lynx_facts: read own"
  on public.lynx_facts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "lynx_facts: add own"
  on public.lynx_facts for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) = 'candidate');

create policy "lynx_facts: edit own"
  on public.lynx_facts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "lynx_facts: delete own"
  on public.lynx_facts for delete to authenticated
  using (user_id = (select auth.uid()));

-- A CV fact must point at the candidate's own CV version.
create or replace function public.lynx_facts_own_cv_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cv_version_id is not null and not exists (
    select 1 from public.cv_versions where id = new.cv_version_id and user_id = new.user_id
  ) then
    raise exception 'cv_version_id must be the candidate''s own' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger lynx_facts_own_cv_version
  before insert or update of cv_version_id on public.lynx_facts
  for each row execute function public.lynx_facts_own_cv_version();

revoke all on public.lynx_facts from anon;
revoke update on public.lynx_facts from authenticated;
grant update (category, text, source, cv_version_id) on public.lynx_facts to authenticated;
revoke execute on function public.lynx_facts_own_cv_version() from anon, authenticated;
