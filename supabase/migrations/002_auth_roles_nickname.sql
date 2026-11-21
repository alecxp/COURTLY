-- COURTLY account onboarding: nickname and requested player/coach role.
-- Coach accounts remain without team permissions until they are assigned to a team.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), 'player_' || left(replace(new.id::text, '-', ''), 8)),
    case when new.raw_user_meta_data->>'requested_role' = 'coach' then 'coach' else 'player' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- Ensure nickname length and unique index are present even on existing installations.
create unique index if not exists profiles_nickname_unique_idx on public.profiles (lower(nickname));
