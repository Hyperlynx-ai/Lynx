-- Changing a user's role (roadmap 1.4). Only the server's secret key
-- (service_role) may call this; the owner uses scripts/set-role.mjs.

create or replace function public.set_user_role(target_email text, new_role public.app_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select id into target_id from auth.users where lower(email) = lower(trim(target_email));
  if target_id is null then
    raise exception 'No account with that email' using errcode = 'no_data_found';
  end if;
  update public.profiles set role = new_role where id = target_id;
  return target_id;
end;
$$;

comment on function public.set_user_role(text, public.app_role) is
  'Sets a user''s role by email. Callable only with the secret key (service_role).';

revoke execute on function public.set_user_role(text, public.app_role) from public, anon, authenticated;
grant execute on function public.set_user_role(text, public.app_role) to service_role;
