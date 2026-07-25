# PLAN DE FASES DEFINITIVO — App Feria Effix (para Claude Code)

> **Este documento reemplaza a** `Prompt_Desarrollo_por_Fases_Claude_Code.md` y a `FASES_2.0_CLAUDE_CODE.md`. Es la única fuente de verdad del desarrollo de aquí en adelante.
> Julio 2026 → evento **15–19 de octubre de 2026** (~11 semanas).

---

## Decisiones cerradas (no se re-litigan)

1. **Lenguaje: TypeScript en todo** — web, backend y móvil comparten lenguaje y repo.
2. **Stack:** Next.js 16 + React 19 + Tailwind v4 + Supabase + Vercel (lo ya construido se evoluciona, nunca se reescribe). **Móvil: Capacitor** empaqueta esta misma app para Google Play y App Store (Fase 22). NO Flutter, NO React Native en 2026.
3. **En 2026 el ingreso físico lo controla La Tiquetera.** El QR de la app NO es entrada este año: es la **Credencial Effix** — identidad del asistente dentro de la feria (networking + pasaporte de stands). La arquitectura queda *access-ready* para asumir el ingreso en 2027.
4. **Tipos de acceso del evento:** General, VIP, Black, Ponente, Stand. **En 2026 se construye la experiencia de Generales** (el 90% del aforo); Stand se activa vía Exhibitor Hub (Fase 19); VIP/Black/Ponente son capas del backlog 2027 sobre la misma base.
5. **3 anillos de acceso en la app:** Gratis (Comunidad + Credencial) → Alumni de por vida (Academia) → Boleta vigente (Agenda, Mapa, Stands, Ponentes, Alianzas, Pasaporte).
6. **NO en 2026:** app nativa desde cero, mensajería interna, leaderboard, GPS indoor, pasarela de pagos propia, IA con embeddings (matchmaking por reglas rol × intención × país).

### Reglas de portabilidad móvil (ley desde la Fase 13 en adelante)

- Nada de APIs del navegador directas en componentes: siempre adaptadores en `src/lib/platform/` (`storage.ts`, `camera.ts`, `notifications.ts`, `share.ts`, `haptics.ts`). Hoy implementación web; en Fase 22 se sustituyen por plugins de Capacitor sin tocar la UI.
- Lógica de negocio en `src/lib/`, nunca dentro de componentes.
- Safe areas (`env(safe-area-inset-*)`) en el shell.
- Deep links con rutas limpias (serán universal links en las apps de tienda).
- Todo parámetro operativo (fechas, límites, ventanas) en `app_config` / `editions` — cero hardcode.

### Cómo usar este documento con Claude Code

1. Pega **una fase a la vez** en Claude Code, en orden. Nunca varias juntas.
2. Revisa lo construido antes de avanzar — no sigas sobre una base rota.
3. Cada fase asume las anteriores terminadas.
4. Las Fases 0–11 **ya están construidas** — no se le piden a Claude Code; el Bloque A documenta qué son y qué ajustes heredan.

---

# BLOQUE A — Lo ya construido (Fases 0–11) y su nuevo rol

