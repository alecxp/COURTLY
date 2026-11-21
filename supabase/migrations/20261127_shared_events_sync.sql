-- Shared COURTLY trainings/games and per-player replies.
-- Apply after 20261120_team_members.sql and 20261121_membership_security_hardening.sql.

-- Ensure membership-scoped event reads and coach-only event writes.
drop policy if exists "events read authenticated" on public.events;
drop policy if exists "events read same team" on public.events;
drop policy if exists "coach create events" on public.events;
drop policy if exists "coach update events" on public.events;
drop policy if exists "coach delete events" on public.events;
drop policy if exists "events read team members" on public.events;
create policy "events read team members" on public.events
for select to authenticated using (public.is_team_member(team_id));

drop policy if exists "events insert coaches" on public.events;
create policy "events insert coaches" on public.events
for insert to authenticated with check (public.is_team_coach(team_id) and created_by = auth.uid());
drop policy if exists "events update coaches" on public.events;
create policy "events update coaches" on public.events
for update to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
drop policy if exists "events delete coaches" on public.events;
create policy "events delete coaches" on public.events
for delete to authenticated using (public.is_team_coach(team_id));

-- Replies are visible to team members, but players can only create/update their own.
drop policy if exists "responses read authenticated" on public.event_responses;
drop policy if exists "responses read same team" on public.event_responses;
drop policy if exists "response insert own event" on public.event_responses;
drop policy if exists "response update own event" on public.event_responses;
drop policy if exists "coach delete responses" on public.event_responses;
drop policy if exists "responses read team members" on public.event_responses;
create policy "responses read team members" on public.event_responses
for select to authenticated using (exists (select 1 from public.events e where e.id=event_id and public.is_team_member(e.team_id)));
drop policy if exists "response insert own" on public.event_responses;
create policy "response insert own" on public.event_responses
for insert to authenticated with check (player_id=auth.uid() and exists (select 1 from public.events e where e.id=event_id and public.is_team_member(e.team_id)));
drop policy if exists "response update own" on public.event_responses;
create policy "response update own" on public.event_responses
for update to authenticated using (player_id=auth.uid() and exists (select 1 from public.events e where e.id=event_id and public.is_team_member(e.team_id)))
with check (player_id=auth.uid() and exists (select 1 from public.events e where e.id=event_id and public.is_team_member(e.team_id)));
