-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 10: Comunidad y Networking
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql.
-- Es idempotente (usa "create or replace" / "if not exists").
--
-- Comunidad es un MÓDULO ABIERTO a cualquier usuario registrado
-- (no exige boleta). Necesita un directorio PÚBLICO de perfiles,
-- pero la tabla public.profiles tiene RLS que solo deja a cada
-- usuario ver SU propia fila y contiene columnas sensibles
-- (ticket_email, is_admin).
--
-- Solución: una VISTA que expone ÚNICAMENTE las columnas públicas
-- de TODOS los perfiles. Con security_invoker = false la vista se
-- ejecuta con los permisos de su dueño (postgres) y así "salta" la
-- RLS de profiles, exponiendo solo las columnas listadas aquí.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Vista pública del directorio de Comunidad.
--    Columnas verificadas contra public.profiles (schema.sql, Fase 2):
--    id, full_name, country, role, bio, whatsapp, instagram, linkedin.
--    Se EXCLUYEN a propósito: ticket_email e is_admin (sensibles).
-- ------------------------------------------------------------
create or replace view public.community_directory as
  select id, full_name, country, role, bio, whatsapp, instagram, linkedin
  from public.profiles;

-- La vista corre con los permisos de su dueño (postgres), así evita la
-- RLS de profiles y expone únicamente estas columnas públicas.
alter view public.community_directory set (security_invoker = false);

-- Lectura del directorio SOLO para usuarios autenticados. La página ya exige
-- login (Comunidad es abierta a cualquier registrado, pero no anónimo), y así
-- evitamos que los WhatsApp/redes de los miembros sean consultables por la
-- anon key (pública) sin iniciar sesión. [QA seguridad BAJA-1]
revoke select on public.community_directory from anon;
grant select on public.community_directory to authenticated;

-- ------------------------------------------------------------
-- Nota: no hay panel admin para este módulo. Los datos del directorio
-- se editan desde "Mi perfil" (cada usuario mantiene su propia fila en
-- public.profiles mediante la RLS existente).
-- ============================================================