| Fase | Módulo | Estado | Su rol bajo las nuevas decisiones |
|---|---|---|---|
| 0 | Configuración del proyecto (Next.js + Tailwind + Supabase + marca) | ✅ Construida | Sin cambios. Base correcta. |
| 1 | Sistema de diseño (glass/cromo, botones, BottomNav, storybook) | ✅ Construida | La BottomNav gana el acceso central "Credencial" en Fase 14. |
| 2 | Autenticación y perfil | ✅ Construida | El perfil gana `connect_code` y redes compartibles en Fase 14. Fixes de UX de auth en Fase 21. |
| 3 | Tickets (QR TOTP offline, import CSV La Tiquetera, Black manual) | ✅ Construida | **Cambio de rol:** el QR ya no es entrada 2026 — es la base técnica de la Credencial Effix. El import CSV sigue siendo vital: define quién tiene boleta vigente y desbloquea módulos. Multi-día por tier se ajusta en Fase 12. |
| 4 | Agenda | ✅ Construida | Pasa de 3 a 5 días (15–19 oct) en Fase 12; gana Mi Agenda + realtime en Fase 17. |
| 5 | Mapa | ✅ Construida | Sin GPS indoor (decisión firme). Gana integración con pasaporte (zonas faltantes) en Fase 15. |
| 6 | Stands | ✅ Construida | Evoluciona a Exhibitor Hub con niveles y leads en Fases 15 y 19. |
| 7 | Ponentes (rating, preguntas, follow) | ✅ Construida | Sus preguntas evolucionan a Q&A moderado en vivo en Fase 18. |
| 8 | Academia | ✅ Construida | Gana progreso, colecciones, teaser gratis y pipeline en Fase 20. |
| 9 | Alianzas Estratégicas | ✅ Construida | Gana tracking de clics/conversiones en Fase 19. Referrals reales pendientes (Fase 12). |
| 10 | Comunidad y Networking | ✅ Construida | Sus perfiles alimentan la Credencial Effix (Fase 14). |
| 11 | Panel admin | ✅ Construida | Se completa y blinda en Fases 12, 18 y 21. |

> La antigua "Fase 12 — Pruebas y despliegue" del documento original queda absorbida por la **Fase 21 (hardening pre-evento)** de este plan.

---

# BLOQUE B — El trabajo que sigue (Fases 12–22)

## Mapa de fases

| Fase | Nombre | Semanas | Prioridad |
|---|---|---|---|
| 12 | Estabilización | 1 | 🔴 Bloqueante |
| 13 | Cimientos app-ready (portabilidad) | 1 | 🔴 Bloqueante |
| 14 | Credencial Effix — scan-to-connect | 1.5 | 🔴 MVP General |
| 15 | Pasaporte de stands + leads | 1.5 | 🔴 MVP General |
| 16 | Push + centro de notificaciones | 1 | 🟠 |
| 17 | Mi Agenda + tiempo real | 1 | 🟠 |
| 18 | Q&A en vivo + encuestas | 1 | 🟠 |
| 19 | Exhibitor Hub (Stands 2.0) | 1.5 | 🟠 Ingresos |
| 20 | Academia 2.0 | 1 | 🟡 |
| 21 | Dashboard día-del-evento + hardening | 1 | 🔴 Pre-evento |
| 22 | Empaquetado Capacitor → stores | 2 | 🟢 Post-evento |

---

## FASE 12 — Estabilización

```
Lee docs/ESTRUCTURA_MAESTRA_APP_2026.md y docs/arquitectura/08_HALLAZGOS.md. Vamos a estabilizar el repo antes de construir features nuevas. Contexto clave: este año La Tiquetera controla el ingreso físico al evento; el QR de la app será la identidad interna del asistente (Credencial Effix, se construye en fases siguientes), así que el sistema de tickets se mantiene pero su rol es vincular la boleta comprada y desbloquear módulos, no validar puerta.

Ejecuta en este orden:

1. Fix textareas del admin (hallazgo #1): AdminStandsClient, AdminPonentesClient, AdminAcademiaClient, AdminAlianzasClient — replica el patrón de useState real de AdminAgendaClient.
2. Multi-edición real: crea tabla `editions` (id, year, name, starts_on, ends_on, days int, is_active) con seed 2026 = 15 a 19 de octubre de 2026, 5 días. Elimina TODOS los años/fechas hardcodeados: toEventTimestamp en admin/agenda/actions.ts, CHECK de recordings.edition, constantes EDITIONS y DAYS en los clients. Todo lee de `editions` y la edición activa.
3. Modelo multi-día de boletas: crea tabla ticket_types (código, nombre, días que habilita como rango o array, precio) — Black/VIP: 5 días (15–19), General/Pasaporte 3 Días: días 16–18, entrada diaria: 1 día, Corporativa (equipos 10+, mismos días que General). Precios vigentes del sitio: Pasaporte $201.300, VIP $1.155.000, Black $3.997.000 (400 cupos). El ticket referencia su tipo; nada hardcodeado. Política oficial del sitio: las entradas NO son reembolsables pero SÍ transferibles — implementa la transferencia de titular (con registro de origen/destino/fecha) y elimina el flujo de reembolso self-service; refund_full_days_before_event queda solo como config administrativa interna.
4. PWA instalable: genera iconos (192, 512, maskable) con el logo desde public/, complétalos en manifest.webmanifest.
5. Limpieza de sesión: invoca clearCachedTickets() en el logout (hallazgo #13).
6. Configuración operativa: mueve black_whatsapp_url y refund_full_days_before_event a la tabla app_config editable desde admin; marca los referral_url y video_url de seeds como pendientes visibles en el admin (badge "placeholder").
7. Extrae assertAdmin() duplicada a src/lib/adminGuard.ts y úsala en los 6 archivos.
8. Crea .env.example con todas las variables y actualiza el README raíz al estado real del repo.

No agregues features nuevas en esta fase. Al final dame un resumen de qué quedó arreglado y corre el build para verificar que compila.
```

