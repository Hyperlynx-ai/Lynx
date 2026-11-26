-- Run with: pnpm db:test
begin;
select plan(8);

-- Synthetic users only (policy PRIV-01).
insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'feed-1@example.test', '{}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'feed-2@example.test', '{}');
insert into public.candidates (user_id, target_roles, countries) values
  ('eeeeeeee-0000-0000-0000-000000000001', '{Analyst}', '{NL}');
insert into public.jobs (id, source_id, external_id, url, title, company, country, employment_type, dedupe_key) values
  ('e9000000-0000-0000-0000-000000000001', 'jobicy', 'f-1', 'https://example.test/f1', 'Feedtest Analyst', 'Acme', 'NL', 'full_time', 'fk1'),
  ('e9000000-0000-0000-0000-000000000002', 'jobicy', 'f-2', 'https://example.test/f2', 'Feedtest Intern', 'Acme', 'NL', 'internship', 'fk2'),
  ('e9000000-0000-0000-0000-000000000003', 'jobicy', 'f-3', 'https://example.test/f3', 'Feedtest Chef', 'Beta', 'JP', 'full_time', 'fk3'),
  ('e9000000-0000-0000-0000-000000000004', 'jobicy', 'f-4', 'https://example.test/f4', 'Feedtest Scholarship', 'Uni', 'JP', 'scholarship', 'fk4');
insert into public.job_matches (user_id, job_id, rank, score, label, reason) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-000000000001', 1, 0.8, 'strong', 'Fits.');

set local role authenticated;
set local request.jwt.claims = '{"sub": "eeeeeeee-0000-0000-0000-000000000001", "role": "authenticated"}';

select is(
  (select array_agg(title order by match_rank nulls last) from public.opportunity_feed('jobs', 'feedtest')),
  array['Feedtest Analyst', 'Feedtest Chef'],
  'a search finds jobs anywhere, ranked matches first');
select is(
  (select array_agg(title) from public.opportunity_feed('jobs') where title like 'Feedtest%'),
  array['Feedtest Analyst'],
  'without a search it stays in the candidate''s countries');
select is(
  (select match_label from public.opportunity_feed('jobs', 'feedtest analyst')), 'strong',
  'with the candidate''s match');
select is(
  (select array_agg(title) from public.opportunity_feed('internships', 'feedtest')),
  array['Feedtest Intern'], 'internships have their own view');
select is(
  (select array_agg(title) from public.opportunity_feed('scholarships') where title like 'Feedtest%'),
  array['Feedtest Scholarship'], 'scholarships show wherever they are');

insert into public.job_saves (job_id, state) values
  ('e9000000-0000-0000-0000-000000000001', 'saved'),
  ('e9000000-0000-0000-0000-000000000003', 'hidden');
select is(
  (select array_agg(title) from public.opportunity_feed('jobs', 'feedtest', p_saved => true)),
  array['Feedtest Analyst'], 'saved jobs can be listed');
select is(
  (select count(*)::int from public.opportunity_feed('jobs', 'feedtest chef')), 0,
  'hidden jobs leave the feed');

set local request.jwt.claims = '{"sub": "eeeeeeee-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.job_saves), 0, 'saves are private');
reset role;

select * from finish();
rollback;
