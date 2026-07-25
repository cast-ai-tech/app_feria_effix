# ESTRUCTURA MAESTRA — App Feria Effix 2026+
## Arquitectura definitiva basada en el benchmark de las 10 mejores apps de eventos del mundo

> Documento de arquitectura de producto v2.0 — Julio 2026.
> Consolida: (a) contexto actualizado de Feria Effix, (b) auditoría del código existente (Fases 0–11 ya construidas), (c) benchmark de las top 10 plataformas de eventos, (d) la estructura maestra de módulos a implementar y (e) el roadmap de ejecución.

---

## 1. Contexto: qué es Feria Effix (actualizado a julio 2026)

Feria Effix es la feria de comercio electrónico más grande de Latinoamérica (se promociona como "la feria de e-commerce más grande del mundo"), organizada por EFFIX S.A.S., filial de Grupo Effi. Opera desde 2021 con ediciones consecutivas 2022–2025.

**Edición 2026:**

| Dato | Valor |
|---|---|
| Fechas | 15–19 de octubre de 2026 (Black y VIP: 5 días; General: 16–18 oct) |
| Lugar | Plaza Mayor, Medellín (Cra. 57 # 41-81, La Candelaria) |
| Asistentes esperados | 50.000+ |
| Marcas expositoras | 380+ |
| Conferencias y talleres | 180+ |
| Boletas | Black (premium: 9 mentorías, zonas exclusivas, alimentación), VIP (masterminds privados, cena exclusiva, sillas reservadas), Pasaporte 3 días, entradas por día |
| Audiencia | Emprendedores, infoproductores, dueños de marca, marketplaces, mayoristas, logística, agencias |

⚠️ **Nota vigente del Master Prompt:** persiste la discrepancia de cifras entre el sitio web (380+ marcas / 180+ conferencias) y la carta AFA (1.000+ marcas / ~400 conferencias). No usar cifras dentro de la app hasta resolverla.

⚠️ **Cambio detectado vs. docs internos:** los documentos del repo dicen "16–18 de octubre"; el sitio oficial ya publica **15–19 de octubre** (5 días para Black/VIP). Esto impacta el módulo Agenda (días 1–5, no 1–3) y el bug ya documentado de `toEventTimestamp` hardcodeado.

---

## 2. Estado real del proyecto (auditoría del repo)

**Lo que ya existe y funciona** (commit "Fases 0–12"): Next.js 16 + React 19 + TypeScript + Tailwind v4 + Supabase + Vercel. PWA móvil (max 440px) con 8 módulos operativos de punta a punta: Tickets (QR TOTP dinámico offline), Agenda, Mapa, Stands, Ponentes, Academia, Alianzas, Comunidad + panel `/admin` con 6 secciones. Design system cromo/glass fiel al brandbook (negro `#000000`, blanco `#FFFFFF`, lavanda `#726E8D`, Montserrat).

**Esto NO se bota — es una base sólida.** La decisión arquitectónica de este documento es **evolucionar la base existente**, no reescribir. Reescribir desde cero a 3 meses del evento sería el error clásico del emprendedor perfeccionista.

**Deuda crítica heredada (de 08_HALLAZGOS.md) que bloquea producción:**

1. 🔴 Textareas del admin no aceptan texto (4 pantallas).
2. 🔴 Sin escáner QR de check-in (el `verifyTotp()` existe pero no hay UI de puerta).
3. 🔴 Fechas hardcodeadas a oct-2026 y ediciones con CHECK que rompe 2027.
4. 🔴 PWA no instalable (manifest sin iconos).
5. 🟠 Placeholders de producción: WhatsApp Black falso, referral URLs de ejemplo, videos repetidos.
6. 🟡 Secret TOTP no se limpia en logout; catálogos públicos vía anon key.

---

## 3. Benchmark: las 10 mejores apps de eventos del mundo (2026)

| # | Plataforma | Fortaleza distintiva | Qué le robamos |
|---|---|---|---|
| 1 | **Bizzabo** (8.8/10) | Captura de leads nativa para expositores + smart badges Klik (wearables) + check-in enterprise | Lead capture como producto que se le VENDE al expositor; check-in conectado a la experiencia |
| 2 | **Cvent Attendee Hub** (8.4/10) | Agenda personalizada sincronizada, ecosistema enterprise completo | "Mi agenda": sesiones guardadas → itinerario personal con recordatorios |
| 3 | **Swapcard** (8.2/10) | Plataforma "revenue-centric": marketplace de expositores (€180K promedio de ingresos extra), matchmaking IA, comunidad 365 días | El modelo de monetización por módulo; IA de recomendaciones; evento como comunidad anual |
| 4 | **Whova** (8.1/10) | Networking + community board + ice-breakers; agenda offline; encuestas y votación en vivo | Community board por temas; Q&A y encuestas en sesiones; pasaporte de stands (versión simple) |
| 5 | **Guidebook** (8.1/10) | Guías de evento con mapas y contenido según ubicación | Mapa por zonas simple y confiable antes que GPS indoor complejo |
| 6 | **Brella** | Matchmaking 1:1 por intenciones (compro/vendo/busco socio) con slots de reunión | Reuniones con "intención declarada" — perfecto para una feria B2B de e-commerce |
| 7 | **EventMobi** (7.4/10) | Encuestas y preguntas interactivas dentro de la sesión | Q&A en vivo por charla (ya tenemos QuestionsBox — hay que llevarlo a moderación en vivo) |
| 8 | **Grip** | IA de matchmaking B2B para ferias comerciales gigantes | Scoring de compatibilidad comprador-vendedor entre asistentes y stands |
| 9 | **Expo Pass** (7.4/10) | Time-to-launch rapidísimo, descubrimiento de sesiones | Simplicidad operativa: la app debe poder operarla el equipo Effix sin devs |
| 10 | **Webex Events / Attendify** (7.4/10) | Recomendaciones IA + streaming híbrido integrado | Streaming de auditorios principales hacia Academia (graba una vez, monetiza siempre) |

**Benchmark complementario (apps de mega-eventos de consumo, ya estudiado en el Master Prompt):** Tomorrowland/Coachella → offline-first y credencial única (ya implementado con TOTP offline ✅); Disney Genie → personalización sin fricción de onboarding; Web Summit → networking con recomendaciones IA como corazón de la app; quejas de Whova → NO gamificación de leaderboard.

**La conclusión estratégica del benchmark:** ninguna de las 10 combina ticketing + academia perpetua + marketplace de alianzas con comisión + red de embajadores multinivel. Ese sigue siendo el foso competitivo de Effix. Las top 10 nos enseñan *ejecución* de módulos, no *modelo*: el modelo ya es superior.

---

## 4. Estructura maestra de módulos

Arquitectura de **3 anillos de acceso** (evolución del modelo actual) + 12 módulos organizados por capa de valor:

```
ANILLO 1 — GRATIS (cualquiera registrado, todo el año)
├── Comunidad & Networking
├── Contenido teaser de Academia (1-2 charlas destacadas)
└── Home / Countdown / Noticias del evento

ANILLO 2 — ALUMNI (compró boleta alguna vez, de por vida)
├── Academia completa (repositorio de ponencias)
└── Historial de conexiones y certificados

ANILLO 3 — BOLETA VIGENTE (edición activa)
├── Ticket QR dinámico offline
├── Agenda en tiempo real + Mi Agenda
├── Mapa del recinto
├── Stands + reuniones
├── Ponentes + Q&A en vivo
├── Alianzas Estratégicas (marketplace)
└── Funciones premium por tier (VIP/Black)
```

### Módulo 1 — Tickets & Acceso *(existe → optimizar)*

**Ya construido:** QR TOTP rotativo 30s, offline-first, import CSV La Tiquetera, asignación manual Black.

**A implementar (del benchmark Bizzabo/Cvent):**
- **Escáner de check-in** (bug #6 — CRÍTICO): PWA `/admin/scanner` con cámara + `verifyTotp()`, modo offline con cola de sincronización, sonido/vibración de éxito/rechazo, contador de aforo en vivo.
- **Diferenciación visual por tier:** boleta Black con acabado cromo animado, VIP plateada, General estándar — el ticket es un objeto de estatus (aprendizaje de los smart badges Klik: la credencial es experiencia).
- **Multi-día:** el QR sabe qué días habilita (Black/VIP 5 días, General 3, entradas de 1 día).
- **Wallet passes** (Apple Wallet / Google Wallet) como fase 2 post-evento.

### Módulo 2 — Agenda & Mi Agenda *(existe → evolucionar)*

**Ya construido:** agenda por día con charlas.

**A implementar (Cvent/Whova):**
- **"Mi Agenda":** botón guardar sesión → itinerario personal, con detección de conflictos de horario.
- **Recordatorios push** 15 min antes de cada sesión guardada.
- **Cambios en tiempo real:** Supabase Realtime en la tabla `talks` — si una charla cambia de sala/hora, banner en la app + push a quienes la guardaron (esto justifica el copy "en tiempo real" que hoy es solo texto).
- **Filtros por track/tema/auditorio** y soporte de 5 días (arreglar hardcode).
- Fase 2: recomendaciones "te puede interesar" basadas en rol del perfil (Disney Genie sin fricción: se calcula solo, no pide configuración).

### Módulo 3 — Mapa *(existe → mejorar sin sobre-ingeniería)*

**Decisión anti-humo:** GPS indoor real (beacons/wifi-triangulación) es caro y frágil. Guidebook y Social Tables ganan con **planos interactivos por zonas**, no con GPS.
- Plano SVG interactivo de Plaza Mayor por zonas/pabellones con búsqueda ("¿dónde está el stand de X?" → resalta zona + ruta simple).
- Pins de servicios: baños, comida, enfermería, salidas, punto de encuentro.
- Deep-link desde Stands y Agenda ("ver en mapa").
- Fase 2 (2027): evaluar indoor positioning solo si el presupuesto lo aguanta.

### Módulo 4 — Stands & Expositores *(existe → convertirlo en producto de ingresos)*

**El aprendizaje más valioso de Swapcard/Bizzabo: el módulo de expositores no es un directorio, es un producto que se le vende al expositor.**
- **Perfiles por nivel de patrocinio** (Básico/Plata/Oro/Diamante): más fotos, video, catálogo de productos, botón de WhatsApp directo, posición destacada — cada nivel se vende con el stand físico.
- **Lead capture para el expositor:** el staff del stand escanea el QR del asistente → el asistente queda como lead con su perfil (nombre, rol, país, contacto). Post-evento, el expositor recibe su base de leads. **Esto se cobra** (Swapcard promedia €180K extra por evento con este marketplace).
- **Reuniones con intención (Brella):** al solicitar cita el asistente declara intención — "quiero comprar", "busco proveedor", "busco alianza" — y el expositor prioriza su agenda de reuniones.
- Arreglar: estado de cita persistente (bug #11), constraint única user+stand.

### Módulo 5 — Ponentes & Sesiones en vivo *(existe → activar el vivo)*

**Ya construido:** perfiles, rating, preguntas, follow.
- **Q&A moderado en vivo (EventMobi/Whova):** las preguntas enviadas llegan a una vista de moderador (`/admin/qa/[charla]`) proyectable en el auditorio; upvoting de preguntas por los asistentes.
- **Encuesta flash post-charla** (1 tap: ⭐1–5 + comentario opcional) con push al terminar la sesión — alimenta el filtro de calidad de Academia.
- **Certificado de asistencia** descargable por sesión/evento (muy valorado en LATAM, casi gratis de construir).

### Módulo 6 — Academia *(existe → es el activo más valioso, tratarlo como Netflix)*

**El diferenciador #1 vs. todas las top 10: nadie da acceso de por vida.** Academia es lo que mantiene la app viva 365 días y vende la boleta 2027.
- Reproductor con progreso guardado ("continuar viendo"), colecciones por tema/edición, buscador.
- **Pipeline de publicación:** grabación → revisión de calidad → publicación con metadata (ponente, tema, edición) — flujo en admin.
- **Streaming del auditorio principal (Webex Events):** transmitir en vivo las keynotes para VIP/Black remotos y grabar directo al pipeline de Academia.
- **Teaser gratuito:** 1–2 charlas legendarias abiertas para el Anillo 1 — el gancho de conversión a boleta.
- Fase 2: membresía anual Academia como producto independiente (oportunidad ya identificada en el Master Prompt, no MVP).

### Módulo 7 — Alianzas Estratégicas *(existe → medir para negociar)*

- Tracking de clics y conversiones por oferta (hoy no se mide nada): sin datos no hay renegociación de comisiones.
- Categorización y buscador de ofertas; badge "exclusivo Effix".
- Reemplazar los 5 referral URLs de ejemplo (bug #21) — bloqueante de producción.

### Módulo 8 — Comunidad & Networking *(existe → el corazón anual)*

**Decisión ratificada del Master Prompt (validada por las quejas de Whova):** sin feed adictivo, sin leaderboard. Pero las top 10 enseñan tres piezas que sí faltan:
- **Community board por temas (Whova):** hilos simples por categoría (dropshipping, logística, pagos, tráfico...) — no es un feed, es un foro liviano moderable.
- **Matchmaking simple (Brella/Grip fase 1):** "personas como tú" / "personas que buscan lo que ofreces" usando rol + país + intención declarada. Sin IA compleja en MVP: un score de compatibilidad por reglas ya diferencia.
- **Escaneo de contacto (Whova):** en el evento, dos asistentes se escanean el QR mutuamente → contacto guardado con nota. La "libreta de contactos del evento" es de las funciones más usadas en ferias B2B.

### Módulo 9 — Notificaciones & Engagement *(NUEVO — el pegamento)*

Toda top 10 lo tiene como sistema central, no como extra:
- Web Push (PWA) + centro de notificaciones in-app con historial.
- Tipos: cambios de agenda, recordatorios Mi Agenda, anuncios de la organización, ofertas de Alianzas, respuestas en Comunidad.
- Segmentación por tier de boleta, rol, y módulo (admin elige audiencia al enviar).
- **Regla de oro anti-spam:** máximo N pushes de marketing/día (configurable); las operativas no cuentan.

### Módulo 10 — Encuestas & Voz del asistente *(NUEVO — liviano)*

- Encuesta general del evento (NPS) el último día.
- Votaciones en vivo lanzables desde el escenario ("¿cuántos venden en Amazon?") — proyectables, efecto wow barato (Whova/EventMobi).

### Módulo 11 — Panel Admin 2.0 *(existe → completar y blindar)*

- Fix de los 4 textareas (bug #1) y las 4 acciones update sin UI (bug #7).
- **Dashboard "día del evento":** aforo en vivo (check-ins), sesión en curso por auditorio, alertas.
- Editor de notificaciones push con segmentación.
- Moderación: Q&A, community board, reportes de perfiles.
- Multi-edición nativa: selector de edición activa en vez de años hardcodeados (bugs #2, #3).

### Módulo 12 — Panel de Embajadores *(producto separado — sin cambios de alcance)*

Sigue siendo portal web independiente para ~200–300 comercializadores (comisiones: boletas 50%/10%, stands 3%, patrocinios 2%). La tabla `commissions` ya existe. No se mezcla con la app pública. **Prioridad: después del check-in y antes de la venta fuerte de stands 2027.**

---

## 5. Arquitectura técnica 2.0

**Se mantiene:** Next.js 16 + React 19 + TS + Tailwind v4 + Supabase + Vercel + PWA. Stack correcto para el equipo y el timeline. Cero reescrituras.

**Se agrega:**

| Capa | Tecnología | Para qué |
|---|---|---|
| Realtime | Supabase Realtime (channels) | Agenda en vivo, Q&A, contador de aforo |
| Push | Web Push API + `web-push` (VAPID) sobre el SW existente | Módulo 9 completo |
| Storage | Supabase Storage | Fotos de perfil, logos de stands, imágenes (hoy son URLs de texto) |
| Video | YouTube unlisted (MVP) → Mux/Cloudflare Stream (fase 2) | Academia con progreso y sin fugas |
| Analítica | Vercel Analytics + tabla `events_log` propia | Métricas por módulo, clics de Alianzas |
| Testing | Vitest + Playwright (flujos críticos: ticket, check-in, login) | Hoy hay 0 tests y el evento no perdona |
| Edge config | Tabla `app_config` (ya existe el patrón) | Ventana de reembolso, fechas, límites de push |

**Principios que se vuelven ley:**
1. **Offline-first en todo lo operativo** (ticket, mapa, mi agenda cacheados) — Tomorrowland rule.
2. **Multi-edición desde el modelo de datos:** columna `edition` FK a tabla `editions` con fechas/estado — nunca más un año hardcodeado.
3. **RLS como única fuente de verdad de acceso** + `getAccess()` obligatorio por módulo (documentar en CLAUDE.md del repo para que ningún módulo nuevo nazca abierto).
4. **La app no procesa pagos en 2026** (La Tiquetera + manual Black) — pasarela propia es decisión 2027.
5. **Simplicidad operable:** todo lo que pase el día del evento debe poder resolverlo una persona del equipo Effix desde el admin, sin developer.

---

## 6. Roadmap de ejecución (julio → octubre 2026)

**SPRINT 0 — Estabilizar (1 semana) 🔴**
Los 7 puntos del checklist pre-evento de 08_HALLAZGOS: textareas admin, iconos PWA, placeholders (WhatsApp Black, referrals, videos), ventana de reembolso real, limpiar TOTP en logout, `.env.example`, README. Más: corregir fechas 15–19 oct y modelo multi-día.

**SPRINT 1 — Operación del evento (2–3 semanas) 🔴**
Escáner de check-in offline con cola de sync + dashboard de aforo + boletas multi-día por tier + tests de los flujos ticket/check-in. *Sin esto no hay evento.*

**SPRINT 2 — Engagement core (3 semanas) 🟠**
Notificaciones push + centro de notificaciones + Mi Agenda con recordatorios + Agenda realtime + Q&A moderado en vivo + encuesta flash post-charla.

**SPRINT 3 — Ingresos (3 semanas) 🟠**
Stands 2.0: niveles de patrocinio + lead capture cobrable + reuniones con intención. Alianzas con tracking de conversiones. *Este sprint se paga solo.*

**SPRINT 4 — Comunidad y Academia (3 semanas) 🟡**
Community board + escaneo de contactos + matchmaking por reglas + Academia con progreso/colecciones + teaser gratuito + pipeline de publicación.

**SPRINT 5 — Evento y post-evento 🟢**
Votaciones en vivo, NPS, certificados, dashboard día-del-evento. Post-evento: subir grabaciones 2026 a Academia (máx. 2 semanas después — el momentum de venta 2027 se enfría rápido) y arrancar Panel de Embajadores.

---

## 7. KPIs por módulo (lo que no se mide no existe)

| Módulo | KPI norte |
|---|---|
| Tickets | % boletas vinculadas a cuenta antes del evento (meta: >70%) |
| Check-in | Tiempo promedio de escaneo (<3 s), % offline exitoso |
| Agenda | % asistentes con ≥3 sesiones en Mi Agenda |
| Stands | Leads capturados por expositor; ingresos por lead capture |
| Academia | % alumni activos/mes post-evento; conversión teaser → boleta 2027 |
| Alianzas | Clics → conversiones → comisión por oferta |
| Comunidad | Perfiles completos; conexiones/escaneos por asistente |
| Push | Opt-in rate (>50%), CTR por tipo |
| App global | Adopción: % asistentes con app instalada (benchmark Swapcard: 70%+) |

---

## 8. Decisiones que NO tomamos (y por qué)

- **App nativa (iOS/Android):** no en 2026. La PWA cubre el 95% del valor; una nativa duplica el costo de mantenimiento. Revisar en 2027 si el opt-in de push web resulta bajo en iOS.
- **Mensajería interna:** ratificado NO (Master Prompt) — redirigir a WhatsApp/IG/LinkedIn. Ninguna feria LATAM le gana a WhatsApp.
- **Gamificación con leaderboard:** ratificado NO (quejas documentadas de Whova). Único juego permitido: pasaporte de stands simple si sobra tiempo, porque genera tráfico vendible a expositores.
- **GPS indoor real:** NO en 2026 (costo/fragilidad). Plano interactivo por zonas.
- **Pasarela de pagos propia:** NO en 2026. La Tiquetera + Black manual funcionan; una pasarela a 3 meses del evento es riesgo puro.
- **IA de matchmaking con embeddings:** fase 2027. En 2026, score por reglas (rol × intención × país) da el 80% del valor con el 5% del esfuerzo.
