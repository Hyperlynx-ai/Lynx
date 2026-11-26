-- The opportunities feed (chunk 3.8, ADR 0011): saved and hidden jobs, and
-- one feed query that runs as the signed-in candidate (row-level security
-- applies, so they only see visible jobs and their own matches and saves).

create table public.job_saves (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  state text not null check (state in ('saved', 'hidden')),
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index job_saves_job on public.job_saves (job_id);

alter table public.job_saves enable row level security;
revoke all on public.job_saves from anon, authenticated;
grant select, insert, update, delete on public.job_saves to authenticated;

create policy "job_saves: candidates read their own"
  on public.job_saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy "job_saves: candidates add their own"
  on public.job_saves for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) = 'candidate');
create policy "job_saves: candidates change their own"
  on public.job_saves for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "job_saves: candidates remove their own"
  on public.job_saves for delete to authenticated
  using (user_id = (select auth.uid()));

-- One page of the feed. Ranked matches come first (by rank), then other jobs
-- newest first. Without a search or filter it stays in the candidate's
-- countries (or remote jobs without a country); scholarships are shown
-- wherever they are, as they are often open to all.
create function public.opportunity_feed(
  p_view text default 'jobs',
  p_query text default null,
  p_country text default null,
  p_field text default null,
  p_remote boolean default false,
  p_saved boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  company text,
  location text,
  country text,
  city text,
  remote boolean,
  employment_type text,
  seniority text,
  field text,
  posted_at timestamptz,
  deadline date,
  url text,
  is_affiliated boolean,
  source_id text,
  source_name text,
  source_kind text,
  match_rank integer,
  match_score real,
  match_label text,
  match_reason text,
  match_reranked boolean,
  saved boolean,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select coalesce(
      (select c.countries from public.candidates c where c.user_id = (select auth.uid())),
      '{}'::text[]
    ) as countries
  ),
  q as (
    -- The search text with LIKE wildcards escaped.
    select nullif(
      replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_'),
      ''
    ) as text
  )
  select
    j.id, j.title, j.company, j.location, j.country, j.city, j.remote, j.employment_type,
    j.seniority, j.field, j.posted_at, j.deadline, j.url, j.is_affiliated,
    j.source_id, s.name, s.kind,
    m.rank, m.score, m.label, m.reason, m.reranked,
    coalesce(sv.state = 'saved', false),
    count(*) over ()
  from public.jobs j
  join public.job_sources s on s.id = j.source_id
  left join public.job_matches m on m.job_id = j.id and m.user_id = (select auth.uid())
  left join public.job_saves sv on sv.job_id = j.id and sv.user_id = (select auth.uid())
  cross join me
  cross join q
  where j.status = 'active'
    and j.duplicate_of is null
    and sv.state is distinct from 'hidden'
    and (not p_saved or sv.state = 'saved')
    and case p_view
      when 'internships' then j.employment_type = 'internship'
      when 'scholarships' then j.employment_type in ('scholarship', 'fellowship')
      else j.employment_type is null
        or j.employment_type not in ('internship', 'scholarship', 'fellowship')
    end
    and (q.text is null
      or j.title ilike '%' || q.text || '%'
      or j.company ilike '%' || q.text || '%')
    and (p_country is null or j.country = p_country)
    and (p_field is null or j.field = p_field)
    and (not p_remote or j.remote)
    and (
      m.rank is not null
      or p_view = 'scholarships'
      or q.text is not null
      or p_country is not null
      or p_saved
      or cardinality(me.countries) = 0
      or j.country = any (me.countries)
      or (j.remote and j.country is null)
    )
  order by
    m.rank nulls last,
    j.is_affiliated desc,
    coalesce(j.posted_at, j.first_seen_at) desc,
    j.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.opportunity_feed(
  text, text, text, text, boolean, boolean, integer, integer
) from public, anon;
grant execute on function public.opportunity_feed(
  text, text, text, text, boolean, boolean, integer, integer
) to authenticated;
