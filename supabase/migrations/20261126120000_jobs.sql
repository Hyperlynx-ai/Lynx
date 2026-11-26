-- Jobs engine (Phase 3, ADR 0011): sources, their runs, and normalized jobs.
-- Written by the ingestion (services/ai, as the database owner); signed-in
-- users read active jobs. Allowed values mirror services/ai/lynx_ai/jobs/.

create table public.job_sources (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) <= 80),
  kind text not null check (kind in ('curated', 'api', 'ats', 'scraper')),
  enabled boolean not null default false,
  -- Source-specific settings (no secrets: keys live in GitHub Actions secrets).
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  -- Attribution or terms notes shown in the admin console.
  notes text check (char_length(notes) <= 500),
  run_requested_at timestamptz,
  last_run_at timestamptz,
  last_status text check (last_status in ('ok', 'failed', 'partial')),
  last_error text check (char_length(last_error) <= 500),
  active_jobs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.job_sources is 'Job sources (adapters in services/ai) with an on/off switch and health.';

create table public.job_runs (
  id bigint generated always as identity primary key,
  source_id text not null references public.job_sources (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'failed', 'partial')),
  fetched integer not null default 0,
  kept integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  expired integer not null default 0,
  error text check (char_length(error) <= 500)
);

create index job_runs_source_time on public.job_runs (source_id, started_at desc);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.job_sources (id) on delete cascade,
  external_id text not null check (char_length(external_id) <= 300),
  url text not null check (char_length(url) <= 2000),
  title text not null check (char_length(title) between 1 and 300),
  company text check (char_length(company) <= 200),
  location text check (char_length(location) <= 300),
  -- ISO 3166-1 alpha-2; null for remote jobs open to many countries.
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  remote boolean not null default false,
  employment_type text check (employment_type in
    ('full_time', 'part_time', 'contract', 'internship', 'scholarship', 'fellowship', 'temporary')),
  seniority text check (seniority in ('entry', 'mid', 'senior')),
  field text check (field in (
    'cybersecurity', 'software', 'data_ai', 'cloud_devops', 'product_project', 'marketing',
    'sales', 'finance', 'hr', 'operations', 'design', 'core_engineering', 'healthcare',
    'customer_support', 'hospitality', 'education', 'other'
  )),
  description text check (char_length(description) <= 20000),
  salary_text text check (char_length(salary_text) <= 200),
  salary_min numeric,
  salary_max numeric,
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),
  posted_at timestamptz,
  deadline date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'expired')),
  expired_at timestamptz,
  -- Posted directly by a partner recruiter on Hyperlynx (Phase 4).
  is_affiliated boolean not null default false,
  -- Same job from several sources: the first one wins, the others point to it.
  dedupe_key text not null check (char_length(dedupe_key) <= 64),
  duplicate_of uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

comment on table public.jobs is 'Normalized postings from every source (ADR 0011).';

-- The feed reads active, non-duplicate jobs, newest first.
create index jobs_feed on public.jobs (posted_at desc nulls last)
  where status = 'active' and duplicate_of is null;
create index jobs_dedupe on public.jobs (dedupe_key) where duplicate_of is null;
create index jobs_country on public.jobs (country) where status = 'active';
create index jobs_source_status on public.jobs (source_id, status);

create trigger job_sources_touch_updated_at
  before update on public.job_sources
  for each row execute function public.touch_updated_at();
create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function public.touch_updated_at();

-- Row-level security: anyone signed in can read sources' names and active
-- jobs; admins see everything about sources and runs (through the API, which
-- checks the role). Nobody writes through the API: ingestion is the owner.
alter table public.job_sources enable row level security;
alter table public.job_runs enable row level security;
alter table public.jobs enable row level security;

create policy "jobs: signed-in users read active jobs"
  on public.jobs for select to authenticated
  using (status = 'active' and duplicate_of is null);

create policy "job_sources: signed-in users read names"
  on public.job_sources for select to authenticated
  using (true);

revoke all on public.job_sources, public.job_runs, public.jobs from anon;
revoke insert, update, delete on public.job_sources, public.job_runs, public.jobs from authenticated;

-- Marks later copies of the same job (same dedupe_key, other source) as
-- duplicates of the earliest active one. Run after each ingestion.
create or replace function public.jobs_resolve_duplicates()
returns integer
language sql
security definer
set search_path = ''
as $$
  with canonical as (
    select distinct on (dedupe_key) dedupe_key, id
    from public.jobs
    where status = 'active'
    order by dedupe_key, first_seen_at, id
  ),
  marked as (
    update public.jobs j
    set duplicate_of = case when j.id = c.id then null else c.id end
    from canonical c
    where j.dedupe_key = c.dedupe_key
      and j.status = 'active'
      and j.duplicate_of is distinct from (case when j.id = c.id then null else c.id end)
    returning 1
  )
  select count(*)::integer from marked;
$$;

revoke execute on function public.jobs_resolve_duplicates() from public, anon, authenticated;

-- The sources we know about. All start switched off; an admin turns them on
-- after the terms check (ADR 0007).
insert into public.job_sources (id, name, kind, notes) values
  ('curated_sheet', 'Hyperlynx curated sheet', 'curated', 'The team''s Google Sheet (Jobs and Opportunities tabs), synced daily. Needs CURATED_SHEET_ID.'),
  ('arbeitnow', 'Arbeitnow', 'api', 'Free public API, Europe-focused. Commercial use: agree a monthly fee with Arbeitnow before launch (KL-26).'),
  ('remoteok', 'RemoteOK', 'api', 'Free public API for remote jobs. Credit Remote OK and link back to its job page (no logo).'),
  ('himalayas', 'Himalayas', 'api', 'Free public API for remote jobs. Credit Himalayas; Apply must use its application link; no resale to aggregators.'),
  ('jobicy', 'Jobicy', 'api', 'Free public API for remote jobs (last 7 days). Credit Jobicy as the source.'),
  ('reed', 'Reed', 'api', 'UK jobs. Needs REED_API_KEY. No published API terms: get Reed''s written permission before commercial launch (KL-26).')
on conflict (id) do nothing;
