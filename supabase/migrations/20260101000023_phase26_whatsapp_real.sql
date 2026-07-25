-- ============================================================
-- App Feria Effix — FASE 26b: WhatsApp real de consultas Black
-- ------------------------------------------------------------
-- Fuente: feriaeffix.com/boleta-black/ (2026-07-24). La página oficial
-- atiende consultas de la Entrada Black por el WhatsApp general de la
-- feria (+57 322 712 8649). Solo se reemplaza si el valor sigue siendo
-- el placeholder original — si el admin ya lo cambió, no se toca.
-- Otros números oficiales del sitio (referencia, no config):
--   · Stands / expositores: +57 320 655 6725
--   · Inversionistas:       +57 314 768 0442
-- ============================================================

update public.app_config
   set value = 'https://wa.me/573227128649'
 where key   = 'black_whatsapp_url'
   and value = 'https://wa.me/573000000000';
