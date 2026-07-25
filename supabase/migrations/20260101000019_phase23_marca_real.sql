-- ============================================================
-- App Feria Effix — FASE 23: Alineación con la marca real del sitio
-- ------------------------------------------------------------
-- Fuente: docs/ANALISIS_BRANDING_FERIAEFFIX_2026.md (CSS y contenido
-- extraídos de feriaeffix.com el 2026-07-24). Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ticket_types: precios y nombres comerciales del sitio.
--    General = "Pasaporte 3 Días" $201.300 (días 16-18 → {2,3,4})
--    VIP $1.155.000 (5 días) · Black $3.997.000 (5 días, 400 cupos)
--    NUEVA "Corporativa" (equipos 10+, mismos días que General,
--    llega por el mismo CSV de La Tiquetera).
-- ------------------------------------------------------------
alter table public.ticket_types
  add column if not exists max_quantity int;

update public.ticket_types set
  label = 'Pasaporte 3 Días',
  price_cop = 201300
 where slug = 'general';

update public.ticket_types set price_cop = 1155000 where slug = 'vip';

update public.ticket_types set
  price_cop = 3997000,
  max_quantity = 400
 where slug = 'black';

insert into public.ticket_types (slug, label, price_cop, sale_channel, sort_order, allowed_days) values
  ('corporativa', 'Corporativa', null, 'tiquetera', 25, '{2,3,4}')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- 2. Política oficial: "No reembolsable pero transferible".
--    La transferencia de titular ya existe (ticket_transfers, Fase 3).
--    refund_full_days_before_event queda como config administrativa
--    interna — se actualiza su descripción para reflejarlo.
-- ------------------------------------------------------------
update public.app_config set
  description = 'ADMINISTRATIVO INTERNO — la política pública es "no reembolsable pero transferible". Este valor solo aplica a excepciones aprobadas por el equipo Effix desde el panel.'
 where key = 'refund_full_days_before_event';

insert into public.app_config (key, value, description) values
  ('ticket_policy', 'No reembolsable pero transferible',
   'Política oficial de escarapelas (sitio feriaeffix.com). Se muestra en la app.')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 3. Ponentes reales: fuera los 5 de prueba, entran los 17
--    confirmados del sitio (bio placeholder editable en admin).
-- ------------------------------------------------------------
delete from public.speakers
 where edition = 2026
   and full_name in (
     'Camila Restrepo', 'Andrés Gómez', 'Laura Vélez',
     'Sebastián Ríos', 'Valentina Ortiz'
   );

insert into public.speakers (full_name, role, bio, edition)
select seed.full_name, seed.role,
       'Bio pendiente — el equipo Effix la completa desde el panel admin.',
       2026
from (values
  ('Victor Heras',               'Ponente confirmado'),
  ('Xavi Esqueriguela',          'Ponente confirmado'),
  ('Fau Kassen',                 'Ponente confirmada'),
  ('Jose Lepage',                'Ponente confirmado'),
  ('Manuela Aduanera',           'Ponente confirmada'),
  ('Santiago Sánchez',           'Ponente confirmado'),
  ('Pamela Richter',             'Ponente confirmada'),
  ('Juan ID',                    'Ponente confirmado'),
  ('Javier García — Mundo Amazon', 'Ponente confirmado'),
  ('Felipe Vergara',             'Ponente confirmado'),
  ('Ana Pierr',                  'Ponente confirmada'),
  ('Alejandra Rincón',           'Ponente confirmada'),
  ('Santos Lever',               'Ponente confirmado'),
  ('Santiago Naranjo',           'Ponente confirmado'),
  ('Oscar Martan',               'Ponente confirmado'),
  ('Mike Munzvil',               'Ponente confirmado'),
  ('Guillermo González Pimiento','Ponente confirmado'),
  ('El Profe Miguel',            'Ponente confirmado')
) as seed(full_name, role)
where not exists (
  select 1 from public.speakers s
   where s.full_name = seed.full_name and s.edition = 2026
);
