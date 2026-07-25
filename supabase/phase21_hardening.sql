-- ============================================================
-- App Feria Effix — FASE 21: Hardening pre-evento
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase20_academia2.sql. Idempotente.
-- Rate limiting de RPCs públicas y votos (50.000 asistentes potenciales).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Registro de eventos para rate limit (solo lo tocan las funciones
--    SECURITY DEFINER; sin políticas => invisible vía API).
-- ------------------------------------------------------------
create table if not exists public.rate_limit_events (
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_idx
  on public.rate_limit_events (user_id, action, created_at desc);

alter table public.rate_limit_events enable row level security;
-- Sin políticas: nadie la lee/escribe por REST; solo funciones definer.
revoke all on public.rate_limit_events from anon, authenticated;

-- Limpieza pasiva: cada verificación borra lo más viejo de 1 día del usuario.
create or replace function public.assert_rate_limit(
  p_action text,
  p_max int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  recent int;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;

  delete from public.rate_limit_events
   where user_id = me and action = p_action
     and created_at < now() - interval '1 day';

  select count(*) into recent
    from public.rate_limit_events
   where user_id = me and action = p_action
     and created_at > now() - p_window;

  if recent >= p_max then
    raise exception 'Demasiadas acciones seguidas. Espera un momento e intenta de nuevo.'
      using errcode = 'P0001';
  end if;

  insert into public.rate_limit_events (user_id, action) values (me, p_action);
end;
$$;

revoke execute on function public.assert_rate_limit(text, int, interval) from anon, public, authenticated;

-- ------------------------------------------------------------
-- 2. connect_by_code con rate limit (30 escaneos/minuto por usuario).
--    (Redefinición completa de la función de la Fase 14 + guardia.)
-- ------------------------------------------------------------
create or replace function public.connect_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  already boolean;
  my_note text;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;

  perform public.assert_rate_limit('connect', 30, interval '1 minute');

  select * into target
    from public.profiles
   where connect_code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if target.id = me then
    return jsonb_build_object('status', 'self');
  end if;

  select exists (
    select 1 from public.connections
     where owner_id = me and connected_profile_id = target.id
  ) into already;

  if not already then
    insert into public.connections (owner_id, connected_profile_id)
    values (me, target.id), (target.id, me)
    on conflict (owner_id, connected_profile_id) do nothing;
  end if;

  select note into my_note
    from public.connections
   where owner_id = me and connected_profile_id = target.id;

  return jsonb_build_object(
    'status', case when already then 'already' else 'connected' end,
    'note', my_note,
    'profile', jsonb_build_object(
      'id', target.id,
      'full_name', target.full_name,
      'country', target.country,
      'role', target.role,
      'bio', target.bio,
      'whatsapp',  case when target.share_whatsapp  then target.whatsapp  end,
      'instagram', case when target.share_instagram then target.instagram end,
      'linkedin',  case when target.share_linkedin  then target.linkedin  end
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- 3. stand_scan_credencial con rate limit (60 sellos/minuto por staff).
-- ------------------------------------------------------------
create or replace function public.stand_scan_credencial(p_stand uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  inserted int;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;

  perform public.assert_rate_limit('stand_scan', 60, interval '1 minute');

  if not public.is_admin() and not exists (
    select 1 from public.stand_staff
     where stand_id = p_stand and user_id = me
  ) then
    return jsonb_build_object('status', 'not_staff');
  end if;

  select * into target
    from public.profiles
   where connect_code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  insert into public.stand_scans (stand_id, profile_id, scanned_by)
  values (p_stand, target.id, me)
  on conflict (stand_id, profile_id) do nothing;
  get diagnostics inserted = row_count;

  return jsonb_build_object(
    'status', case when inserted > 0 then 'sealed' else 'already' end,
    'attendee', jsonb_build_object(
      'id', target.id,
      'full_name', target.full_name,
      'country', target.country,
      'role', target.role
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- 4. Votos (Q&A y polls): trigger de rate limit sobre los INSERT
--    directos que permite la RLS (30 votos/minuto).
-- ------------------------------------------------------------
create or replace function public.rate_limit_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_rate_limit('vote', 30, interval '1 minute');
  return new;
end;
$$;

drop trigger if exists question_votes_rate on public.question_votes;
create trigger question_votes_rate
  before insert on public.question_votes
  for each row execute function public.rate_limit_votes();

drop trigger if exists poll_votes_rate on public.poll_votes;
create trigger poll_votes_rate
  before insert on public.poll_votes
  for each row execute function public.rate_limit_votes();
