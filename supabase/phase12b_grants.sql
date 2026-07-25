-- ============================================================
-- App Feria Effix — FASE 12b: GRANTs explícitos del Data API
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase12_estabilizacion.sql.
--
-- Por qué existe: Supabase (CLI nuevo y proyectos cloud nuevos) ya NO
-- expone automáticamente las tablas de `public` a los roles del API
-- (anon / authenticated / service_role). Sin estos GRANTs, todas las
-- consultas devuelven "permission denied", incluso con RLS correcta.
--
-- Modelo: los GRANTs abren la puerta a nivel de tabla; la SEGURIDAD
-- REAL por fila sigue siendo la RLS de cada fase. Nada cambia en el
-- modelo de acceso.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

-- Tablas y vistas: acceso a nivel de API; la RLS filtra las filas.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Funciones: solo usuarios autenticados y el servidor.
grant execute on all functions in schema public to authenticated, service_role;

-- is_admin() se evalúa dentro de políticas RLS de lectura, así que
-- también anon debe poder ejecutarla (es STABLE y SECURITY DEFINER).
grant execute on function public.is_admin() to anon;

-- Re-aplicar el hardening de fases anteriores que el grant masivo
-- podría haber revertido (Supabase advisor 0028):
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Tablas/funciones FUTURAS creadas por postgres heredan los mismos permisos.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
