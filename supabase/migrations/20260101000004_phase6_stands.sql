-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 6: Módulo de Stands (Directorio de expositores + citas)
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql
-- y de phase3_tickets.sql (asume que ya existen public.is_admin()
-- y public.set_updated_at()).
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
--
-- El acceso al módulo (requiere boleta vigente de la edición en curso)
-- se controla en la PÁGINA, no en la base de datos: aquí la lectura del
-- directorio es pública. El DIRECTORIO ROTA POR EDICIÓN: la página filtra
-- por la edición vigente (app_config.current_edition) y NO mezcla años.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Stands / expositores del directorio.
--    - edition = año; el directorio se filtra por edición vigente para
--      no mezclar expositores de distintas ferias.
--    - logo_url opcional (si no hay, la app usa un emoji por categoría).
-- ------------------------------------------------------------
create table if not exists public.stands (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text,
  stand_number  text,
  description   text,
  logo_url      text,
  edition       int  not null default 2026,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists stands_edition_idx  on public.stands (edition);
create index if not exists stands_category_idx  on public.stands (edition, category);

drop trigger if exists stands_set_updated_at on public.stands;
create trigger stands_set_updated_at
  before update on public.stands
  for each row execute function public.set_updated_at();

-- RLS: lectura pública, escritura solo admin.
alter table public.stands enable row level security;

drop policy if exists "stands: lectura pública" on public.stands;
create policy "stands: lectura pública"
  on public.stands for select using (true);

drop policy if exists "stands: escribe admin" on public.stands;
create policy "stands: escribe admin"
  on public.stands for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Solicitudes de cita con un stand.
--    - El asistente crea/lee SOLO las suyas (auth.uid() = user_id).
--    - El admin ve y gestiona todas (aceptar / rechazar) desde el panel.
-- ------------------------------------------------------------
create table if not exists public.stand_meetings (
  id          uuid primary key default gen_random_uuid(),
  stand_id    uuid not null references public.stands(id) on delete cascade,
  user_id     uuid not null references auth.users(id)   on delete cascade,
  message     text,
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now()
);

create index if not exists stand_meetings_stand_idx  on public.stand_meetings (stand_id);
create index if not exists stand_meetings_user_idx   on public.stand_meetings (user_id);
create index if not exists stand_meetings_status_idx on public.stand_meetings (status);

alter table public.stand_meetings enable row level security;

-- El solicitante ve las suyas; el admin ve todas.
drop policy if exists "citas: solicitante o admin lee" on public.stand_meetings;
create policy "citas: solicitante o admin lee"
  on public.stand_meetings for select
  using (auth.uid() = user_id or public.is_admin());

-- El solicitante crea las suyas (a su propio nombre).
drop policy if exists "citas: solicitante crea" on public.stand_meetings;
create policy "citas: solicitante crea"
  on public.stand_meetings for insert
  with check (auth.uid() = user_id);

-- El solicitante puede cancelar/eliminar la suya; el admin cualquiera.
drop policy if exists "citas: solicitante o admin borra" on public.stand_meetings;
create policy "citas: solicitante o admin borra"
  on public.stand_meetings for delete
  using (auth.uid() = user_id or public.is_admin());

-- El admin gestiona el estado (aceptar / rechazar).
drop policy if exists "citas: admin actualiza" on public.stand_meetings;
create policy "citas: admin actualiza"
  on public.stand_meetings for update
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. Datos de ejemplo (edición 2026, varias categorías).
--    Se insertan solo si la tabla está vacía, para no duplicar en
--    re-ejecuciones ni pisar cambios hechos desde el panel admin.
-- ------------------------------------------------------------
insert into public.stands (name, category, stand_number, description, edition)
select * from (values
  ('ShopFlow LatAm', 'E-commerce', 'B12',
   'Plataforma de tiendas online para vender en toda Latinoamérica.', 2026),
  ('PagaYa', 'Pasarela de pagos', 'A04',
   'Cobros en línea con tasas locales y pagos en cuotas sin fricción.', 2026),
  ('EnvíaLogística', 'Logística', 'C08',
   'Última milla, fulfillment y devoluciones para e-commerce.', 2026),
  ('AdMetrics', 'Pauta digital', 'B21',
   'Analítica y automatización de campañas de Meta y Google Ads.', 2026),
  ('NubeCRM', 'Software / SaaS', 'A15',
   'CRM y automatización de marketing para equipos de ventas.', 2026),
  ('BrandLab', 'Branding y diseño', 'C02',
   'Identidad de marca y diseño de packaging para marcas digitales.', 2026)
) as seed
where not exists (select 1 from public.stands);

-- ============================================================
-- Nota: la creación/edición/eliminación de stands y la gestión de las
-- solicitudes de cita (aceptar/rechazar) se hacen desde el panel admin
-- (src/app/admin/stands) usando la SERVICE_ROLE_KEY del servidor, que
-- salta la RLS. La página pública (src/app/stands) filtra por la edición
-- vigente, permite buscar/filtrar por categoría y crear una solicitud de
-- cita a nombre del propio usuario.
-- ============================================================
