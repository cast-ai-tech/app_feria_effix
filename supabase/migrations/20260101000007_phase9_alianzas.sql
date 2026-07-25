-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 9: Módulo de Alianzas Estratégicas (marketplace de ofertas)
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de phase3_tickets.sql.
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
--
-- Reglas de negocio:
--   - Cada oferta tiene UN link de referido único, administrado por el equipo
--     de Feria Effix (NO por embajadores individuales). La comisión la gana
--     Feria Effix. La app solo muestra la oferta y abre el referral_url.
--   - El acceso al módulo requiere BOLETA VIGENTE de la edición en curso
--     (se controla en la app con getAccess(); las ofertas activas son de
--     lectura pública para simplificar la RLS, pero la página está bloqueada).
--
-- Dependencias ya creadas en fases previas:
--   public.is_admin()        (phase3_tickets.sql)
--   public.set_updated_at()  (schema.sql)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ofertas de aliados (marketplace).
-- ------------------------------------------------------------
create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  partner_name  text,                        -- mentor / empresa aliada
  description   text,
  discount      text,                        -- beneficio en texto libre (ej. "40% off")
  referral_url  text,                        -- link de referido ÚNICO (lo gestiona Effix)
  edition       int  not null default 2026,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists offers_edition_active_idx
  on public.offers (edition, active);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS.
--    Lectura: ofertas activas visibles a todos; admin ve todas (incl. inactivas).
--    Escritura: solo admin (además del service_role del server, que salta RLS).
-- ------------------------------------------------------------
alter table public.offers enable row level security;

drop policy if exists "ofertas: lectura activas o admin" on public.offers;
create policy "ofertas: lectura activas o admin"
  on public.offers for select
  using (active = true or public.is_admin());

drop policy if exists "ofertas: escribe admin" on public.offers;
create policy "ofertas: escribe admin"
  on public.offers for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. Seed: ofertas de ejemplo (edición 2026).
--    referral_url de ejemplo — reemplazar por los links reales de Effix.
-- ------------------------------------------------------------
insert into public.offers (title, partner_name, description, discount, referral_url, edition, active) values
  ('Mentoría "Escala tu Ecommerce"',
   'Effix Mentors',
   'Programa de mentoría 1:1 para llevar tu tienda al siguiente nivel de facturación.',
   '40% de descuento exclusivo para asistentes Effix',
   'https://example.com/ref/mentoria-escala?ref=feriaeffix',
   2026, true),
  ('Academia de Pauta Digital',
   'AdsLab',
   'Curso completo de publicidad en Meta y Google con acompañamiento en vivo.',
   '3 meses gratis al inscribirte durante la feria',
   'https://example.com/ref/adslab?ref=feriaeffix',
   2026, true),
  ('CRM ImpulsaCRM',
   'ImpulsaCRM',
   'CRM todo-en-uno para automatizar ventas y postventa de tu ecommerce.',
   '50% de descuento el primer año',
   'https://example.com/ref/impulsacrm?ref=feriaeffix',
   2026, true),
  ('Logística Envíos Pro',
   'Envíos Pro',
   'Tarifas preferenciales de última milla para tiendas online en LATAM.',
   'Sin costo de afiliación + tarifa preferencial',
   'https://example.com/ref/enviospro?ref=feriaeffix',
   2026, true),
  ('Fotografía de Producto Studio X',
   'Studio X',
   'Sesiones de fotografía de producto optimizadas para conversión.',
   '2x1 en tu primera sesión',
   'https://example.com/ref/studiox?ref=feriaeffix',
   2026, true)
on conflict do nothing;

-- ============================================================
-- Nota: el CRUD de ofertas y sus links de referido se hace desde el panel
-- admin (Fase 9) usando la SERVICE_ROLE_KEY del servidor tras verificar admin.
-- Ver src/app/admin/alianzas.
-- ============================================================