---

## FASE 13 — Cimientos app-ready (portabilidad móvil)

```
Preparamos el repo para que esta misma base se empaquete como app nativa con Capacitor más adelante (Google Play y App Store), sin empaquetar todavía. Regla de oro desde hoy: ningún componente usa APIs del navegador directamente — todo pasa por adaptadores.

1. Crea src/lib/platform/ con adaptadores:
   - storage.ts: get/set/remove async. Implementación web = localStorage. Migra ticketStore.ts a este adaptador.
   - camera.ts: interfaz scanQR() que abre cámara y devuelve el texto del QR. Implementación web con BarcodeDetector API y fallback a la librería qr-scanner (npm). Aún no se usa en UI — se consume en Fases 14-15.
   - notifications.ts: interfaz subscribe()/unsubscribe() — la implementación web se completa en Fase 16; deja la interfaz definida.
   - share.ts: Web Share API con fallback a copiar al portapapeles.
   - haptics.ts: vibración con navigator.vibrate y no-op si no existe.
2. Safe areas: agrega env(safe-area-inset-top/bottom) al shell (layout, BottomNav, PageHeader) para notch/gestos de iOS y Android.
3. Registra en el CLAUDE.md del repo las reglas: (a) nunca usar APIs de navegador fuera de src/lib/platform/, (b) todo módulo nuevo DEBE llamar getAccess(), (c) nada hardcodeado de edición/fechas — usar editions y app_config.
4. Testing base: instala Vitest y escribe tests para totp.ts (vectores conocidos), access.ts (matriz de acceso por anillo) y el adaptador storage. Agrega Playwright con UN flujo: login → ver boleta → QR renderiza y rota.
5. Instala Capacitor (npm i @capacitor/core @capacitor/cli) y crea capacitor.config.ts con appId com.feriaeffix.app — solo configuración, sin agregar plataformas todavía.

Verifica build + tests verdes antes de terminar.
```

---

## FASE 14 — Credencial Effix: scan-to-connect

