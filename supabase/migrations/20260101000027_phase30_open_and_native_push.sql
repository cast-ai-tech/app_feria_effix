-- ============================================================
-- App Feria Effix — FASE 30: Módulos abiertos + base para push nativo
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase29_black_sponsor_tier.sql. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Avisos públicos sin sesión — la policy "notifs: audiencia lee"
--    (phase16_notifications.sql) ya deja pasar audience_type='all' sin
--    exigir auth.uid(); esto solo hace explícito el grant de tabla para
--    el rol `anon` en vez de depender del default de Supabase, mismo
--    criterio que talks/stands (Fase 4/6): contenido no personal, público
--    a nivel de BD, con la policy como único filtro real de filas.
-- ------------------------------------------------------------
grant select on public.notifications to anon;

-- ------------------------------------------------------------
-- 2. Push nativo (Android/iOS vía FCM) — push_subscriptions gana
--    `platform` para poder ramificar el envío en sendPushToUsers().
--    p256dh/auth eran NOT NULL (claves de cifrado de Web Push); los
--    tokens FCM no las usan, así que pasan a nullable.
-- ------------------------------------------------------------
alter table public.push_subscriptions
  add column if not exists platform text not null default 'web'
    check (platform in ('web', 'android', 'ios'));

alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth drop not null;

-- ------------------------------------------------------------
-- 3. Ventana de recordatorio de charla, configurable (antes hardcodeada
--    a 15 min en el cron) — la comparten el cron server-side y las
--    alarmas locales nativas para no desincronizarse.
-- ------------------------------------------------------------
insert into public.app_config (key, value, description) values
  ('reminder_lead_minutes', '15',
   'Minutos de anticipación del recordatorio de charla guardada (cron web + alarmas locales nativas).')
on conflict (key) do nothing;
