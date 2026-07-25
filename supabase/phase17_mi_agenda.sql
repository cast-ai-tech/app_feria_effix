-- ============================================================
-- App Feria Effix — FASE 17: Mi Agenda + tiempo real
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase16_notifications.sql. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 0. FIX heredado (detectado en Fase 18): talks.day tenía
--    CHECK (day in (1,2,3)) de phase4 — rompe los días 4-5 de la
--    edición 2026. Se reemplaza por un CHECK laxo; el rango real
--    lo valida la server action contra editions.days.
-- ------------------------------------------------------------
alter table public.talks drop constraint if exists talks_day_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'talks_day_positive'
  ) then
    alter table public.talks
      add constraint talks_day_positive check (day is null or day >= 1);
  end if;
end $$;

-- ------------------------------------------------------------
-- 1. Track de la charla (filtros por chips).
-- ------------------------------------------------------------
alter table public.talks
  add column if not exists track text;

-- ------------------------------------------------------------
-- 2. Charlas guardadas (Mi Agenda).
-- ------------------------------------------------------------
create table if not exists public.saved_talks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  talk_id    uuid not null references public.talks(id) on delete cascade,
  created_at timestamptz not null default now(),
  /** Marca de recordatorio enviado (para el cron de 15 min antes). */
  reminded_at timestamptz,
  primary key (user_id, talk_id)
);

create index if not exists saved_talks_talk_idx on public.saved_talks (talk_id);

alter table public.saved_talks enable row level security;

drop policy if exists "guardadas: dueño gestiona" on public.saved_talks;
create policy "guardadas: dueño gestiona"
  on public.saved_talks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El admin (server, service key) lee todo para recordatorios y push de
-- cambios — el service role salta RLS, no necesita política.

-- ------------------------------------------------------------
-- 3. Realtime en talks (cambios de sala/hora/cancelación en vivo).
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'talks'
  ) then
    alter publication supabase_realtime add table public.talks;
  end if;
end $$;
