-- COURTLY temporary coach-code authorization (code 0000 for the current MVP).
-- This validates the code server-side instead of trusting a browser-only role flag.
-- Replace the temporary code before public launch.

create or replace function public.enter_coach_mode(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_code, '') <> '0000' then
    return false;
  end if;

  update public.profiles
     set role = 'coach'
   where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return true;
end;
$$;

revoke execute on function public.enter_coach_mode(text) from public, anon;
grant execute on function public.enter_coach_mode(text) to authenticated;
