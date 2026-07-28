-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 27: Reproductor propio de Academia + métricas
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de phase20_academia2.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. watch_progress: duración total del video (para % visto real).
--    `seconds` ya existía desde Fase 20 sin usar; ahora el player
--    propio lo escribe cada pocos segundos mientras reproduce.
-- ------------------------------------------------------------
alter table public.watch_progress
  add column if not exists duration_seconds int not null default 0;

alter table public.watch_progress
  drop constraint if exists watch_progress_seconds_nonneg;
alter table public.watch_progress
  add constraint watch_progress_seconds_nonneg check (seconds >= 0);

alter table public.watch_progress
  drop constraint if exists watch_progress_duration_nonneg;
alter table public.watch_progress
  add constraint watch_progress_duration_nonneg check (duration_seconds >= 0);

-- ------------------------------------------------------------
-- 2. Métricas de video para el panel admin (mismo espíritu que
--    recording_rating_stats de Fase 20): agregado de solo lectura
--    sobre watch_progress, sin tabla de eventos nueva.
-- ------------------------------------------------------------
create or replace view public.recording_watch_stats as
  select
    recording_id,
    count(*)::int as viewers,
    count(*) filter (where completed)::int as completed_count,
    round(avg(case when duration_seconds > 0
      then least(seconds::numeric / duration_seconds, 1) else 0 end) * 100, 1) as avg_pct_watched
  from public.watch_progress
  group by recording_id;

-- Igual que recording_rating_stats (Fase 20): solo lectura autenticada.
revoke select on public.recording_watch_stats from anon;

-- ------------------------------------------------------------
-- 3. Eventos del aviso de instalación PWA (mismo patrón que
--    banner_events de Fase 24: tabla de eventos, admin lee).
--    Puede dispararse sin sesión (el aviso aparece antes de login),
--    por eso el insert permite anon.
-- ------------------------------------------------------------
create table if not exists public.app_install_events (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('shown','accepted','dismissed')),
  platform   text,                    -- 'ios' | 'android' | 'desktop' (heurística de UA)
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists app_install_events_type_idx
  on public.app_install_events (event_type);

alter table public.app_install_events enable row level security;

drop policy if exists "install_events: inserta cualquiera" on public.app_install_events;
create policy "install_events: inserta cualquiera"
  on public.app_install_events for insert
  with check (true);

drop policy if exists "install_events: lee admin" on public.app_install_events;
create policy "install_events: lee admin"
  on public.app_install_events for select
  using (public.is_admin());

-- anon puede insertar (aviso antes de login) pero no leer; la policy de
-- arriba ya limita el select a admin para authenticated.
revoke select on public.app_install_events from anon;
-- ============================================================
