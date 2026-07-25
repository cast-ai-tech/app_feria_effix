# 05 · Panel Admin (`/admin`) — Fase 11

## Protección (2 capas)

**Capa 1 — `admin/layout.tsx`** protege todo `/admin/*` con redirects en cascada:
`!configured` → `/` · `!user` → `/ingresar` · `!isAdmin` → `/`.
El rol sale de `profiles.is_admin` vía `getAccess()`.

**Capa 2 — `assertAdmin()`** en cada `actions.ts` (duplicada idéntica en las 6 secciones ⚠️):
verifica sesión + `profiles.is_admin` con el cliente normal (RLS) y solo entonces devuelve `createAdminClient()` (service-role, salta RLS). Lanza excepción si falla — ⚠️ los clients no la capturan, así que un fallo produce error de server action crudo, no el mensaje "⚠️" de la UI.

**Lecturas** (`page.tsx`) usan el cliente normal del admin logueado — dependen de que las policies incluyan `is_admin()`.

## Dashboard — `/admin`
Sin datos ni métricas. Solo índice de navegación a las 6 secciones: Boletas 🎟️, Agenda 🕐, Stands 🏬, Ponentes 🎤, Academia 🎓, Alianzas 🤝.

## Patrón común de los 6 clients
`useTransition` + nota de resultado (`⚠️ error` / `✅ Listo`), componentes `GlassCard`/`Field`/`Badge`/`Button`, `PageHeader` con volver a `/admin`. Sin paginación ni buscador (límites 300–500 filas).

---

## Tickets — `/admin/tickets` (la sección más compleja)

| Action | Qué hace |
|---|---|
| `importTiquetera(fd)` | **Import CSV de La Tiquetera.** Parser propio (autodetecta `,`/`;`, comillas, BOM, headers sin tildes). Columnas aceptadas: nombre/titular/comprador, correo/email, tipo/boleta, orden/order/pedido, fecha. Normaliza tipo (black/vip/general), cruza `profiles.ticket_email` para vincular usuario, genera `secret` TOTP por fila, upsert con `onConflict: "order_number", ignoreDuplicates`. Devuelve resumen `{total, inserted, matched, skipped}` |
| `assignBlack(fd)` | Crea boleta Black manual (`source: manual_black`, secret nuevo). Email obligatorio |
| `refundTicket(fd)` | Lee `app_config` (`event_start_date`, `refund_full_days_before_event`) → calcula si el reembolso es total o parcial → `status: cancelled` + `refunded_at` + `refund_full`. Luego marca `commissions` → `to_deduct` (no borra historial) |
| `transferTicket(fd)` | Auditoría en `ticket_transfers` + update de `user_id`/`ticket_email`, preservando `original_owner_id` |
| `markUsed(fd)` | `status: used` + `used_at` (check-in manual) |

**Client:** form de import CSV + form Black arriba; listado de tarjetas con tipo/estado coloreado, chips (edición, cuenta vinculada, source) y acciones por boleta activa (Marcar usada / Reembolsar / Transferir con form inline).

⚠️ **No existe escáner QR de check-in** — `verifyTotp()` está listo en `src/lib/totp.ts` para el lado servidor, pero no hay ruta ni action de escaneo. El check-in hoy es manual (`markUsed`).

## Agenda — `/admin/agenda`

Actions: `createTalk` / `updateTalk` (validan título y día 1–3) · `cancelTalk` / `reactivateTalk` (**soft-delete**: cancelada se muestra tachada). Revalidan `/admin/agenda` + `/agenda`.

Helper `toEventTimestamp(day, time)`: día 1→16 oct, 2→17, 3→18, con offset `-05` fijo (Medellín). ⚠️ **Hardcodeado a `2026-10`** — romperá en la próxima edición.

Client: el más elaborado — `TalkForm` reutilizable para crear y editar inline, selector de día, inputs de hora, reconversión de ISO a hora Bogotá para prellenar.

## Stands — `/admin/stands`

Actions: `createStand` · `updateStand` (⚠️ exportada pero **sin UI**) · `deleteStand` (**hard delete sin confirmación**) · `setMeetingStatus` (accepted/declined).

Client: form "Nuevo stand" + **bandeja de solicitudes de cita pendientes** (Aceptar/Rechazar) + listado con Eliminar.

## Ponentes — `/admin/ponentes`

Actions: `createSpeaker` · `updateSpeaker` (⚠️ sin UI) · `deleteSpeaker` (hard delete). 10 campos incluyendo redes y `talk_starts_at`. Foto = **URL de texto** (no hay upload).

## Academia — `/admin/academia`

Actions: `createRecording` · `updateRecording` (⚠️ sin UI) · `toggleApproved` (flujo editorial: Borrador → Aprobada, solo lo aprobado se ve en `/academia`) · `deleteRecording` (cascade borra ratings). Ediciones whitelist `[2024, 2025, 2026]`. Video = URL de texto.

## Alianzas — `/admin/alianzas`

Actions: `createOffer` · `updateOffer` (⚠️ sin UI) · `toggleOffer` (Activa ↔ Oculta) · `deleteOffer`. El form marca `referral_url` como "Link de referido (administrado por Feria Effix)" — el modelo de monetización.

---

## Hallazgos transversales del panel

1. **Bug real — textareas bloqueadas:** `TextAreaField` es siempre controlado, pero en Stands, Ponentes (bio), Academia y Alianzas se le pasa `value="" onChange={() => {}}` → **no se puede escribir**; descripción/bio llegan siempre vacías. Solo Agenda lo hace bien (estado real).
2. Las 4 `update*` sin UI = no hay edición de stands/ponentes/grabaciones/ofertas (solo crear/borrar/toggle).
3. `assertAdmin()` duplicada 6 veces → candidata a extraer a `src/lib/`.
4. `importTiquetera` cuenta `inserted++` aunque `ignoreDuplicates` haya descartado la fila; filas sin `order_number` pueden duplicarse por email.
5. Hard deletes (stands, speakers, recordings, offers) sin diálogo de confirmación.
6. Ningún upload de archivos salvo el CSV (leído en memoria, nunca persistido). Cero uso de Supabase Storage.