```
Construimos el corazón del MVP para asistentes Generales: el QR como tarjeta de presentación. Contexto: este año La Tiquetera valida la entrada física; nuestro QR es la identidad del asistente DENTRO de la feria.

Modelo de datos (SQL idempotente en supabase/phase14_credencial.sql):
1. Agrega a profiles: connect_code (código corto único e inmutable, 8 chars alfanuméricos, generado por trigger al crear perfil) y campos de contacto opcionales: whatsapp, instagram, linkedin, cada uno con su boolean de "compartir".
2. Tabla connections: id, owner_id, connected_profile_id, note text, created_at, UNIQUE(owner_id, connected_profile_id). RLS: cada quien ve/edita solo sus conexiones.

Pantallas:
3. /credencial — la Credencial Effix: tarjeta glass/cromo con nombre, rol, país, foto y un QR estático cuyo payload es effix://connect/{connect_code}. Si el usuario tiene boleta vigente, la tarjeta muestra el tier con el código de color OFICIAL del sitio (ver docs/ANALISIS_BRANDING_FERIAEFFIX_2026.md): General/Pasaporte = lavanda #726E8D, VIP = dorada, Black = plata/cromo animada. Botón grande "Escanear" que abre la cámara vía el adaptador camera.ts.
4. Flujo de escaneo: A escanea el QR de B → conexión EN AMBOS SENTIDOS (RPC transaccional) → pantalla de éxito con el perfil de B, sus redes compartidas y campo "nota" (dónde lo conocí / de qué hablamos). Maneja: código inexistente, auto-escaneo, conexión ya existente (muestra la existente).
5. /credencial/contactos — "Mis contactos Effix": lista buscable y filtrable por rol/país, nota editable, botones directos a WhatsApp/IG/LinkedIn, botón "Exportar CSV".
6. Acceso: la credencial con QR requiere solo estar registrado (anillo gratis) — el networking es el gancho de la app. El tier visual solo aparece con boleta vigente.
7. La BottomNav gana el acceso "Credencial" (ícono QR, posición central destacada).
8. Offline: la credencial propia se cachea con el adaptador storage; los escaneos hechos sin señal se encolan y sincronizan al volver la conexión.

Tests: RPC bidireccional (no duplica, no auto-conecta) y render de credencial offline.
```

---

## FASE 15 — Pasaporte de stands + captura de leads

```
Segunda pieza del MVP General: el mismo QR de la Credencial se vuelve pasaporte de premios, y de paso genera los leads que monetizamos con expositores en la Fase 19.

Modelo de datos (supabase/phase15_pasaporte.sql):
1. Tabla stand_staff: stand_id, user_id — usuarios autorizados como staff de un stand (los asigna el admin).
2. Tabla stand_scans: id, stand_id, profile_id, scanned_by, created_at, UNIQUE(stand_id, profile_id) — un sello por stand por asistente. Este registro ES el lead del expositor.
3. Tabla passport_campaigns: edition, name, goal_type ('total' | 'por_zona'), goal_value, prize_description, active. CRUD en admin.

Flujos:
4. Modo staff: si el usuario es staff de un stand, en /credencial aparece el toggle "Modo stand" → escanea credenciales de asistentes → cada escaneo registra sello + lead con confirmación visual + vibración (adaptador haptics). Funciona offline con cola de sincronización.
5. /pasaporte (asistente): progreso visual de sellos por zonas del mapa, meta de la campaña activa y premio. Al completar: pantalla de celebración + registro en passport_completions (el canje físico lo maneja el equipo Effix; el admin ve la lista).
6. Deep-links: cada sello enlaza al perfil del stand; desde el mapa se ven las zonas faltantes.
7. Requiere boleta vigente (anillo 3).
8. Admin: sección Pasaporte (campañas, completados, export) y asignación de staff a stands.

Anti-trampa mínima: UNIQUE evita doble sello y scanned_by deja auditoría.
Tests: unicidad de sello, cola offline, cálculo de progreso.
```

---

## FASE 16 — Notificaciones push + centro de notificaciones

```
Sistema central de engagement (regla: útil, nunca spam).

1. Web Push con VAPID: instala web-push, genera claves (env vars), completa el adaptador notifications.ts (subscribe/unsubscribe + tabla push_subscriptions por usuario/dispositivo). El SW existente gana handler de push + click con deep-link.
2. Tabla notifications: id, title, body, url, audience (all | tier | rol | módulo), created_by, sent_at + tabla notification_reads.
3. Centro de notificaciones in-app: campana en el header con badge de no-leídas → historial (cubre a quienes no aceptan push).
4. Admin: editor de envío con segmentación (todos / tier de boleta / rol de perfil), vista previa y confirmación. Envío por server action con service key, en lotes.
5. Automáticas: cambio de sala/hora de charla guardada (se activa en Fase 17), nueva conexión recibida, sello de pasaporte registrado.
6. Anti-spam: máximo de pushes de marketing/día desde app_config (default 2); las operativas no cuentan. Opt-out por categoría en /perfil.
7. Permiso de push: NO pedirlo al abrir la app; pedirlo en el primer momento de valor (primera charla guardada o primera conexión), con pantalla previa explicando el beneficio.

Tests: segmentación de audiencia y límite anti-spam.
```

