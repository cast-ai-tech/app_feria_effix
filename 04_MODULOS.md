# 04 · Los 8 módulos de la app asistente

Patrón común: `page.tsx` es **Server Component** que hace `getAccess()` + queries con RLS y pasa props a un `*Client.tsx` para la interacción. Mutaciones desde el cliente browser + `router.refresh()`.

## Home — `/`
Server Component público. Marca "FERIA EFFIX", saludo personalizado (`profiles.full_name` o parte local del email), CTA de cuenta y grilla 2×4 con los 8 módulos. Con sesión → "Ver mi perfil"; sin sesión → "Ingresar" / "Crear cuenta".

## 1. Tickets — `/tickets` 🎟️
**Acceso:** login (redirect duro a `/ingresar`). No exige boleta: es la página que la resuelve.

**Al renderizar:** ejecuta `rpc("claim_my_tickets")` (auto-vincula boletas huérfanas por email) y luego en paralelo: `tickets` del usuario, `ticket_types` (labels) y `app_config.black_whatsapp_url`.

**Con boletas** → `<TicketQR>`: QR con clave dinámica TOTP que rota cada 30 s, funciona **offline** (detalle completo en [07_TICKETS_QR_OFFLINE.md](./07_TICKETS_QR_OFFLINE.md)). Boletas `active|used` muestran "Incluye acceso a Academia · Permanente".

**Sin boletas** → `<NoTicket>`: 3 caminos — "Buscar mi boleta" (RPC claim), vinculación manual por orden+correo (RPC `link_ticket_by_order`) y "Solicitar Black por WhatsApp" (venta 100% manual, la app no cobra).

## 2. Agenda — `/agenda` 🕐
**Acceso:** boleta vigente o admin.
**Query:** `talks` de la edición actual, orden por `starts_at`.
**`AgendaClient`:** chips Día 1/2/3 (16–18 oct), detecta "Hoy" comparando fechas en TZ `America/Bogota` (no la del dispositivo), badge "🔴 Ahora" recalculado cada 30 s con `setInterval` (solo re-evalúa, no refetchea), charlas canceladas tachadas, enlace al detalle del ponente si hay `speaker_id`. Sin escrituras.

## 3. Mapa — `/mapa` 🗺️
**Acceso:** boleta vigente o admin.
**Sin base de datos:** `VenueMap` es Server Component con arreglo estático `ZONES` (registro, auditorios, stands, alianzas, comida, baños) — decisión documentada, migrable a tabla `venue_zones` sin cambiar la interfaz. Cada zona navega a su módulo. Badge "🛰️ Mapa GPS con coordenadas reales · próximamente".

## 4. Stands — `/stands` 🏬
**Acceso:** boleta vigente o admin.
**Query:** `stands` de la edición actual (el directorio rota por edición, no mezcla años).
**`StandsClient`:** buscador (nombre/categoría/número) + chips de categoría. "Agendar cita" abre form inline → `insert` en `stand_meetings` (`{stand_id, user_id, message}`). Tras enviar muestra badge "Solicitada" — ⚠️ solo estado local: al recargar reaparece el botón (no relee solicitudes previas, posibles duplicados).

## 5. Ponentes — `/ponentes` y `/ponentes/[id]` 🎤
**Acceso:** boleta vigente o admin. Deep-link a ponente de otra edición → `notFound()` (salvo admin).

**Lista:** `speakers` de la edición + `speaker_ratings` para promediar estrellas en memoria.

**Detalle (`[id]`):** perfil completo (foto, bio, redes normalizadas) + 4 queries paralelas (rating global, mi voto, si lo sigo, últimas 100 preguntas). Tres componentes interactivos:
- **`FollowButton`**: insert/delete en `speaker_follows` (toggle "Seguir"/"Siguiendo ✓").
- **`RatingStars`**: upsert en `speaker_ratings` — **solo habilitado después de la charla** (`talk_starts_at < now`); antes muestra "Podrás calificar después de la charla."
- **`QuestionsBox`**: insert en `speaker_questions` con update optimista local + `router.refresh()`. ⚠️ "Preguntas en vivo" sin realtime ni moderación en esta fase.

## 6. Academia — `/academia` 🎓
**Acceso especial — alumni de por vida:** basta una boleta `active|used` de **cualquier** edición (o admin). No requiere boleta vigente. Es el motor de venta anticipada de la siguiente edición.

**Query:** `recordings` con `approved = true` (todas las ediciones ⚠️, filtro por edición es client-side) + `recording_ratings` agregadas en servidor (promedio, conteo, mi voto).

**`AcademiaClient`:** chips de edición hardcodeados `[2026, 2025, 2024]`, tarjetas con estrellas interactivas (upsert) y enlace externo al `video_url` (YouTube). Badge "🔓 Acceso permanente".

## 7. Alianzas — `/alianzas` 🤝
**Acceso:** boleta vigente o admin.
**Query:** `offers` activas de la edición actual.
**Modelo de negocio:** cada oferta tiene `referral_url` **administrado por Feria Effix** — la comisión del referido la gana la feria, no embajadores individuales. Tarjetas con aliado, beneficio ("30% OFF") y botón "Ver oferta →".

## 8. Comunidad — `/comunidad` 🌐
**Acceso:** el más abierto — **solo login, gratis para cualquier registrado** (sin boleta). Estrategia de embudo del Master Prompt.

**Query:** vista `community_directory` (hasta 1000 perfiles; excluye `ticket_email` e `is_admin` por diseño; invisible para `anon`).

**`ComunidadClient`:** buscador + chips de rol y país (derivados de los datos), tarjetas con avatar de inicial y botones "conectar" externos: WhatsApp (`wa.me/{dígitos}`), Instagram, LinkedIn (URLs normalizadas). **Sin mensajería interna, sin feed, sin gamificación** — decisión explícita del Master Prompt (aprendizaje de Whova). 100% presentacional: cero llamadas a Supabase desde el cliente.

## Páginas auxiliares

- **`/perfil`**: form de perfil (nombre, país, rol con "Otro…", bio, `ticket_email`, redes) → `update` sobre `profiles`. Si `is_admin` → enlace al panel `/admin`. Botón cerrar sesión.
- **`/storybook`**: catálogo visual del design system (paleta, tipografía, GlassCard, Button, Badge, chips). Pública, sin datos.
