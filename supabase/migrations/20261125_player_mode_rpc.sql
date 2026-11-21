-- COURTLY: allow authenticated users to explicitly enter player mode.
-- This prevents a profile promoted through the coach code from keeping a global
-- coach profile role after selecting player mode. Existing coach team membership
-- remains scoped to that team and is intentionally not removed.
create or replace function public.enter_player_mode()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform set_config('courtly.allow_role_change', 'on', true);
  update public.profiles set role = 'player' where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  return true;
end;
$$;
revoke execute on function public.enter_player_mode() from public, anon;
grant execute on function public.enter_player_mode() to authenticated;
