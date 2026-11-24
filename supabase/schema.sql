-- Courtly database schema + basic Row Level Security
create extension if not exists pgcrypto;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  name text not null,
  category text not null default 'Open',
  season text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 3 and 20),
  full_name text,
  role text not null default 'player' check (role in ('player','coach','admin')),
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_type text not null check (event_type in ('training','game','club_event')),
  title text not null,
  opponent text,
  starts_at timestamptz not null,
  meeting_at timestamptz,
  venue text,
  is_home boolean,
  notes text,
  response_deadline timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.event_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('present','absent','available','unavailable')),
  updated_at timestamptz not null default now(),
  unique(event_id,player_id)
);

create table if not exists public.convocations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  published_at timestamptz,
  created_by uuid references public.profiles(id)
);

create table if not exists public.convocation_players (
  convocation_id uuid not null references public.convocations(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  confirmation text not null default 'pending' check (confirmation in ('pending','confirmed','problem')),
  primary key (convocation_id,player_id)
);

create index if not exists events_team_start_idx on public.events(team_id,starts_at);
create index if not exists responses_event_idx on public.event_responses(event_id);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.clubs enable row level security;
alter table public.events enable row level security;
alter table public.event_responses enable row level security;
alter table public.convocations enable row level security;
alter table public.convocation_players enable row level security;

-- Profiles: authenticated users can read profile rows; each user can create/update their own row.
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "profile insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Team and club data readable to signed-in members; writes will be restricted to admin in the next migration.
create policy "clubs read authenticated" on public.clubs for select to authenticated using (true);
create policy "teams read authenticated" on public.teams for select to authenticated using (true);

-- Events visible to signed-in users; event creation/edit policies are added with coach role enforcement.
create policy "events read authenticated" on public.events for select to authenticated using (true);

-- Players can only insert/update their own responses.
create policy "responses read authenticated" on public.event_responses for select to authenticated using (true);
create policy "response insert own" on public.event_responses for insert to authenticated with check (player_id = auth.uid());
create policy "response update own" on public.event_responses for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy "convocations read authenticated" on public.convocations for select to authenticated using (true);
create policy "convocation players read authenticated" on public.convocation_players for select to authenticated using (true);
create policy "convocation confirmation own update" on public.convocation_players for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());


-- Remote Web Push device subscriptions. A user can only manage their own endpoints.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_team_idx on public.push_subscriptions(team_id);
alter table public.push_subscriptions enable row level security;
create policy "push subscription read own" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push subscription insert own" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push subscription update own" on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push subscription delete own" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