---

## FASE 17 — Mi Agenda + tiempo real

```
1. Tabla saved_talks (user_id, talk_id, UNIQUE). Botón guardar/quitar en cada charla.
2. Vista "Mi Agenda" en /agenda (tab Toda / Mía): itinerario personal con detección visual de conflictos de horario.
3. Recordatorio push 15 minutos antes de cada charla guardada (pg_cron de Supabase o Vercel Cron cada 5 min).
4. Supabase Realtime en talks: cambios de sala/hora/cancelación se reflejan en vivo con banner "Actualizado" y disparan push a quienes la guardaron.
5. Filtros: por día (los 5 días desde editions), por auditorio y por track (agrega campo track a talks + chips).
6. Agenda cacheada offline (adaptador storage) — dentro del recinto la señal es mala.
7. Admin agenda: al editar una charla, sincroniza los campos duplicados del ponente (talk_title, talk_starts_at) — elimina el acople manual (hallazgo #27).
```

---

## FASE 18 — Q&A en vivo + encuestas

```
1. Q&A moderado: evoluciona QuestionsBox — preguntas con estado (pendiente | aprobada | respondida | descartada). Upvote de aprobadas (tabla question_votes, UNIQUE user+question).
2. /admin/qa/[talk_id]: moderación en vivo + vista /proyector/qa/[talk_id] de solo lectura con tipografía gigante para proyectar en el auditorio, ordenada por votos. Realtime en ambas.
3. Encuesta flash post-charla: al marcar el admin la charla "finalizada", push a quienes la guardaron → 1 tap: estrellas 1-5 + comentario opcional (reusa el rating de ponentes). Alimenta el filtro de calidad de Academia.
4. Votaciones en vivo: tabla live_polls (talk_id, pregunta, opciones jsonb, activa) → el admin la activa → los asistentes votan → /proyector/poll/[id] muestra barras animadas en tiempo real.
5. NPS del evento: encuesta 0-10 + comentario por push el último día, agregados en admin.
```

---

## FASE 19 — Exhibitor Hub (Stands 2.0)

```
Convertimos Stands en producto de ingresos. Lee la sección Módulo 4 de ESTRUCTURA_MAESTRA_APP_2026.md.

1. Niveles de patrocinio: campo tier en stands (basico | plata | oro | diamante). Por nivel: básico = descripción+logo; plata = +galería y video; oro = +catálogo y botón WhatsApp directo; diamante = +posición destacada y banner en home. Configurable en admin.
2. Portal del expositor /mi-stand (usuarios en stand_staff): editar perfil según tier, gestionar reuniones (aceptar/rechazar con franja) y dashboard de leads.
3. Leads: dashboard con los perfiles escaneados en su stand (Fase 15) — nombre, rol, país, contacto compartido, fecha — con búsqueda y export CSV habilitado según tier (es parte de lo que se vende).
4. Reuniones con intención: al solicitar cita, el asistente declara intención (quiero comprar | busco proveedor | busco alianza | otro) + mensaje corto. Fix hallazgo #11: estado persistente en UI y UNIQUE(user, stand).
5. Métricas para Effix en admin: leads por stand, reuniones por stand, ranking de tráfico — los números con los que el equipo comercial vende stands y niveles 2027.
```

---

## FASE 20 — Academia 2.0

```
1. Progreso de reproducción: tabla watch_progress (user, recording, seconds, completed) — "continuar viendo" en el home de Academia.
2. Colecciones por tema y edición (curadas en admin) + buscador por título/ponente/tema.
3. Teaser gratuito: campo is_free en recordings — 1 o 2 charlas destacadas para el anillo gratis, con CTA a boleta 2027 al terminar el video.
4. Pipeline de publicación en admin: borrador → en revisión → publicada, con metadata completa. Fix del seed duplicador (hallazgo #4) y paginación del listado (hallazgo #29).
5. Ratings alimentan visibilidad: orden por calificación en cada colección. Fix privacidad: recording_ratings ya no expone user_id (hallazgo #15).
```

