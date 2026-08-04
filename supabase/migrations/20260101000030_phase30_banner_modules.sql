-- ============================================================
-- App Feria Effix — FASE 30: banners en TODOS los módulos
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase30_user_events.sql. Idempotente.
--
-- Regla de producto: todo módulo de la app tiene espacio publicitario.
-- module_top solo cubría 5 módulos (F24); se amplía el vocabulario a los
-- que faltaban. El slot COLAPSA sin banner activo (BannerSlot renderiza
-- null), así que agregar los módulos no obliga a vender nada aún.
-- ============================================================

alter table public.banners drop constraint if exists banners_module_key_check;
alter table public.banners add constraint banners_module_key_check
  check (
    module_key in (
      'agenda', 'stands', 'ponentes', 'academia', 'alianzas',
      'mapa', 'comunidad', 'credencial', 'pasaporte', 'tickets',
      'notificaciones', 'beneficios'
    )
  );
