-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 4: Módulo de Agenda (Programación de charlas)
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql
-- y de phase3_tickets.sql (asume que ya existen public.is_admin()
-- y public.set_updated_at()).
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
--
-- El acceso al módulo (requiere boleta vigente) se controla en la PÁGINA,
-- no en la base de datos: aquí la lectura es pública para que la vitrina
-- y el panel funcionen sin fricción. La escritura queda solo para admin.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Charlas / conferencias de la agenda.
--    - NO hay FK a "speakers": la tabla de ponentes la construye otro
--      agente (Fase de Ponentes). Guardamos speaker_id y speaker_name
--      sueltos para poder enlazar/mostrar sin acoplarnos a ese módulo.
--    - day = 1|2|3 (16, 17 y 18 de octubre de 2026).
--    - starts_at / ends_at = timestamptz (se guarda con offset -05,
--      hora de Medellín) para calcular el badge "Ahora".
-- ------------------------------------------------------------
create table if not exists public.talks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  speaker_id   uuid,                        -- referencia suelta (sin FK)
  speaker_name text,
  auditorium   text,
  day          int check (day in (1, 2, 3)),
  starts_at    timestamptz,
  ends_at      timestamptz,
  edition      int  not null default 2026,
  status       text not null default 'active'
                 check (status in ('active', 'cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists talks_edition_idx on public.talks (edition);
create index if not exists talks_starts_idx  on public.talks (starts_at);
create index if not exists talks_day_idx      on public.talks (edition, day);

drop trigger if exists talks_set_updated_at on public.talks;
create trigger talks_set_updated_at
  before update on public.talks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS: lectura pública, escritura solo admin.
-- ------------------------------------------------------------
alter table public.talks enable row level security;

drop policy if exists "charlas: lectura pública" on public.talks;
create policy "charlas: lectura pública"
  on public.talks for select using (true);

drop policy if exists "charlas: escribe admin" on public.talks;
create policy "charlas: escribe admin"
  on public.talks for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. Datos de ejemplo (16–18 oct 2026, hora de Medellín, -05).
--    Se insertan solo si la tabla está vacía, para no duplicar en
--    re-ejecuciones ni pisar cambios hechos desde el panel admin.
-- ------------------------------------------------------------
insert into public.talks (title, description, speaker_name, auditorium, day, starts_at, ends_at, edition)
select * from (values
  ('Growth con IA para e-commerce',
   'Cómo usar inteligencia artificial para escalar campañas y personalizar la experiencia de compra.',
   'Camila Restrepo', 'Auditorio 2', 1,
   timestamptz '2026-10-16 10:00:00-05', timestamptz '2026-10-16 11:00:00-05', 2026),

  ('Escalar con embajadores y afiliados',
   'Diseña un programa de embajadores que multiplique tus ventas sin inflar el CAC.',
   'Andrés Gómez', 'Auditorio 1', 1,
   timestamptz '2026-10-16 11:15:00-05', timestamptz '2026-10-16 12:00:00-05', 2026),

  ('Meta Ads: lo que cambió en 2026',
   'Las novedades de la plataforma publicitaria de Meta y cómo adaptar tu estrategia.',
   'Laura Vélez', 'Auditorio 3', 2,
   timestamptz '2026-10-17 12:15:00-05', timestamptz '2026-10-17 13:00:00-05', 2026),

  ('Cierre de ventas de alto ticket',
   'Metodología para cerrar productos y servicios premium en el mundo digital.',
   'Sebastián Ríos', 'Auditorio 2', 2,
   timestamptz '2026-10-17 14:00:00-05', timestamptz '2026-10-17 15:00:00-05', 2026),

  ('Logística que enamora al cliente',
   'Última milla, empaques y postventa como palanca de recompra.',
   'Valentina Ortiz', 'Auditorio 1', 3,
   timestamptz '2026-10-18 09:30:00-05', timestamptz '2026-10-18 10:30:00-05', 2026),

  ('Marca personal para founders',
   'Construye autoridad y comunidad alrededor de tu marca desde el día uno.',
   'Mateo Cardona', 'Auditorio 3', 3,
   timestamptz '2026-10-18 11:00:00-05', timestamptz '2026-10-18 12:00:00-05', 2026)
) as seed
where not exists (select 1 from public.talks);

-- ============================================================
-- Nota: la creación/edición/cancelación de charlas se hace desde el
-- panel admin (src/app/admin/agenda) usando la SERVICE_ROLE_KEY del
-- servidor, que salta la RLS. La página pública (src/app/agenda) solo
-- lee y controla el acceso por boleta vigente.
-- ============================================================
