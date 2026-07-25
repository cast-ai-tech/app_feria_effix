-- ============================================================
-- App Feria Effix — FASE 12: Estabilización
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de todos
-- los scripts de fases anteriores. Es idempotente.
--
-- Contenido:
--   1. Tabla `editions` (multi-edición real, adiós años hardcodeados).
--   2. recordings.edition: se elimina el CHECK (2024,2025,2026) y se
--      valida contra `editions` vía FK.
--   3. Modelo multi-día: ticket_types.allowed_days + tickets.valid_days.
--   4. app_config: fechas del evento 2026 corregidas (15–19 oct).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ediciones del evento. Una sola activa a la vez.
--    day 1 = starts_on; day N = starts_on + (N-1).
-- ------------------------------------------------------------
create table if not exists public.editions (
  id         serial primary key,
  year       int  not null unique,
  name       text not null,
  starts_on  date not null,
  ends_on    date not null,
  days       int  not null check (days > 0),
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Garantiza que solo haya UNA edición activa.
create unique index if not exists editions_single_active
  on public.editions (is_active) where is_active;

insert into public.editions (year, name, starts_on, ends_on, days, is_active) values
  (2024, 'Feria Effix 2024', '2024-10-16', '2024-10-18', 3, false),
  (2025, 'Feria Effix 2025', '2025-10-15', '2025-10-17', 3, false),
  (2026, 'Feria Effix 2026', '2026-10-15', '2026-10-19', 5, true)
on conflict (year) do nothing;

-- Corrige la edición 2026 si ya existía con las fechas viejas (16–18).
update public.editions
   set starts_on = '2026-10-15', ends_on = '2026-10-19', days = 5, is_active = true
 where year = 2026 and (starts_on <> '2026-10-15' or days <> 5);

alter table public.editions enable row level security;

drop policy if exists "ediciones: lectura pública" on public.editions;
create policy "ediciones: lectura pública"
  on public.editions for select using (true);

drop policy if exists "ediciones: escribe admin" on public.editions;
create policy "ediciones: escribe admin"
  on public.editions for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. recordings.edition: fuera el CHECK hardcodeado; valida por FK.
-- ------------------------------------------------------------
alter table public.recordings
  drop constraint if exists recordings_edition_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recordings_edition_fkey'
  ) then
    alter table public.recordings
      add constraint recordings_edition_fkey
      foreign key (edition) references public.editions(year);
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. Modelo multi-día de boletas.
--    allowed_days = días de la edición que habilita el TIPO (relativos:
--    1 = primer día). NULL = se define por boleta (tickets.valid_days),
--    caso de la entrada diaria.
--    Edición 2026 (15–19 oct): Black/VIP = {1..5}; General/pasaporte
--    = {2,3,4} (16–18 oct); diaria = 1 día elegido al asignarla.
-- ------------------------------------------------------------
alter table public.ticket_types
  add column if not exists allowed_days int[];

update public.ticket_types set allowed_days = '{1,2,3,4,5}' where slug = 'black'   and allowed_days is null;
update public.ticket_types set allowed_days = '{1,2,3,4,5}' where slug = 'vip'     and allowed_days is null;
update public.ticket_types set allowed_days = '{2,3,4}'     where slug = 'general' and allowed_days is null;

insert into public.ticket_types (slug, label, price_cop, sale_channel, sort_order, allowed_days) values
  ('diaria', 'Entrada diaria', null, 'tiquetera', 40, null)
on conflict (slug) do nothing;

-- Días concretos de ESTA boleta (solo se usa cuando el tipo no los fija,
-- p. ej. la entrada diaria). NULL = hereda allowed_days del tipo.
alter table public.tickets
  add column if not exists valid_days int[];

-- ------------------------------------------------------------
-- 4. app_config: fechas reales del evento 2026 (15–19 de octubre).
--    Nota: `editions` es ahora la fuente de verdad de fechas/edición;
--    estas claves quedan como respaldo y para la ventana de reembolso.
-- ------------------------------------------------------------
update public.app_config set value = '2026-10-15' where key = 'event_start_date' and value = '2026-10-16';
update public.app_config set value = '2026-10-19' where key = 'event_end_date'   and value = '2026-10-18';

-- ============================================================
-- Pendientes de producción (ver panel admin → Configuración):
--   · black_whatsapp_url sigue siendo un placeholder (wa.me/573000000000).
--   · refund_full_days_before_event sigue TBD con La Tiquetera.
--   · referral_url de ofertas y video_url de Academia del seed son de
--     ejemplo — el admin los marca con badge "placeholder".
-- ============================================================
