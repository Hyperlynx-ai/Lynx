-- Run with: pnpm db:test
begin;
select plan(10);

-- Synthetic users only (policy PRIV-01).
insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'cand-1@example.test', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'cand-2@example.test', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'rec-1@company.example', '{"role": "recruiter"}');
insert into public.cvs (id, user_id, storage_path, file_name, media_type) values
  ('c1000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000002/x1234567.pdf', 'x.pdf', 'application/pdf');
insert into public.cv_versions (id, cv_id, user_id, version, source, data) values
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000002', 1, 'parsed', '{}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "bbbbbbbb-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.candidates (target_roles, countries, pathways, experience_level)
     values ('{Nurse}', '{AE,DE}', '{job_switch}', 'mid') $$,
  'a candidate can save their profile');
select throws_ok(
  $$ update public.candidates set countries = '{XX}' $$,
  '23514', null, 'only listed countries');
select throws_ok(
  $$ update public.candidates set pathways = '{astronaut}' $$,
  '23514', null, 'only listed pathways');
select throws_ok(
  $$ update public.candidates set matching_cv_version_id = 'd1000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'the matching CV must be the candidate''s own');
select lives_ok(
  $$ insert into public.consents (kind, granted, text_version) values ('job_alerts', true, 'v1') $$,
  'a candidate can record a consent');
select throws_ok(
  $$ update public.consents set granted = false $$,
  '42501', null, 'consents are append-only');

-- Another candidate sees nothing.
set local request.jwt.claims = '{"sub": "bbbbbbbb-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.candidates), 0, 'profiles are private');
select is((select count(*)::int from public.consents), 0, 'consents are private');

-- Recruiters can't create a candidate profile.
set local request.jwt.claims = '{"sub": "bbbbbbbb-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.candidates (target_roles) values ('{x}') $$,
  '42501', null, 'a recruiter cannot create a candidate profile');

reset role;
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.consents where user_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0, 'account deletion removes consents');

select * from finish();
rollback;
