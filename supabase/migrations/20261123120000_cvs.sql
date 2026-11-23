-- Candidate CVs (ADR 0010). The file lives in the private `cvs` bucket at
-- cvs/<user id>/<file>; this table tracks it, and cv_versions holds the
-- structured content (the parsed original, then AI and candidate edits).

create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 255),
  file_name text not null check (char_length(file_name) between 1 and 255),
  media_type text not null check (media_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  size_bytes integer check (size_bytes between 1 and 10485760),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'parsing', 'parsed', 'failed', 'not_a_cv')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The file must sit in the owner's own folder.
  constraint cvs_path_in_own_folder check (storage_path like user_id::text || '/%')
);

comment on table public.cvs is 'Uploaded CV files (PDF or DOCX) in the private cvs bucket.';

create index cvs_user_time on public.cvs (user_id, created_at desc);

create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cvs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version integer not null check (version >= 1),
  source text not null check (source in ('parsed', 'ai_edit', 'candidate_edit', 'tailored')),
  label text check (char_length(label) <= 120),
  -- CvData (services/ai/lynx_ai/cv.py, packages/shared/src/cv.ts).
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144),
  created_at timestamptz not null default now(),
  unique (cv_id, version)
);

comment on table public.cv_versions is
  'Structured CV content, one row per version. Versions are never edited: a change adds a version.';

create index cv_versions_cv on public.cv_versions (cv_id, version desc);
create index cv_versions_user on public.cv_versions (user_id);

-- A version belongs to the same person as its CV.
create or replace function public.cv_versions_same_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cvs where id = new.cv_id and user_id = new.user_id) then
    raise exception 'cv_versions.user_id must match the CV owner' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cv_versions_same_owner
  before insert on public.cv_versions
  for each row execute function public.cv_versions_same_owner();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cvs_touch_updated_at
  before update on public.cvs
  for each row execute function public.touch_updated_at();

-- Row-level security: candidates manage only their own CVs. Recruiter access
-- comes later (Phase 5) and will depend on the candidate's consent.
alter table public.cvs enable row level security;
alter table public.cv_versions enable row level security;

create policy "cvs: candidates read own"
  on public.cvs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "cvs: candidates add own"
  on public.cvs for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.my_role()) = 'candidate');

create policy "cvs: candidates update own"
  on public.cvs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "cvs: candidates delete own"
  on public.cvs for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "cv_versions: candidates read own"
  on public.cv_versions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "cv_versions: candidates add own"
  on public.cv_versions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "cv_versions: candidates delete own"
  on public.cv_versions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Only these columns can change after upload; versions can't be edited.
revoke all on public.cvs, public.cv_versions from anon;
revoke update on public.cvs from authenticated;
grant update (file_name, status) on public.cvs to authenticated;
revoke update on public.cv_versions from authenticated;
revoke execute on function public.cv_versions_same_owner() from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;
