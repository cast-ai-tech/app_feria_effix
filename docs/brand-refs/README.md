# Referentes de diseño — feriaeffix.com

Assets oficiales extraídos del sitio real (2026-07-24). Esta carpeta es de
**referencia** (no se empaqueta en la app). Lo que la app SÍ usa vive en
`public/brand/`, `public/icons/` y `public/ponentes/`.

## Identidad del sitio real

| Elemento | Valor |
|---|---|
| Color primario | `#73708E` (lavanda — coincide con `--brand-lav` de la app) |
| Color secundario | `#43405E` |
| Acento | `#263164` (azul tarjeta — ya es `--texto-tarjeta`) |
| Fondo | `#000000` (negro puro) |
| Tipografía | Montserrat (misma de la app) |
| Botón primario | fondo `#73708E`, **border-radius 25px** (píldora), texto blanco |
| CTA principal | "COMPRA TU PASAPORTE 3 DÍAS" |
| Favicon / ícono | X brush con flecha (azul oscuro `#151729`) — base de los íconos PWA |

## Contacto oficial (del sitio)

- Consultas generales / Entrada Black: **+57 322 712 8649** (ya está en `app_config.black_whatsapp_url`)
- Stands / expositores: **+57 320 655 6725**
- Inversionistas: **+57 314 768 0442**
- Venta Black online: checkout Wompi + Payco (links en /boleta-black/)
- Venta general: La Tiquetera

## Estructura

- `logos/` — logo 2026 horizontal (negro), **logo cromado apilado oficial**
  (el mismo que compartió Alexander), logo 2025, logo Grupo Effi, favicon.
- `tiers/` — botones y títulos oficiales de cada entrada: Pasaporte 3 Días,
  VIP dorado, Entrada Black. Referente clave de la paleta de tiers
  (General=lavanda, VIP=oro, Black=plata/cromo).
- `ponentes/` — 13 fotos oficiales de ponentes 2026 (copiadas también a
  `public/ponentes/` y asignadas en la tabla `speakers` por migración 022).
- `memorias/` — fotos reales de las ediciones 2021, 2022, 2023, 2023-Ecuador,
  2024 y 2025 (5 por edición). Útiles para banners, Academia y vacíos de UI.
- `iconos/` — íconos 3D metálicos/cromados del sitio (estilo de ilustración
  oficial: chrome + lavanda sobre negro).
- `titulos/` — títulos de sección como arte (brush-script cromado). REGLA:
  este lettering NUNCA se recrea con tipografía — solo como asset.
- `fondos/` — fondos y decoraciones oficiales + **planimetría 2026**
  (`planimetria-2026.webp`, mapa real del recinto — útil para módulo mapa).
- `versiones/` — tarjetas informativas oficiales de cada edición (2021–2025).
- `sponsors/` — logos de marcas aliadas reales (Prendas Control, Unmerco,
  Vitalcom, Pancake, Convertmate, Tu Imperio YouTube) — buen contenido demo
  para el placement `footer_strip`.

## Qué quedó activo en la app

1. `public/brand/logo-horizontal-blanco.png` — logo oficial horizontal
   invertido a blanco (el original es negro): lo usa `BrandLogo` en el header.
2. `public/brand/logo-cromado.png` — logo cromado apilado oficial (recortado),
   respaldo del header y disponible para splash/pantallas grandes.
3. `public/icons/icon-192|512|512-maskable.png` — íconos PWA regenerados con
   la X oficial (blanca sobre negro). Ya no son placeholders.
4. `public/ponentes/*.webp` + migración `20260101000022` — fotos reales en el
   módulo Ponentes.
5. Migración `20260101000023` — WhatsApp real de consultas Black.
6. `public/mapa/planimetria-2026.webp` — planimetría oficial en el módulo
   Mapa (`PlanimetriaViewer`: tap para ampliar + zoom) y zonas del plano real
   (4 auditorios por pabellón de color, Hall, Black/VIP, Plazoleta).
7. `public/academia/edicion-*.webp` — cover con foto real de la edición
   seleccionada en Academia (2021–2025).
8. Bucket `banners/brand/` — 6 sponsors reales activos en `footer_strip` y
   Grupo Effi en el splash "Con el apoyo de" (demos desactivados, no borrados).
9. `AuthHero` — logo cromado apilado en /ingresar y /registro.
