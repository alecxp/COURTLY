-- Shared team entry: coaches create (or claim) a team by name; players join it by exact normalized name.
-- This intentionally removes localStorage-only team identity from the online entry flow.
alter table public.teams add column if not exists season text;

create or replace function public.enter_team_by_name(p_team_name text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_clean_name text;
  v_matches integer;
begin
  if auth.uid() is null then raise exception 'Sessione non valida'; end if;
  v_clean_name := trim(coalesce(p_team_name, ''));
  if length(v_clean_name) < 2 or length(v_clean_name) > 40 then raise exception 'Nome squadra non valido'; end if;
  if p_role not in ('player','coach') then raise exception 'Ruolo non valido'; end if;

  -- Require the profile created during the entry step.
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Profilo COURTLY non trovato';
  end if;

  if p_role = 'coach' then
    select count(*) into v_matches from public.teams where lower(trim(name)) = lower(v_clean_name);
    if v_matches > 1 then raise exception 'Esistono più squadre con questo nome: contatta il coach per distinguere la squadra'; end if;
    select id into v_team_id from public.teams where lower(trim(name)) = lower(v_clean_name) limit 1;
    if v_team_id is null then
      insert into public.teams(name, category, season, created_by)
      values (v_clean_name, 'Open', '2026/27', auth.uid()) returning id into v_team_id;
    elsif not exists (select 1 from public.team_members where team_id=v_team_id and user_id=auth.uid() and role in ('coach','admin'))
      and (select created_by from public.teams where id=v_team_id) is distinct from auth.uid() then
      raise exception 'Squadra già esistente: per evitare accessi non autorizzati non puoi reclamarla con il solo nome';
    end if;
    insert into public.team_members(team_id,user_id,role) values (v_team_id, auth.uid(), 'coach')
      on conflict (team_id,user_id) do update set role='coach';
    update public.profiles set team_id=v_team_id where id=auth.uid();
    return v_team_id;
  else
    select count(*) into v_matches from public.teams where lower(trim(name)) = lower(v_clean_name);
    if v_matches > 1 then raise exception 'Esistono più squadre con questo nome: chiedi al coach il nome esatto'; end if;
    select id into v_team_id from public.teams where lower(trim(name)) = lower(v_clean_name) limit 1;
    if v_team_id is null then raise exception 'Squadra non trovata. Chiedi al coach di crearla prima.'; end if;
    insert into public.team_members(team_id,user_id,role) values (v_team_id, auth.uid(), 'player')
      on conflict (team_id,user_id) do update set role='player';
    update public.profiles set team_id=v_team_id where id=auth.uid();
    return v_team_id;
  end if;
end;
$$;
revoke execute on function public.enter_team_by_name(text,text) from public, anon;
grant execute on function public.enter_team_by_name(text,text) to authenticated;
