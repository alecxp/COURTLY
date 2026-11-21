-- COURTLY migration 001: tighten permissions before connecting real users.
-- Run in the Supabase SQL Editor after schema.sql.


-- Prevent users from granting themselves privileged roles or moving teams via profile updates.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and (new.role is distinct from old.role or new.team_id is distinct from old.team_id) then
    raise exception 'Role and team assignment can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.is_team_member(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.team_id = target_team
  );
$$;


create or replace function public.is_team_coach(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.team_id = target_team and p.role in ('coach','admin')
  );
$$;


-- Replace overly broad initial policies with team-scoped policies.
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles visible to same team" on public.profiles
for select to authenticated
using (team_id is not null and public.is_team_member(team_id) or id = auth.uid());


drop policy if exists "clubs read authenticated" on public.clubs;
create policy "clubs read for team members" on public.clubs
for select to authenticated
using (exists (select 1 from public.teams t where t.club_id = clubs.id and public.is_team_member(t.id)));

drop policy if exists "teams read authenticated" on public.teams;
create policy "teams read same team" on public.teams
for select to authenticated using (public.is_team_member(id));

drop policy if exists "events read authenticated" on public.events;
create policy "events read same team" on public.events
for select to authenticated using (public.is_team_member(team_id));
create policy "coach create events" on public.events
for insert to authenticated with check (public.is_team_coach(team_id) and created_by = auth.uid());
create policy "coach update events" on public.events
for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
create policy "coach delete events" on public.events
for delete to authenticated using (public.is_team_coach(team_id));


drop policy if exists "responses read authenticated" on public.event_responses;
create policy "responses read same team" on public.event_responses
for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_member(e.team_id))
);
drop policy if exists "response insert own" on public.event_responses;
create policy "response insert own event" on public.event_responses
for insert to authenticated with check (
  player_id = auth.uid() and exists (
    select 1 from public.events e where e.id = event_id and public.is_team_member(e.team_id)
  )
);
drop policy if exists "response update own" on public.event_responses;
create policy "response update own event" on public.event_responses
for update to authenticated using (player_id = auth.uid()) with check (
  player_id = auth.uid() and exists (
    select 1 from public.events e where e.id = event_id and public.is_team_member(e.team_id)
  )
);
create policy "coach delete responses" on public.event_responses
for delete to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_coach(e.team_id))
);


drop policy if exists "convocations read authenticated" on public.convocations;
create policy "convocations read same team" on public.convocations
for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_member(e.team_id))
);
create policy "coach manage convocations" on public.convocations
for all to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_coach(e.team_id))
) with check (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_coach(e.team_id))
);

drop policy if exists "convocation players read authenticated" on public.convocation_players;
create policy "convocation players read same team" on public.convocation_players
for select to authenticated using (
  exists (
    select 1 from public.convocations c join public.events e on e.id = c.event_id
    where c.id = convocation_id and public.is_team_member(e.team_id)
  )
);
drop policy if exists "convocation confirmation own update" on public.convocation_players;
create policy "player update own confirmation" on public.convocation_players
for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
create policy "coach manage convocation roster" on public.convocation_players
for all to authenticated using (
  exists (
    select 1 from public.convocations c join public.events e on e.id = c.event_id
    where c.id = convocation_id and public.is_team_coach(e.team_id)
  )
) with check (
  exists (
    select 1 from public.convocations c join public.events e on e.id = c.event_id
    where c.id = convocation_id and public.is_team_coach(e.team_id)
  )
);


-- Create a player profile automatically when a new auth user signs up.
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
    'player'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
