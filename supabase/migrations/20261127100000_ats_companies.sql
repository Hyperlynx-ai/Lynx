-- Public company job boards (chunk 3.5, ADR 0011): an admin-managed list of
-- companies per applicant tracking system. Seeded with employers whose
-- boards answered with live jobs on 2026-11-26 (Workable: none found).

create table public.ats_companies (
  id uuid primary key default gen_random_uuid(),
  ats text not null check (ats in ('greenhouse', 'lever', 'ashby', 'smartrecruiters', 'recruitee')),
  slug text not null check (slug ~ '^[A-Za-z0-9_.-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 120),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ats, slug)
);

comment on table public.ats_companies is
  'Companies whose public job boards are ingested (one ATS source per ats).';

create trigger ats_companies_touch_updated_at
  before update on public.ats_companies
  for each row execute function public.touch_updated_at();

-- Managed by admins through the API (secret key); not readable by users.
alter table public.ats_companies enable row level security;
revoke all on public.ats_companies from anon, authenticated;

insert into public.ats_companies (ats, slug, name) values
  ('greenhouse', 'databricks', 'Databricks'),
  ('greenhouse', 'stripe', 'Stripe'),
  ('greenhouse', 'anthropic', 'Anthropic'),
  ('greenhouse', 'cloudflare', 'Cloudflare'),
  ('greenhouse', 'mongodb', 'MongoDB'),
  ('greenhouse', 'datadog', 'Datadog'),
  ('greenhouse', 'elastic', 'Elastic'),
  ('greenhouse', 'okta', 'Okta'),
  ('greenhouse', 'hellofresh', 'HelloFresh'),
  ('greenhouse', 'samsara', 'Samsara'),
  ('greenhouse', 'toast', 'Toast'),
  ('greenhouse', 'celonis', 'Celonis'),
  ('greenhouse', 'coinbase', 'Coinbase'),
  ('greenhouse', 'gitlab', 'GitLab'),
  ('greenhouse', 'adyen', 'Adyen'),
  ('greenhouse', 'airbnb', 'Airbnb'),
  ('greenhouse', 'figma', 'Figma'),
  ('greenhouse', 'intercom', 'Intercom'),
  ('greenhouse', 'twilio', 'Twilio'),
  ('greenhouse', 'monzo', 'Monzo'),
  ('greenhouse', 'duolingo', 'Duolingo'),
  ('greenhouse', 'dropbox', 'Dropbox'),
  ('greenhouse', 'contentful', 'Contentful'),
  ('greenhouse', 'truecaller', 'Truecaller'),
  ('greenhouse', 'n26', 'N26'),
  ('greenhouse', 'trivago', 'trivago'),
  ('greenhouse', 'wise', 'Wise'),
  ('greenhouse', 'groww', 'Groww'),
  ('greenhouse', 'careem', 'Careem'),
  ('greenhouse', 'airtable', 'Airtable'),
  ('lever', 'palantir', 'Palantir'),
  ('lever', 'meesho', 'Meesho'),
  ('lever', 'zeta', 'Zeta'),
  ('lever', 'pocketfm', 'Pocket FM'),
  ('lever', 'fampay', 'FamPay'),
  ('lever', 'cred', 'CRED'),
  ('ashby', 'openai', 'OpenAI'),
  ('ashby', 'airwallex', 'Airwallex'),
  ('ashby', 'clickhouse', 'ClickHouse'),
  ('ashby', 'ramp', 'Ramp'),
  ('ashby', 'notion', 'Notion'),
  ('ashby', 'perplexity', 'Perplexity'),
  ('ashby', 'cohere', 'Cohere'),
  ('ashby', 'elevenlabs', 'ElevenLabs'),
  ('ashby', 'supabase', 'Supabase'),
  ('ashby', 'n8n', 'n8n'),
  ('ashby', 'replit', 'Replit'),
  ('ashby', 'sarvam', 'Sarvam AI'),
  ('ashby', 'linear', 'Linear'),
  ('ashby', 'synthesia', 'Synthesia'),
  ('ashby', 'multiverse', 'Multiverse'),
  ('ashby', 'posthog', 'PostHog'),
  ('smartrecruiters', 'BoschGroup', 'Bosch'),
  ('smartrecruiters', 'ServiceNow', 'ServiceNow'),
  ('smartrecruiters', 'DeliveryHero', 'Delivery Hero'),
  ('smartrecruiters', 'Equinox', 'Equinox'),
  ('smartrecruiters', 'Accor', 'Accor'),
  ('smartrecruiters', 'Experian', 'Experian'),
  ('smartrecruiters', 'Ubisoft2', 'Ubisoft'),
  ('smartrecruiters', 'LinkedIn3', 'LinkedIn'),
  ('smartrecruiters', 'Freshworks', 'Freshworks'),
  ('smartrecruiters', 'Canva', 'Canva'),
  ('recruitee', 'bunq', 'bunq')
on conflict (ats, slug) do nothing;

-- One source per ATS. Switched on: public careers-page APIs, terms checked.
insert into public.job_sources (id, name, kind, enabled, notes) values
  ('greenhouse', 'Greenhouse company boards', 'ats', true, 'Public careers-page API. Companies are listed in Admin -> Companies; each job links to the company''s own posting.'),
  ('lever', 'Lever company boards', 'ats', true, 'Public careers-page API. Companies are listed in Admin -> Companies; each job links to the company''s own posting.'),
  ('ashby', 'Ashby company boards', 'ats', true, 'Public careers-page API. Companies are listed in Admin -> Companies; each job links to the company''s own posting.'),
  ('smartrecruiters', 'SmartRecruiters company boards', 'ats', true, 'Public careers-page API. Companies are listed in Admin -> Companies; each job links to the company''s own posting.'),
  ('recruitee', 'Recruitee company boards', 'ats', true, 'Public careers-page API. Companies are listed in Admin -> Companies; each job links to the company''s own posting.')
on conflict (id) do nothing;
