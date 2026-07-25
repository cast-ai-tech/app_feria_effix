-- ============================================================
-- App Feria Effix — FASE 16: Push + centro de notificaciones
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase15_pasaporte.sql. Idempotente.
-- Regla de oro: útil, nunca spam (límite diario de marketing en app_config).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Suscripciones Web Push (una por usuario/dispositivo).
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: dueño gestiona" on public.push_subscriptions;
create policy "push: dueño gestiona"
  on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. Notificaciones enviadas (historial del centro in-app).
--    audience_type: 'all' | 'tier' (slug de boleta) | 'rol' (slug de perfil).
--    category: 'operativa' (no cuenta para el límite) | 'marketing'.
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text,
  url           text,
  audience_type text not null default 'all'
                  check (audience_type in ('all', 'tier', 'rol')),
  audience_value text,
  category      text not null default 'operativa'
                  check (category in ('operativa', 'marketing')),
  created_by    uuid references auth.users(id) on delete set null,
  sent_at       timestamptz not null default now(),
  sent_count    int
);

create index if not exists notifications_sent_idx on public.notifications (sent_at desc);

alter table public.notifications enable row level security;

-- Cada usuario ve las notificaciones que lo TARGETEAN (para el centro in-app).
drop policy if exists "notifs: audiencia lee" on public.notifications;
create policy "notifs: audiencia lee"
  on public.notifications for select
  using (
    public.is_admin()
    or audience_type = 'all'
    or (audience_type = 'rol' and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = audience_value
    ))
    or (audience_type = 'tier' and exists (
      select 1 from public.tickets t
       where t.user_id = auth.uid()
         and t.status = 'active'
         and t.ticket_type = audience_value
    ))
  );

drop policy if exists "notifs: admin escribe" on public.notifications;
create policy "notifs: admin escribe"
  on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. Lecturas (badge de no-leídas).
-- ------------------------------------------------------------
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists "lecturas: dueño gestiona" on public.notification_reads;
create policy "lecturas: dueño gestiona"
  on public.notification_reads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Opt-out de push de marketing por usuario (las operativas siempre van).
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists optout_marketing_push boolean not null default false;

-- ------------------------------------------------------------
-- 5. Anti-spam: máximo de pushes de MARKETING por día (editable en admin).
-- ------------------------------------------------------------
insert into public.app_config (key, value, description) values
  ('push_marketing_daily_limit', '2',
   'Máximo de notificaciones push de marketing por día. Las operativas (cambios de agenda, conexiones, sellos) no cuentan.')
on conflict (key) do nothing;
