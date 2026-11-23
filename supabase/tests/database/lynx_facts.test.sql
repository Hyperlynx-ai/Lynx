-- Run with: pnpm db:test
begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'fact-1@example.test', '{}'),
  ('cccccccc-0000-0000-0000-000000000002', 'fact-2@example.test', '{}');
insert into public.cvs (id, user_id, storage_path, file_name, media_type) values
  ('c2000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001/f1234567.pdf', 'f.pdf', 'application/pdf'),
  ('c2000000-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002',
   'cccccccc-0000-0000-0000-000000000002/f1234567.pdf', 'f.pdf', 'application/pdf');
insert into public.cv_versions (id, cv_id, user_id, version, source, data) values
  ('d2000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 1, 'parsed', '{}'),
  ('d2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002',
   'cccccccc-0000-0000-0000-000000000002', 1, 'parsed', '{}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.lynx_facts (category, text, source, cv_version_id)
     values ('skill', 'Go, Python', 'cv', 'd2000000-0000-0000-0000-000000000001') $$,
  'a candidate can add a fact from their own CV');
select lives_ok(
  $$ insert into public.lynx_facts (category, text, source)
     values ('preference', 'Prefers remote-first teams', 'candidate') $$,
  'a candidate can add a fact they told Lynx');
select throws_ok(
  $$ insert into public.lynx_facts (category, text, source, cv_version_id)
     values ('skill', 'x', 'cv', 'd2000000-0000-0000-0000-000000000002') $$,
  '23514', null, 'a CV fact must come from the candidate''s own CV');
select throws_ok(
  $$ insert into public.lynx_facts (category, text, source) values ('skill', 'x', 'cv') $$,
  '23514', null, 'a CV fact needs its CV version');
select throws_ok(
  $$ update public.lynx_facts set user_id = 'cccccccc-0000-0000-0000-000000000002' $$,
  '42501', null, 'facts cannot be moved to another user');

set local request.jwt.claims = '{"sub": "cccccccc-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.lynx_facts), 0, 'facts are private');

reset role;
delete from public.cvs where id = 'c2000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.lynx_facts where user_id = 'cccccccc-0000-0000-0000-000000000001' and source = 'cv'),
  0, 'deleting the CV deletes the facts read from it');
select is(
  (select count(*)::int from public.lynx_facts where user_id = 'cccccccc-0000-0000-0000-000000000001'),
  1, 'facts the candidate told Lynx stay');

select * from finish();
rollback;
