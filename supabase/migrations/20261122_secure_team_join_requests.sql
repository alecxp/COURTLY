-- COURTLY: secure team discovery and join-request foundation.
-- Apply after schema.sql and all existing migrations.
-- Coaches must be provisioned by a trusted administrator; client metadata is never authoritative.

-- Fix the vulnerable onboarding trigger: client-supplied requested_role is ignored.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, role, team_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), 'player_' || left(replace(new.id::text, '-', ''), 8)),
    'player',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- Prevent a client from creating a profile with a privileged role or team assignment.
drop policy if exists "profile insert own" on public.profiles;
create policy "profile insert own player only" on public.profiles
for insert to authenticated
with check (id = auth.uid() and role = 'player' and team_id is null);


-- Remove coach roles that could have been self-selected by the old onboarding metadata.
-- Verified coaches must be re-provisioned by a trusted admin after this migration.
update public.profiles set role = 'player' where role = 'coach';
-- Also neutralize old coach membership rows created through the vulnerable onboarding flow.
update public.team_members set role = 'player' where role = 'coach';


create table if not exists public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  unique(id, team_id, user_id)
);
create unique index if not exists team_join_requests_one_pending_idx
  on public.team_join_requests(team_id, user_id) where status = 'pending';
create index if not exists team_join_requests_team_status_idx
  on public.team_join_requests(team_id, status, created_at);

alter table public.team_join_requests enable row level security;
drop policy if exists "join requests read scoped" on public.team_join_requests;
create policy "join requests read scoped" on public.team_join_requests
for select to authenticated
using (user_id = auth.uid() or public.is_team_coach(team_id));

-- Clients cannot insert/update/delete request rows directly; RPCs below are the controlled path.
revoke insert, update, delete on public.team_join_requests from anon, authenticated;
grant select on public.team_join_requests to authenticated;


create or replace function public.request_team_join_by_name(team_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_team uuid;
  match_count integer;
  request_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if team_name is null or length(trim(team_name)) < 2 then raise exception 'Team name must be at least 2 characters'; end if;

  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'player') then
    raise exception 'Only player profiles can request to join a team';
  end if;
  if exists (select 1 from public.team_members tm where tm.user_id = auth.uid()) then
    raise exception 'You already belong to a team';
  end if;

  select count(*) into match_count
  from public.teams
  where lower(trim(name)) = lower(trim(team_name));
  if match_count = 0 then raise exception 'No team found with that name'; end if;
  if match_count > 1 then raise exception 'Multiple teams have that name; ask the coach for the exact team details'; end if;
  select id into found_team from public.teams
  where lower(trim(name)) = lower(trim(team_name))
  limit 1;

  insert into public.team_join_requests(team_id, user_id, status)
  values (found_team, auth.uid(), 'pending')
  on conflict (team_id, user_id) where status = 'pending'
  do update set created_at = now()
  returning id into request_id;
  return request_id;
end;
$$;


create or replace function public.approve_team_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.team_join_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into req from public.team_join_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending join request not found'; end if;
  if not public.is_team_coach(req.team_id) then raise exception 'Only the team coach can approve requests'; end if;
  if not exists (select 1 from public.profiles p where p.id = req.user_id and p.role = 'player') then raise exception 'Applicant is not a player profile'; end if;
  if exists (select 1 from public.team_members tm where tm.user_id = req.user_id) then raise exception 'Player already belongs to a team'; end if;

  insert into public.team_members(team_id, user_id, role) values (req.team_id, req.user_id, 'player');
  update public.profiles set team_id = req.team_id where id = req.user_id;
  update public.team_join_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() where id = req.id;
end;
$$;


create or replace function public.reject_team_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.team_join_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into req from public.team_join_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Pending join request not found'; end if;
  if not public.is_team_coach(req.team_id) then raise exception 'Only the team coach can reject requests'; end if;
  update public.team_join_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid() where id = req.id;
end;
$$;


revoke execute on function public.request_team_join_by_name(text) from public, anon;
revoke execute on function public.approve_team_join_request(uuid) from public, anon;
revoke execute on function public.reject_team_join_request(uuid) from public, anon;
grant execute on function public.request_team_join_by_name(text) to authenticated;
grant execute on function public.approve_team_join_request(uuid) to authenticated;
grant execute on function public.reject_team_join_request(uuid) to authenticated;


-- Reaffirm that a team creator is a verified coach, not just a client-selected role.
drop policy if exists "authenticated users create teams" on public.teams;
create policy "verified coaches create teams" on public.teams
for insert to authenticated
with check (created_by = auth.uid() and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'
));
