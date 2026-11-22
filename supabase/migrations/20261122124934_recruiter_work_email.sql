-- Recruiters must sign up with a work email (roadmap 1.2).
-- The list must match packages/shared/src/free-email-domains.ts (a test checks).

create table public.free_email_domains (
  domain text primary key check (domain = lower(domain))
);

comment on table public.free_email_domains is
  'Personal email providers that recruiter accounts may not use.';

-- Readable by nobody through the API; used by the sign-up trigger and the server.
alter table public.free_email_domains enable row level security;
revoke all on public.free_email_domains from anon, authenticated;

insert into public.free_email_domains (domain) values
  ('aol.com'),
  ('gmail.com'),
  ('gmx.com'),
  ('gmx.de'),
  ('gmx.net'),
  ('googlemail.com'),
  ('hey.com'),
  ('hotmail.co.uk'),
  ('hotmail.com'),
  ('hotmail.fr'),
  ('icloud.com'),
  ('live.com'),
  ('mac.com'),
  ('mail.com'),
  ('mail.ru'),
  ('me.com'),
  ('msn.com'),
  ('outlook.com'),
  ('outlook.in'),
  ('pm.me'),
  ('proton.me'),
  ('protonmail.com'),
  ('qq.com'),
  ('rediffmail.com'),
  ('tutanota.com'),
  ('web.de'),
  ('yahoo.co.in'),
  ('yahoo.co.uk'),
  ('yahoo.com'),
  ('yahoo.in'),
  ('yandex.com'),
  ('yandex.ru'),
  ('zohomail.com');

-- True when the email belongs to a personal provider.
create or replace function public.is_free_email(email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.free_email_domains
    where domain = lower(split_part(email, '@', 2))
  );
$$;

revoke execute on function public.is_free_email(text) from public, anon, authenticated;

-- Sign-up trigger: same as before, but a recruiter sign-up with a personal
-- email is refused (the whole sign-up fails, so no account is created).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  display_name text := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );
begin
  if requested_role = 'recruiter' and public.is_free_email(new.email) then
    raise exception 'Recruiter accounts need a work email address'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when requested_role = 'recruiter' then 'recruiter'::public.app_role
         else 'candidate'::public.app_role end,
    nullif(left(display_name, 200), '')
  );
  return new;
end;
$$;
