-- Team notifications stored centrally per recipient. Apply after 20261128_shared_convocations.sql.
create table if not exists public.team_notifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('team','training','game','convocation','basket')),
  title text not null,
  body text not null,
  href text not null default '/',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists team_notifications_user_created_idx on public.team_notifications(user_id,created_at desc);
alter table public.team_notifications enable row level security;
drop policy if exists "users read own team notifications" on public.team_notifications;
create policy "users read own team notifications" on public.team_notifications
for select to authenticated using (user_id=auth.uid() and public.is_team_member(team_id));
drop policy if exists "coaches notify team members" on public.team_notifications;
create policy "coaches notify team members" on public.team_notifications
for insert to authenticated with check (
  public.is_team_coach(team_id) and exists (
    select 1 from public.team_members tm where tm.team_id=team_notifications.team_id and tm.user_id=team_notifications.user_id
  )
);
drop policy if exists "users update own notification read state" on public.team_notifications;
create policy "users update own notification read state" on public.team_notifications
for update to authenticated using (user_id=auth.uid() and public.is_team_member(team_id))
with check (user_id=auth.uid() and public.is_team_member(team_id));
drop policy if exists "users delete own team notifications" on public.team_notifications;
create policy "users delete own team notifications" on public.team_notifications
for delete to authenticated using (user_id=auth.uid() and public.is_team_member(team_id));

create or replace function public.guard_notification_read_only_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() = old.user_id then
    if new.id is distinct from old.id
       or new.team_id is distinct from old.team_id
       or new.user_id is distinct from old.user_id
       or new.category is distinct from old.category
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.href is distinct from old.href
       or new.created_at is distinct from old.created_at then
      raise exception 'Recipients may only change notification read state';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists team_notification_update_guard on public.team_notifications;
create trigger team_notification_update_guard
before update on public.team_notifications
for each row execute function public.guard_notification_read_only_update();
revoke execute on function public.guard_notification_read_only_update() from public, anon, authenticated;
