# 07 · Sistema de Tickets: QR dinámico + offline

El módulo más importante y complejo de la app (Fase 3). Inspiración declarada: Tomorrowland/Coachella — QR **anti-screenshot** (rota cada 30 s) que funciona **sin internet** dentro del recinto.

## Modelo de venta (la app NO cobra)

| Tipo | Precio | Canal | Cómo entra a la app |
|---|---|---|---|
| General | $183.000 COP | La Tiquetera SAS | Import CSV en `/admin/tickets` (futuro: webhook con el mismo modelo) |
| VIP | $1.050.000 COP | La Tiquetera SAS | Import CSV |
| Black | $3.997.000 COP | WhatsApp (manual) | `assignBlack` en admin |

## Ciclo de vida de una boleta

```
CSV Tiquetera ──importTiquetera──▶ tickets (user_id NULL si el correo no cruza)
                                      │
      usuario se registra ────────────┤
      claim_my_tickets() ─────────────┤  auto-vinculación por email (RPC al abrir /tickets)
      link_ticket_by_order() ─────────┘  vinculación manual orden+correo
                                      │
                                  status: active ──markUsed──▶ used (check-in)
                                      │
                                      ├──refundTicket──▶ cancelled (+refund_full según ventana)
                                      │                   └─ commissions → to_deduct
                                      └──transferTicket──▶ nuevo titular (+ ticket_transfers,
                                                            preserva original_owner_id)
```

## Clave dinámica — TOTP (`src/lib/totp.ts`)

Implementación **RFC 6238 sobre Web Crypto, cero dependencias**:

- Cada boleta tiene un `secret` base32 de 160 bits generado en el servidor al importarla/crearla.
- `computeTotp(secret, {step: 30, digits: 8})`: HMAC-SHA1 del contador de tiempo → truncamiento dinámico RFC 4226 → código de 8 dígitos. Devuelve también `secondsRemaining`.
- `verifyTotp(secret, code, {window: 1})`: valida ±1 paso (tolerancia de reloj). **Pensado para el escáner de acceso del lado servidor — que aún no existe.**
- Payload del QR: **`EFX1|{ticketId}|{code}`**.

El código se calcula **localmente con la hora del sistema**: no necesita red. Una captura de pantalla caduca en ≤30 s.

## Modo offline (3 piezas)

1. **`ticketStore.ts`** — cache en `localStorage` (`efx.tickets.v1`): `{id, secret, step, digits, tier, holder, edition, status, cachedAt}`. Se llena en cada visita online a `/tickets`; si el server no devuelve boletas (sin red), se lee el cache y se marca `fromCache`.
   ⚠️ El comentario de `totp.ts` dice "IndexedDB" pero la implementación real es localStorage.
2. **`TicketQR.tsx`** — bucle de 1 s: recalcula TOTP, actualiza contador y barra de progreso, regenera el QR **solo cuando el código cambia** (`QRCode.toDataURL`, 340px, corrección M). Listeners `online`/`offline` → badge "Modo offline activo". Selector si hay >1 boleta. Cero llamadas a Supabase.
3. **`sw.js`** — Service Worker (solo producción): precachea `/` y `/tickets`; network-first en navegación con fallback al cache → `/tickets` → `/`. Nunca cachea Supabase. Así `/tickets` abre en frío sin conexión y el QR sigue rotando.

## Import CSV de La Tiquetera (admin)

Parser propio sin dependencias: autodetecta separador `,`/`;`, respeta comillas y `""` escapadas, quita BOM, normaliza headers (sin tildes, minúsculas). Columnas aceptadas por sinónimos: nombre|titular|comprador · correo|email|mail · tipo|boleta|categoria · orden|order|pedido · fecha|date|compra.

Por cada fila: normaliza tipo (contiene "black"→black, "vip"→vip, si no general), busca `profiles.ticket_email` con `ilike` para vincular `user_id`, genera `secret` TOTP, y hace upsert con `onConflict: "order_number", ignoreDuplicates: true` (el UNIQUE parcial de `order_number` evita duplicados en re-imports).

## Reembolsos y comisiones

- Ventana configurable: `refund_full_days_before_event` (default 30, **TBD**) antes de `event_start_date` → reembolso **total**; después → **parcial**. Solo marca `refund_full`; el dinero lo mueve La Tiquetera/Effix fuera de la app.
- La comisión del embajador asociada NO se borra: pasa a `to_deduct` (el Panel de Embajadores la descuenta).

## Superficie de riesgo (documentar, es por diseño)

- El `secret` TOTP **viaja al cliente** y persiste en: payload RSC de `/tickets`, cache del Service Worker y `localStorage`. Requisito del modo offline, pero quien tenga acceso al dispositivo puede regenerar códigos válidos indefinidamente.
- **Nada se limpia al cerrar sesión**: `clearCachedTickets()` existe pero nunca se invoca; el cache del SW tampoco se purga.
- RLS: solo el dueño (o admin) puede leer su fila de `tickets` — el secret no es consultable por terceros vía API.

## Lo que falta para el día del evento

1. **Escáner de check-in**: ruta/action servidor que lea `EFX1|id|code`, busque el `secret`, valide con `verifyTotp` y marque `used`. Hoy el check-in es manual en el admin.
2. Reemplazar `black_whatsapp_url` (placeholder `wa.me/573000000000`).
3. Definir la ventana real de reembolso con La Tiquetera.
4. Iconos PWA para que la app sea instalable.
