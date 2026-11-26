-- Run with: pnpm db:test
begin;
select plan(9);

-- Synthetic users only (policy PRIV-01).
insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-0000-0000-000000000001', 'match-1@example.test', '{}'),
  ('ffffffff-0000-0000-0000-000000000002', 'match-2@example.test', '{}');
insert into public.jobs (id, source_id, external_id, url, title, dedupe_key) values
  ('f1000000-0000-0000-0000-000000000001', 'jobicy', 'm-1', 'https://example.test/m1',
   'Data Analyst', 'mk1');

set local role authenticated;
set local request.jwt.claims = '{"sub": "ffffffff-0000-0000-0000-000000000001", "role": "authenticated"}';
insert into public.candidates (target_roles, countries) values ('{Data Analyst}', '{AE}');
reset role;
select is((select count(*)::int from public.candidate_match_state
           where user_id = 'ffffffff-0000-0000-0000-000000000001'), 0,
  'no match request before onboarding');

update public.candidates set onboarded_at = now()
  where user_id = 'ffffffff-0000-0000-0000-000000000001';
select isnt((select requested_at from public.candidate_match_state
             where user_id = 'ffffffff-0000-0000-0000-000000000001'), null,
  'finishing onboarding asks for matches');

update public.candidate_match_state set requested_at = null;
update public.candidates set phone = '+971500000000'
  where user_id = 'ffffffff-0000-0000-0000-000000000001';
select is((select requested_at from public.candidate_match_state
           where user_id = 'ffffffff-0000-0000-0000-000000000001'), null,
  'changes that don''t affect matching ask for nothing');
update public.candidates set countries = '{AE,DE}'
  where user_id = 'ffffffff-0000-0000-0000-000000000001';
select isnt((select requested_at from public.candidate_match_state
             where user_id = 'ffffffff-0000-0000-0000-000000000001'), null,
  'changing countries asks for new matches');

-- The matcher (database owner) stores matches.
insert into public.job_matches (user_id, job_id, rank, score, label, reason) values
  ('ffffffff-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   1, 0.72, 'strong', 'Your SQL work fits this analyst role.');

set local role authenticated;
set local request.jwt.claims = '{"sub": "ffffffff-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from public.job_matches), 1, 'candidates read their matches');
select is((select matches from public.candidate_match_state), 0,
  'and whether their matches are being updated');
select throws_ok($$ select embedding from public.candidate_match_state $$, '42501', null,
  'but not their profile embedding');
select throws_ok(
  $$ update public.job_matches set score = 1 $$, '42501', null, 'candidates cannot change matches');

set local request.jwt.claims = '{"sub": "ffffffff-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.job_matches), 0, 'nobody sees another person''s matches');
reset role;

select * from finish();
rollback;
