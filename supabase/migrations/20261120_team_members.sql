-- COURTLY team/membership foundation. Apply after schema.sql and migrations 001/002.
-- No team access codes are used in the product flow.
create extension if not exists pgcrypto;

-- Keep the existing teams table compatible with the original schema while adding
-- fields needed by team ownership and display.
alter table public.teams alter column club_id drop not null;
alter table public.teams add column if not exists category text not null default 'Open';
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player','coach','admin')),
  joined_at timestamptz not null default now(),
  unique(team_id,user_id)
);
create index if not exists team_members_user_id_idx on public.team_members(user_id);
create index if not exists team_members_team_id_idx on public.team_members(team_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;


-- Membership-based helper functions replace the older profile.team_id-only logic.
create or replace function public.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=auth.uid());
$$;
create or replace function public.is_team_coach(target_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=auth.uid() and tm.role in ('coach','admin'));
$$;
create or replace function public.is_team_creator(target_team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.teams t where t.id=target_team and t.created_by=auth.uid());
$$;

-- Read teams only when a user is a member. Creator policy permits team creation.
drop policy if exists "teams read same team" on public.teams;
drop policy if exists "members can read their teams" on public.teams;
create policy "members can read their teams" on public.teams for select to authenticated
using (public.is_team_member(id));
drop policy if exists "authenticated users create teams" on public.teams;
create policy "authenticated users create teams" on public.teams for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='coach'));

-- Team members can read their own roster; creators can add their first coach row.
drop policy if exists "members can read team roster" on public.team_members;
create policy "members can read team roster" on public.team_members for select to authenticated
using (public.is_team_member(team_id));
drop policy if exists "creator inserts initial coach membership" on public.team_members;
create policy "creator inserts initial coach membership" on public.team_members for insert to authenticated
with check (user_id=auth.uid() and role='coach' and public.is_team_creator(team_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='coach'));
drop policy if exists "coaches add players" on public.team_members;
create policy "coaches add players" on public.team_members for insert to authenticated
with check (role='player' and public.is_team_coach(team_id) and exists(select 1 from public.profiles p where p.id=team_members.user_id and p.role='player'));
drop policy if exists "coaches update team members" on public.team_members;
create policy "coaches update team members" on public.team_members for update to authenticated
using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id) and role in ('player','coach','admin'));
drop policy if exists "coaches delete team members" on public.team_members;
create policy "coaches delete team members" on public.team_members for delete to authenticated
using (public.is_team_coach(team_id));

-- Profile visibility follows the membership table, not the legacy profile.team_id field.
drop policy if exists "profiles visible to same team" on public.profiles;
create policy "profiles visible to same team" on public.profiles for select to authenticated
using (id=auth.uid() or exists (
  select 1 from public.team_members viewer
  join public.team_members target on target.team_id=viewer.team_id
  where viewer.user_id=auth.uid() and target.user_id=profiles.id
));
