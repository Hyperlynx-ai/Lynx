-- Run with: pnpm db:test
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data)
values ('77777777-7777-7777-7777-777777777777', 'owner@example.test', '{}');

-- Signed-in users can't call it.
set local role authenticated;
set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated"}';
select throws_ok(
  $$ select public.set_user_role('owner@example.test', 'admin') $$,
  '42501', null, 'a signed-in user cannot grant themselves admin');
reset role;

-- The server (service_role) can.
set local role service_role;
select is(
  public.set_user_role('OWNER@example.test', 'admin'),
  '77777777-7777-7777-7777-777777777777'::uuid,
  'service_role can set a role (email is case-insensitive)');
reset role;
select is(
  (select role::text from public.profiles where id = '77777777-7777-7777-7777-777777777777'),
  'admin', 'the profile now has the admin role');

set local role service_role;
select throws_ok(
  $$ select public.set_user_role('nobody@example.test', 'admin') $$,
  'P0002', null, 'unknown emails are reported');
reset role;

select * from finish();
rollback;
