-- COURTLY: allow the authenticated coach-code RPC to promote its caller only.
-- Apply after 20261123_coach_code_access.sql. A transaction-local flag is set
-- only by this SECURITY DEFINER RPC; ordinary client profile updates stay blocked.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id
     and (new.role is distinct from old.role or new.team_id is distinct from old.team_id)
     and current_setting('courtly.allow_role_change', true) is distinct from 'on' then
    raise exception 'Role and team assignment can only be changed through authorized functions';
  end if;
  return new;
end;
$$;

create or replace function public.enter_coach_mode(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(p_code, '') <> '0000' then return false; end if;
  perform set_config('courtly.allow_role_change', 'on', true);
  update public.profiles set role = 'coach' where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  return true;
end;
$$;
revoke execute on function public.enter_coach_mode(text) from public, anon;
grant execute on function public.enter_coach_mode(text) to authenticated;
