-- Job matching (chunk 3.7, ADR 0011).
--
-- Jobs and candidates get embeddings (NVIDIA nemotron-3.5-embed-1b, 768
-- dimensions, stored as half precision to save space). The matcher (the
-- ingestion workflow, as the database owner) scores jobs for each candidate,
-- has the AI re-rank the top ones with a one-line reason, and keeps the top
-- 100 in job_matches. Candidates only read their own matches.

alter table public.jobs add column embedding extensions.halfvec(768);

comment on column public.jobs.embedding is
  'Text embedding of the job (title, company, place, field, description start).';

-- Matching state per candidate: written by the matcher and by the trigger below.
create table public.candidate_match_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Hash of the profile text that was embedded: re-embed only when it changes.
  profile_hash text,
  embedding extensions.halfvec(768),
  -- Set when the profile or matching CV changes; cleared when matched.
  requested_at timestamptz,
  matched_at timestamptz,
  matches integer not null default 0,
  last_error text check (char_length(last_error) <= 300),
  updated_at timestamptz not null default now()
);

create trigger candidate_match_state_touch_updated_at
  before update on public.candidate_match_state
  for each row execute function public.touch_updated_at();

alter table public.candidate_match_state enable row level security;
revoke all on public.candidate_match_state from anon, authenticated;
-- Candidates may see whether their matches are being updated (not the embedding).
grant select (user_id, requested_at, matched_at, matches) on public.candidate_match_state
  to authenticated;
create policy "candidate_match_state: candidates read their own"
  on public.candidate_match_state for select to authenticated
  using (user_id = (select auth.uid()));

create table public.job_matches (
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  rank integer not null check (rank >= 1),
  score real not null check (score between 0 and 1),
  label text check (label in ('strong', 'good', 'partial')),
  reason text check (char_length(reason) <= 300),
  -- The AI re-ranked this match and wrote the reason (else the reason is a template).
  reranked boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index job_matches_user_rank on public.job_matches (user_id, rank);
create index job_matches_job on public.job_matches (job_id);

alter table public.job_matches enable row level security;
revoke all on public.job_matches from anon, authenticated;
grant select on public.job_matches to authenticated;
create policy "job_matches: candidates read their own"
  on public.job_matches for select to authenticated
  using (user_id = (select auth.uid()));

-- Ask for new matches when an onboarded candidate's matching inputs change.
create function public.request_job_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarded_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and (
    new.target_roles, new.countries, new.experience_level, new.education_level,
    new.pathways, new.matching_cv_version_id, new.onboarded_at
  ) is not distinct from (
    old.target_roles, old.countries, old.experience_level, old.education_level,
    old.pathways, old.matching_cv_version_id, old.onboarded_at
  ) then
    return new;
  end if;
  insert into public.candidate_match_state (user_id, requested_at)
  values (new.user_id, now())
  on conflict (user_id) do update set requested_at = now();
  return new;
end;
$$;

revoke execute on function public.request_job_matches() from public, anon, authenticated;

create trigger candidates_request_job_matches
  after insert or update on public.candidates
  for each row execute function public.request_job_matches();
