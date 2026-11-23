-- Candidate profiles from onboarding, and the consent log (chunk 2.3, ADR 0010).
-- Allowed values mirror packages/shared/src/candidate.ts.

create table public.candidates (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  target_roles text[] not null default '{}'
    check (cardinality(target_roles) <= 5),
  countries text[] not null default '{}'
    check (cardinality(countries) <= 10 and countries <@ array[
      'AE','SA','QA','OM','KW','BH','DE','NL','IE','GB','FR','BE','LU','AT','CH','PL','CZ',
      'SE','FI','DK','NO','IT','ES','PT','EE','MT','CY','SG','MY','JP','AU','NZ','CA','US','IN'
    ]::text[]),
  experience_level text check (experience_level in
    ('student', 'fresher', 'junior', 'mid', 'senior', 'lead')),
  education_level text check (education_level in
    ('high_school', 'diploma', 'bachelors', 'masters', 'doctorate', 'other')),
  pathways text[] not null default '{}'
    check (pathways <@ array['internship', 'first_job', 'job_switch', 'higher_education']::text[]),
  visa_status text check (visa_status in ('needs_sponsorship', 'has_permit', 'citizen', 'not_sure')),
  current_location text check (char_length(current_location) <= 120),
  phone text check (char_length(phone) <= 20),
  phone_is_whatsapp boolean not null default false,
  -- What the candidate agreed to (the history is in public.consents).
  visible_to_recruiters boolean not null default false,
  show_contact_to_recruiters boolean not null default false,
  job_alerts boolean not null default false,
  newsletter boolean not null default false,
  -- The CV version used for matching (chosen in the CV editor, chunk 2.5).
  matching_cv_version_id uuid references public.cv_versions (id) on delete set null,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.candidates is
  'One row per candidate: onboarding answers, visibility and email choices.';

create trigger candidates_touch_updated_at
  before update on public.candidates
  for each row execute function public.touch_updated_at();

-- Append-only record of every consent given or withdrawn (policy PRIV-03).
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in
    ('recruiter_visibility', 'recruiter_contact', 'job_alerts', 'newsletter')),
  granted boolean not null,
  text_version text not null check (char_length(text_version) <= 32),
  created_at timestamptz not null default now()
);

comment on table public.consents is
  'Append-only: what a user agreed to or withdrew, with the wording version, and when.';

create index consents_user_kind_time on public.consents (user_id, kind, created_at desc);

-- Row-level security: each candidate manages only their own rows.
alter table public.candidates enable row level security;
alter table public.consents enable row level security;

create policy "candidates: read own"
  on public.candidates for select to authenticated
  using (user_id = (select auth.uid()));

create policy "candidates: add own"
  on public.candidates for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) = 'candidate');

create policy "candidates: update own"
  on public.candidates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "consents: read own"
  on public.consents for select to authenticated
  using (user_id = (select auth.uid()));

create policy "consents: add own"
  on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- The matching CV must be one of the candidate's own versions.
create or replace function public.candidates_own_matching_cv()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.matching_cv_version_id is not null and not exists (
    select 1 from public.cv_versions
    where id = new.matching_cv_version_id and user_id = new.user_id
  ) then
    raise exception 'matching CV must belong to the candidate' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger candidates_own_matching_cv
  before insert or update of matching_cv_version_id on public.candidates
  for each row execute function public.candidates_own_matching_cv();

revoke all on public.candidates, public.consents from anon;
revoke update, delete on public.consents from authenticated;
revoke execute on function public.candidates_own_matching_cv() from anon, authenticated;