---

## FASE 21 — Dashboard día-del-evento + hardening (pre-evento)

```
La fase de "que no se caiga nada el 15 de octubre". Absorbe la antigua fase de pruebas y despliegue.

1. /admin/evento — dashboard en vivo: escaneos de credencial por hora, sellos por stand, sesión en curso por auditorio, últimas push enviadas, salud de la cola offline.
2. Hardening: rate limit en RPCs públicas (conexiones, votos, escaneos); mensajes de error humanos en TODOS los forms de auth (hallazgo #17); guardia de sesión de recovery en /clave-nueva (#18); manejo de errores de assertAdmin sin romper UX (#19); confirmación antes de todo hard delete (#12); paginación y buscador en listados admin (#32).
3. Redirect de retorno tras login (?next=) y manejo del ?error=auth en /ingresar (#9, #10).
4. npm audit fix de vulnerabilidades high; revisión de RLS de todas las tablas nuevas (Fases 14-20) contra la matriz de acceso.
5. Playwright E2E de los flujos del día del evento: registro → vincular boleta → credencial → conexión → sello → Mi Agenda con recordatorio.
6. Simulacro de carga básico (script k6 sencillo) sobre las RPCs de escaneo — 50.000 asistentes potenciales.
```

---

## FASE 22 — Empaquetado Capacitor → App Store y Google Play (post-evento)

```
Con el evento ejecutado y la app validada por miles de usuarios, la llevamos a las tiendas para el ciclo 2027 (Academia + Comunidad todo el año son la razón de estar en el bolsillo).

1. npx cap add android && npx cap add ios sobre el capacitor.config.ts de la Fase 13. Evalúa Capacitor con URL remota vs export estático según lo que use el repo; documenta la decisión.
2. Sustituye implementaciones web de src/lib/platform/ por plugins nativos (con detección de plataforma): @capacitor/preferences (storage), @capacitor-mlkit/barcode-scanning (cámara), @capacitor/push-notifications (FCM/APNs — el backend de push gana un provider nativo junto al Web Push), @capacitor/share, @capacitor/haptics.
3. Deep links universales (https://app.feriaeffix.com/...) en ambos stores.
4. Splash screens e iconos nativos con el brandbook (negro + logo cromado).
5. Checklist de publicación: cuentas developer (Google $25 único, Apple $99/año), política de privacidad, screenshots, fichas en español.
6. La PWA sigue viva como canal sin fricción; las apps de tienda son el canal de retención anual.
```

---

## Backlog 2027 (no construir en 2026 — aquí para que no se pierda)

- **Ingreso propio:** activar el QR TOTP como entrada al recinto (la arquitectura ya queda lista); negociar API/webhook con La Tiquetera o pasarela propia.
- **Capa VIP:** modo concierge — RSVP a masterminds y cena exclusiva, reserva de silla, acceso anticipado visible.
- **Capa Black:** agendador de las 9 mentorías 1:1 con slots de mentores, soporte directo en app, matchmaking curado entre Blacks.
- **Portal Ponente:** autogestión de perfil, moderación de su propio Q&A, reporte de impacto post-charla (rating, asistentes, preguntas, seguidores ganados).
- **Membresía anual de Academia** como producto independiente de la boleta.
- **Matchmaking con IA** (embeddings) sobre los datos de conexiones e intenciones capturados en 2026.
- Evaluar React Native/Expo solo si Capacitor muestra límites reales.

---

## Criterio de recorte si el tiempo aprieta

Si llegamos a septiembre con retraso, el orden de sacrificio es: **Fase 20** (Academia 2.0 puede salir post-evento) → **Fase 18 parcial** (dejar Q&A, sacrificar polls) → **Fase 19 parcial** (dejar leads, sacrificar portal self-service). **Nunca se recortan las Fases 12, 13, 14, 15 y 21** — sin ellas no hay MVP General ni evento estable.
