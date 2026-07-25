-- ============================================================
-- App Feria Effix — FASE 24: Sistema de banners de patrocinio
-- ------------------------------------------------------------
-- Migración 020. Idempotente. Lo que el equipo comercial VENDE:
-- espacios administrables con métricas (impresiones, clics, CTR).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Banners por placement.
--    placements v1: home_hero | home_inline | module_top | footer_strip
--    module_top usa module_key (agenda|stands|ponentes|academia|alianzas).
-- ------------------------------------------------------------
create table if not exists public.banners (
  id           uuid primary key default gen_random_uuid(),
  edition      int not null references public.editions(year),
  placement    text not null,
  module_key   text check (
    module_key in ('agenda', 'stands', 'ponentes', 'academia', 'alianzas')
  ),
  sponsor_tier text check (
    sponsor_tier in ('basico', 'plata', 'oro', 'diamante')
  ),
  title        text not null,
  image_url    text not null,
  link_url     text,
  sort_order   int not null default 100,
  starts_at    timestamptz,
  ends_at      timestamptz,
  active       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- CHECK de placements re-creable (v1 incluye splash_sponsor).
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check check (
  placement in (
    'splash_sponsor', 'home_hero', 'home_inline', 'module_top', 'footer_strip'
  )
);

create index if not exists banners_lookup_idx
  on public.banners (edition, placement, active);

alter table public.banners enable row level security;

-- Lectura pública SOLO de banners activos (el admin ve todos).
drop policy if exists "banners: activos públicos" on public.banners;
create policy "banners: activos públicos"
  on public.banners for select
  using (active or public.is_admin());

drop policy if exists "banners: admin escribe" on public.banners;
create policy "banners: admin escribe"
  on public.banners for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Métricas: impresiones y clics.
-- ------------------------------------------------------------
create table if not exists public.banner_events (
  id         uuid primary key default gen_random_uuid(),
  banner_id  uuid not null references public.banners(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists banner_events_banner_idx
  on public.banner_events (banner_id, event_type);

alter table public.banner_events enable row level security;

-- Cualquier usuario autenticado registra eventos; solo admin los lee.
drop policy if exists "banner_events: inserta autenticado" on public.banner_events;
create policy "banner_events: inserta autenticado"
  on public.banner_events for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

drop policy if exists "banner_events: lee admin" on public.banner_events;
create policy "banner_events: lee admin"
  on public.banner_events for select
  using (public.is_admin());

-- ------------------------------------------------------------
-- 3. Bucket público de Storage para las imágenes de banners.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "banners bucket: lectura pública" on storage.objects;
create policy "banners bucket: lectura pública"
  on storage.objects for select
  using (bucket_id = 'banners');

drop policy if exists "banners bucket: admin sube" on storage.objects;
create policy "banners bucket: admin sube"
  on storage.objects for insert
  with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners bucket: admin actualiza" on storage.objects;
create policy "banners bucket: admin actualiza"
  on storage.objects for update
  using (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners bucket: admin borra" on storage.objects;
create policy "banners bucket: admin borra"
  on storage.objects for delete
  using (bucket_id = 'banners' and public.is_admin());
