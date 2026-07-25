-- ============================================================
-- App Feria Effix — FASE 15: Pasaporte de stands + captura de leads
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase14_credencial.sql. Idempotente.
--
-- El mismo QR de la Credencial se vuelve pasaporte de premios: el staff
-- del stand escanea al asistente → sello (gamificación) + lead (se
-- monetiza con el expositor en la Fase 19).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Zona del stand (para campañas 'por_zona' y el mapa).
-- ------------------------------------------------------------
alter table public.stands
  add column if not exists zone text;

-- ------------------------------------------------------------
-- 1. Staff autorizado por stand (lo asigna el admin).
-- ------------------------------------------------------------
create table if not exists public.stand_staff (
  id         uuid primary key default gen_random_uuid(),
  stand_id   uuid not null references public.stands(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (stand_id, user_id)
);

create index if not exists stand_staff_user_idx on public.stand_staff (user_id);

alter table public.stand_staff enable row level security;

drop policy if exists "staff: ve sus asignaciones" on public.stand_staff;
create policy "staff: ve sus asignaciones"
  on public.stand_staff for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "staff: admin gestiona" on public.stand_staff;
create policy "staff: admin gestiona"
  on public.stand_staff for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Sellos / leads. UNIQUE = un sello por stand por asistente
--    (anti-trampa) y scanned_by deja auditoría.
--    ESTE REGISTRO ES EL LEAD DEL EXPOSITOR.
-- ------------------------------------------------------------
create table if not exists public.stand_scans (
  id         uuid primary key default gen_random_uuid(),
  stand_id   uuid not null references public.stands(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scanned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (stand_id, profile_id)
);

create index if not exists stand_scans_stand_idx   on public.stand_scans (stand_id);
create index if not exists stand_scans_profile_idx on public.stand_scans (profile_id);

alter table public.stand_scans enable row level security;

-- El asistente ve SUS sellos (pasaporte); el staff ve los de SU stand
-- (leads); admin todo.
drop policy if exists "sellos: asistente ve los suyos" on public.stand_scans;
create policy "sellos: asistente ve los suyos"
  on public.stand_scans for select
  using (
    auth.uid() = profile_id
    or public.is_admin()
    or exists (
      select 1 from public.stand_staff s
       where s.stand_id = stand_scans.stand_id and s.user_id = auth.uid()
    )
  );

-- El INSERT solo ocurre vía RPC (valida staff y resuelve el connect_code).

-- ------------------------------------------------------------
-- 3. Campañas del pasaporte (metas y premio). CRUD en admin.
-- ------------------------------------------------------------
create table if not exists public.passport_campaigns (
  id                uuid primary key default gen_random_uuid(),
  edition           int not null references public.editions(year),
  name              text not null,
  goal_type         text not null default 'total'
                      check (goal_type in ('total', 'por_zona')),
  goal_value        int not null check (goal_value > 0),
  prize_description text,
  active            boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.passport_campaigns enable row level security;

drop policy if exists "campañas: lectura autenticados" on public.passport_campaigns;
create policy "campañas: lectura autenticados"
  on public.passport_campaigns for select
  using (auth.uid() is not null);

drop policy if exists "campañas: admin escribe" on public.passport_campaigns;
create policy "campañas: admin escribe"
  on public.passport_campaigns for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. Pasaportes completados (el canje físico lo maneja el equipo Effix).
-- ------------------------------------------------------------
create table if not exists public.passport_completions (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.passport_campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  redeemed_at  timestamptz,
  unique (campaign_id, user_id)
);

alter table public.passport_completions enable row level security;

drop policy if exists "completados: usuario ve el suyo" on public.passport_completions;
create policy "completados: usuario ve el suyo"
  on public.passport_completions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "completados: admin gestiona" on public.passport_completions;
create policy "completados: admin gestiona"
  on public.passport_completions for update
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 5. RPC modo stand: el staff escanea la credencial del asistente.
--    Valida autorización, resuelve el connect_code y registra
--    sello + lead. Devuelve jsonb:
--    { status: 'sealed'|'already'|'not_found'|'not_staff', attendee }
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

revoke execute on function public.stand_scan_credencial(uuid, text) from anon, public;
grant execute on function public.stand_scan_credencial(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 6. RPC reclamar pasaporte completo: valida la meta en el servidor
--    (anti-trampa) y registra el completado.
--    { status: 'completed'|'already'|'not_met'|'no_campaign', progress }
-- ------------------------------------------------------------
create or replace function public.claim_passport_completion(p_campaign uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  camp public.passport_campaigns%rowtype;
  progress int;
  inserted int;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;

  select * into camp from public.passport_campaigns
   where id = p_campaign and active;
  if not found then
    return jsonb_build_object('status', 'no_campaign');
  end if;

  if camp.goal_type = 'total' then
    select count(distinct sc.stand_id) into progress
      from public.stand_scans sc
      join public.stands st on st.id = sc.stand_id
     where sc.profile_id = me and st.edition = camp.edition;
  else -- por_zona
    select count(distinct st.zone) into progress
      from public.stand_scans sc
      join public.stands st on st.id = sc.stand_id
     where sc.profile_id = me and st.edition = camp.edition
       and st.zone is not null;
  end if;

  if progress < camp.goal_value then
    return jsonb_build_object('status', 'not_met', 'progress', progress,
                              'goal', camp.goal_value);
  end if;

  insert into public.passport_completions (campaign_id, user_id)
  values (p_campaign, me)
  on conflict (campaign_id, user_id) do nothing;
  get diagnostics inserted = row_count;

  return jsonb_build_object(
    'status', case when inserted > 0 then 'completed' else 'already' end,
    'progress', progress, 'goal', camp.goal_value
  );
end;
$$;

revoke execute on function public.claim_passport_completion(uuid) from anon, public;
grant execute on function public.claim_passport_completion(uuid) to authenticated;
