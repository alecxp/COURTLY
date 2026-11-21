-- COURTLY security hardening: prevent membership privilege escalation and
-- self-confirmation records from being moved between convocations.
-- Apply AFTER 20261120_team_members.sql.


-- Team members are added by coaches but membership roles are not mutable from
-- the client. Coach/admin privileges are granted only by trusted provisioning.
drop policy if exists "coaches update team members" on public.team_members;


-- Coaches may remove players, but cannot remove another coach/admin membership.
drop policy if exists "coaches delete team members" on public.team_members;
create policy "coaches delete player memberships" on public.team_members
for delete to authenticated
using (public.is_team_coach(team_id) and role = 'player');


-- A player may update only their own convocation row, and only while they are
-- a member of the team associated with that convocation/event.
drop policy if exists "player update own confirmation" on public.convocation_players;
drop policy if exists "convocation confirmation own update" on public.convocation_players;
drop policy if exists "player update own confirmation scoped" on public.convocation_players;
create policy "player update own confirmation scoped" on public.convocation_players
for update to authenticated
using (
  player_id = auth.uid() and exists (
    select 1 from public.convocations c
    join public.events e on e.id = c.event_id
    where c.id = convocation_players.convocation_id
      and public.is_team_member(e.team_id)
  )
)
with check (
  player_id = auth.uid() and exists (
    select 1 from public.convocations c
    join public.events e on e.id = c.event_id
    where c.id = convocation_players.convocation_id
      and public.is_team_member(e.team_id)
  )
);


-- RLS does not restrict which columns an UPDATE changes. Protect row identity
-- when a player is the actor; coaches remain governed by the coach policy.
create or replace function public.protect_player_convocation_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.player_id then
    if new.player_id is distinct from old.player_id
       or new.convocation_id is distinct from old.convocation_id then
      raise exception 'Players cannot change convocation or player identity';
    end if;
    if new.confirmation not in ('pending','confirmed','problem') then
      raise exception 'Invalid confirmation value';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists convocation_player_identity_guard on public.convocation_players;
create trigger convocation_player_identity_guard
before update on public.convocation_players
for each row execute function public.protect_player_convocation_identity();


-- Keep helper functions callable by authenticated policy evaluation, not anonymous clients.
revoke execute on function public.is_team_member(uuid) from public, anon;
revoke execute on function public.is_team_coach(uuid) from public, anon;
revoke execute on function public.is_team_creator(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_coach(uuid) to authenticated;
grant execute on function public.is_team_creator(uuid) to authenticated;
revoke execute on function public.protect_player_convocation_identity() from public, anon, authenticated;
