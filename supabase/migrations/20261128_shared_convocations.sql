-- Shared convocations for COURTLY.
-- Apply after 20261127_shared_events_sync.sql.

alter table public.convocations
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure all reads remain team-scoped and only team coaches manage convocation headers.
drop policy if exists "convocations read same team" on public.convocations;
create policy "convocations read same team" on public.convocations
for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_team_member(e.team_id))
);
drop policy if exists "coach manage convocations" on public.convocations;
create policy "coach manage convocations" on public.convocations
for all to authenticated
using (exists (select 1 from public.events e where e.id = event_id and public.is_team_coach(e.team_id)))
with check (exists (select 1 from public.events e where e.id = event_id and public.is_team_coach(e.team_id)));

-- Selected players are visible to team members. Coaches manage the selection;
-- players can update only their own confirmation for an existing selection.
drop policy if exists "convocation players read same team" on public.convocation_players;
create policy "convocation players read same team" on public.convocation_players
for select to authenticated using (
  exists (
    select 1 from public.convocations c
    join public.events e on e.id = c.event_id
    where c.id = convocation_id and public.is_team_member(e.team_id)
  )
);
drop policy if exists "coach manage convocation roster" on public.convocation_players;
create policy "coach manage convocation roster" on public.convocation_players
for all to authenticated
using (exists (
  select 1 from public.convocations c join public.events e on e.id = c.event_id
  where c.id = convocation_id and public.is_team_coach(e.team_id)
))
with check (exists (
  select 1 from public.convocations c join public.events e on e.id = c.event_id
  where c.id = convocation_id and public.is_team_coach(e.team_id)
));
drop policy if exists "player update own confirmation scoped" on public.convocation_players;
create policy "player update own confirmation scoped" on public.convocation_players
for update to authenticated
using (player_id = auth.uid() and exists (
  select 1 from public.convocations c join public.events e on e.id = c.event_id
  where c.id = convocation_id and public.is_team_member(e.team_id)
))
with check (player_id = auth.uid() and exists (
  select 1 from public.convocations c join public.events e on e.id = c.event_id
  where c.id = convocation_id and public.is_team_member(e.team_id)
));


create or replace function public.guard_player_convocation_confirmation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() = old.player_id then
    if new.player_id is distinct from old.player_id
       or new.convocation_id is distinct from old.convocation_id
       or new.confirmation not in ('confirmed','problem') then
      raise exception 'Players may only confirm their own selected convocation';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists player_convocation_confirmation_guard on public.convocation_players;
create trigger player_convocation_confirmation_guard
before update on public.convocation_players
for each row execute function public.guard_player_convocation_confirmation();
revoke execute on function public.guard_player_convocation_confirmation() from public, anon, authenticated;
