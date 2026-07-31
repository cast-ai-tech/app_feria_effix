-- ============================================================
-- App Feria Effix — FASE 29: Nivel de patrocinio "Black"
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase28_roles.sql. Idempotente.
--
-- Agrega 'black' como nivel tope del vocabulario de patrocinio
-- (por encima de diamante) en los 3 lugares que lo usan:
-- stands.tier (F19), banners.sponsor_tier (F24) y sponsors.tier
-- (F28). Los desbloqueos de black = los de diamante + posición
-- destacada; el detalle comercial vive en el código (TIER_FIELDS
-- y TIER_RANK).
-- ============================================================

alter table public.stands drop constraint if exists stands_tier_check;
alter table public.stands add constraint stands_tier_check
  check (tier in ('basico', 'plata', 'oro', 'diamante', 'black'));

alter table public.banners drop constraint if exists banners_sponsor_tier_check;
alter table public.banners add constraint banners_sponsor_tier_check
  check (
    sponsor_tier in ('basico', 'plata', 'oro', 'diamante', 'black')
  );

alter table public.sponsors drop constraint if exists sponsors_tier_check;
alter table public.sponsors add constraint sponsors_tier_check
  check (tier in ('basico', 'plata', 'oro', 'diamante', 'black'));
