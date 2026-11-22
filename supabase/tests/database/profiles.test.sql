-- Run with: pnpm supabase test db   (needs the local stack: pnpm supabase start)
begin;
select plan(8);

-- Synthetic users only (policy PRIV-01).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'candidate@example.test', '{"full_name": "Test Candidate"}'),
  ('22222222-2222-2222-2222-222222222222', 'recruiter@example.test', '{"role": "recruiter"}'),
  ('33333333-3333-3333-3333-333333333333', 'sneaky@example.test', '{"role": "admin"}');

select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'candidate', 'sign-up defaults to the candidate role');
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Test Candidate', 'sign-up copies the name');
select is(
  (select role::text from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'recruiter', 'sign-up accepts the recruiter role');
select is(
  (select role::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'candidate', 'sign-up never grants the admin role');

-- Act as the candidate.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select is(public.my_role()::text, 'candidate', 'my_role() returns the caller''s role');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'a user cannot change their own role');
select lives_ok(
  $$ update public.profiles set full_name = 'Renamed' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a user can change their own name');

select * from finish();
rollback;
