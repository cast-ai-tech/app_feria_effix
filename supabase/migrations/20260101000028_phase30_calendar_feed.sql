-- ============================================================
-- App Feria Effix — FASE 30: Feed de calendario personal (.ics)
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase30_open_and_native_push.sql. Idempotente.
--
-- Cada usuario obtiene un token opaco que lo identifica en la URL de su
-- feed de calendario (/api/calendar/<token>). Las apps de calendario
-- (iOS, Google Calendar, Outlook) no pueden autenticarse con la sesión
-- de Supabase, así que el token ES la credencial: aleatorio, único, y
-- regenerable si el usuario lo filtra (basta un UPDATE a gen_random_uuid).
-- El feed solo expone las charlas GUARDADAS de ese usuario — no hay PII
-- de terceros.
-- ============================================================

alter table public.profiles
  add column if not exists calendar_token uuid not null default gen_random_uuid();

-- Único: un token no puede apuntar a dos usuarios.
create unique index if not exists profiles_calendar_token_unique
  on public.profiles (calendar_token);
