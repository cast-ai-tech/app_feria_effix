-- ============================================================
-- App Feria Effix — FASE 30: Citas personales (Mi Agenda 2.0)
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase30_calendar_feed.sql. Idempotente.
--
-- Mi Agenda deja de ser solo "charlas guardadas": el usuario puede crear
-- CITAS propias (networking, negocios, seguimientos post-evento) que
-- viven en su calendario dentro de la app todo el año — la app es canal
-- de retención anual, no solo del evento (ver docs/FASE22_CAPACITOR.md).
--
-- reminded_at: misma mecánica que saved_talks (Fase 17) — el cron de
-- /api/cron/reminders envía el push N minutos antes y marca la fila.
-- ============================================================

create table if not exists public.user_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  notes       text,
  reminded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists user_events_user_idx
  on public.user_events (user_id, starts_at);

-- Ventana del cron de recordatorios (solo pendientes).
create index if not exists user_events_reminder_idx
  on public.user_events (starts_at) where reminded_at is null;

drop trigger if exists user_events_set_updated_at on public.user_events;
create trigger user_events_set_updated_at
  before update on public.user_events
  for each row execute function public.set_updated_at();

alter table public.user_events enable row level security;

-- Datos 100% personales: el dueño gestiona las suyas, nadie más las ve.
drop policy if exists "citas personales: dueño gestiona" on public.user_events;
create policy "citas personales: dueño gestiona"
  on public.user_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
