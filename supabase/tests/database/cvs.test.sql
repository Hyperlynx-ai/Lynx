-- Run with: pnpm db:test
begin;
select plan(13);

-- Synthetic users only (policy PRIV-01).
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cand-a@example.test', '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'cand-b@example.test', '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'rec@company.example', '{"role": "recruiter"}');

-- Candidate A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.cvs (id, storage_path, file_name, media_type, size_bytes)
     values ('c0000000-0000-0000-0000-00000000000a',
             'aaaaaaaa-0000-0000-0000-000000000001/one.pdf', 'One.pdf', 'application/pdf', 1000) $$,
  'a candidate can add a CV in their own folder');
select throws_ok(
  $$ insert into public.cvs (storage_path, file_name, media_type)
     values ('aaaaaaaa-0000-0000-0000-000000000002/two.pdf', 'Two.pdf', 'application/pdf') $$,
  '23514', null, 'the file must be in the candidate''s own folder');
select throws_ok(
  $$ insert into public.cvs (storage_path, file_name, media_type)
     values ('aaaaaaaa-0000-0000-0000-000000000001/x.exe', 'x.exe', 'application/x-msdownload') $$,
  '23514', null, 'only PDF and DOCX');
select lives_ok(
  $$ insert into public.cv_versions (cv_id, version, source, data)
     values ('c0000000-0000-0000-0000-00000000000a', 1, 'parsed', '{"basics": {}}') $$,
  'a candidate can add a version of their CV');
select throws_ok(
  $$ update public.cv_versions set data = '{}' where cv_id = 'c0000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'versions cannot be edited');
select lives_ok(
  $$ update public.cvs set status = 'parsed' where id = 'c0000000-0000-0000-0000-00000000000a' $$,
  'a candidate can update the status of their CV');
select throws_ok(
  $$ update public.cvs set storage_path = 'aaaaaaaa-0000-0000-0000-000000000001/other.pdf'
     where id = 'c0000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'the file path cannot change');

-- Candidate B sees nothing of A's, and can't attach a version to A's CV.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.cvs), 0, 'another candidate cannot see the CV');
select is((select count(*)::int from public.cv_versions), 0, 'another candidate cannot see the versions');
select throws_ok(
  $$ insert into public.cv_versions (cv_id, version, source, data)
     values ('c0000000-0000-0000-0000-00000000000a', 2, 'parsed', '{}') $$,
  '23514', null, 'a version must belong to the CV owner');

-- Recruiters can't add CVs (they aren't candidates).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.cvs (storage_path, file_name, media_type)
     values ('aaaaaaaa-0000-0000-0000-000000000003/cv.pdf', 'cv.pdf', 'application/pdf') $$,
  '42501', null, 'a recruiter cannot add a CV');

-- Anonymous visitors see nothing.
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.cvs $$, '42501', null, 'anon cannot read cvs');
reset role;

-- Deleting the account removes the CVs and versions.
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.cv_versions where cv_id = 'c0000000-0000-0000-0000-00000000000a'),
  0, 'account deletion removes CV versions');

select * from finish();
rollback;
