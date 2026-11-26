-- Run with: pnpm db:test
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'jobs-cand@example.test', '{}');

-- As the ingestion (database owner): two sources bring the same job.
insert into public.jobs (id, source_id, external_id, url, title, company, country, dedupe_key, first_seen_at) values
  ('e1000000-0000-0000-0000-000000000001', 'arbeitnow', 'a-1', 'https://example.test/a1', 'Backend Engineer', 'Acme', 'DE', 'k1', now() - interval '2 days'),
  ('e1000000-0000-0000-0000-000000000002', 'remotive', 'r-9', 'https://example.test/r9', 'Backend Engineer', 'Acme', 'DE', 'k1', now() - interval '1 day'),
  ('e1000000-0000-0000-0000-000000000003', 'remotive', 'r-10', 'https://example.test/r10', 'Data Analyst', 'Beta', 'AE', 'k2', now());
insert into public.jobs (source_id, external_id, url, title, dedupe_key, status) values
  ('jobicy', 'old-1', 'https://example.test/old', 'Old job', 'k3', 'expired');

select is(public.jobs_resolve_duplicates(), 1, 'marks the later copy as a duplicate');
select is(
  (select duplicate_of from public.jobs where id = 'e1000000-0000-0000-0000-000000000002'),
  'e1000000-0000-0000-0000-000000000001'::uuid, 'the earliest copy wins');
select is(public.jobs_resolve_duplicates(), 0, 'running it again changes nothing');

select throws_ok(
  $$ insert into public.jobs (source_id, external_id, url, title, dedupe_key, field)
     values ('jobicy', 'x', 'https://example.test/x', 'X', 'k9', 'astrology') $$,
  '23514', null, 'only known fields of work');

-- A signed-in candidate sees active, non-duplicate jobs only, and can't write.
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from public.jobs), 2, 'candidates see active, non-duplicate jobs');
select is((select count(*)::int from public.job_sources) > 5, true, 'candidates can read source names');
select throws_ok(
  $$ insert into public.jobs (source_id, external_id, url, title, dedupe_key)
     values ('jobicy', 'y', 'https://example.test/y', 'Y', 'k8') $$,
  '42501', null, 'candidates cannot add jobs');
select throws_ok(
  $$ update public.job_sources set enabled = true $$,
  '42501', null, 'candidates cannot switch sources');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.jobs $$, '42501', null, 'visitors who are not signed in see no jobs');
reset role;

select * from finish();
rollback;
