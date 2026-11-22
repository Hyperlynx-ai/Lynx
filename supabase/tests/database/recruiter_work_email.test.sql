-- Run with: pnpm db:test
begin;
select plan(5);

select ok(public.is_free_email('someone@Gmail.com'), 'gmail is a personal provider');
select ok(not public.is_free_email('hr@acme-recruiting.example'), 'company domains are not');

select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('44444444-4444-4444-4444-444444444444', 'recruiter@gmail.com', '{"role": "recruiter"}') $$,
  '23514', null, 'a recruiter cannot sign up with a personal email');

select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('55555555-5555-5555-5555-555555555555', 'hr@acme-recruiting.example', '{"role": "recruiter"}') $$,
  'a recruiter can sign up with a work email');

select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('66666666-6666-6666-6666-666666666666', 'student@gmail.com', '{}') $$,
  'candidates can use personal email');

select * from finish();
rollback;
