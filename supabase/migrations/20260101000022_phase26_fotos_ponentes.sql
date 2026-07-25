-- ============================================================
-- App Feria Effix — FASE 26: fotos oficiales de ponentes 2026
-- ------------------------------------------------------------
-- Fotos extraídas de feriaeffix.com (sección "Ponentes" de /entradas/)
-- y empaquetadas como assets estáticos de la app en public/ponentes/.
-- Solo se asigna la foto si el ponente aún no tiene una (el admin puede
-- haberla cambiado desde el panel — no se pisa).
-- Idempotente: re-ejecutar no cambia nada.
-- ============================================================

update public.speakers s
   set photo_url = seed.photo
  from (values
    ('Victor Heras',                  '/ponentes/victor-heras.webp'),
    ('Xavi Esqueriguela',             '/ponentes/xavi-esqueriguela.webp'),
    ('Fau Kassen',                    '/ponentes/fau-kassen.webp'),
    ('Jose Lepage',                   '/ponentes/jose-lepage.webp'),
    ('Manuela Aduanera',              '/ponentes/manuela-aduanera.webp'),
    ('Santiago Sánchez',              '/ponentes/santiago-sanchez.webp'),
    ('Pamela Richter',                '/ponentes/pamela-richterz.webp'),
    ('Juan ID',                       '/ponentes/juan-id.webp'),
    ('Javier García — Mundo Amazon',  '/ponentes/javier-garcia.webp'),
    ('Felipe Vergara',                '/ponentes/felipe-vergara.webp'),
    ('Ana Pierr',                     '/ponentes/ana-pierr.webp'),
    ('Alejandra Rincón',              '/ponentes/alejandra-rincon.webp'),
    ('Guillermo González Pimiento',   '/ponentes/guillermo-gonzalez.webp')
  ) as seed(full_name, photo)
 where s.full_name = seed.full_name
   and s.edition   = 2026
   and s.photo_url is null;
