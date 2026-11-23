-- Every AI call, for cost control, caps and debugging (policy AI-07).
-- Never stores prompts, outputs or any personal data: only counts and timings.

create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  task text not null check (char_length(task) <= 64),
  model text check (char_length(model) <= 128),
  status text not null check (status in ('ok', 'error', 'capped')),
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  cost_usd numeric(12, 6),
  error_code text check (char_length(error_code) <= 64),
  created_at timestamptz not null default now()
);

comment on table public.ai_calls is
  'One row per AI call (no personal data). Written by apps/api with the secret key; not readable by users.';

create index ai_calls_user_task_time on public.ai_calls (user_id, task, created_at desc);
create index ai_calls_time on public.ai_calls (created_at desc);

-- Server-only: row-level security on, and no policies for users.
alter table public.ai_calls enable row level security;
revoke all on public.ai_calls from anon, authenticated;
