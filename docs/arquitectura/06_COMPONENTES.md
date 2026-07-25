# 06 · Componentes y design system

## Marca (fuente: `docs/Brand_Quickref.md` + Master Prompt)

- **Paleta — solo 3 colores:** Negro `#000000` · Blanco `#FFFFFF` · Lavanda grisáceo `#726E8D`. Prohibidos colores saturados; variaciones solo en grises/lavandas apagados.
- **Tipografía — única:** Montserrat. *Black* para titulares (mayúsculas) y números; *Regular* para cuerpo.
- **Concepto:** futurista / tech / **cromado**. Texturas: cromo, cristal/vidrio, degradados con ruido (noise) como fondo.
- **Tono:** "nosotros" + "tú", cercano, sin tecnicismos.

## Tokens en `globals.css` (Tailwind v4)

`:root`: `--brand-black`, `--brand-white`, `--brand-lav #726e8d`, derivados `--brand-muted #9a97ab`, `--brand-dim #c9c7d6`, `--brand-lav-glass`, superficies `--glass-bg-from/to`, `--glass-border`. Expuestos como clases `bg-brand-lav`, `text-brand-muted`, etc.

Utilidades propias: `.app-bg` (doble degradado radial lavanda sobre negro) · `.app-noise` (ruido SVG inline) · `.glass-sheen` (brillo animado) · `.live-dot` (punto pulsante) · `.no-scrollbar`. Respeta `prefers-reduced-motion`.

Catálogo vivo en **`/storybook`**.

## UI base (`src/components/`)

| Componente | Propósito · props clave |
|---|---|
| `AppBackground` | Fondo de marca (degradados + noise). Una vez en el layout |
| `GlassCard` | Superficie vidrio/cromo, contenedor base. `sheen`, `href` (→ Link), `onClick` |
| `Button` | `variant: solid\|ghost`, `size: sm\|md`, `fullWidth`; `<Link>` si recibe `href` |
| `Badge` | Chip de estado. `dot` = punto pulsante ("Ahora", "EN VIVO") |
| `FilterChip` | Chip seleccionable. `active` (relleno blanco, `aria-pressed`) |
| `SectionTitle` | Rótulo de sección en mayúsculas. `live` |
| `ListItem` | Fila con thumb degradado + título + subtítulo + zona derecha. `href` |
| `EmptyState` | Estado vacío sobre GlassCard. `icon`, `title`, `subtitle`, CTA en children |
| `Field` | **3 exports:** `Field` (input, controlado o no-controlado con `defaultValue` para FormData), `TextAreaField` (⚠️ siempre controlado — origen del bug del admin), `SelectField` |
| `PageHeader` | Título + subtítulo + flecha volver (`backHref`) |
| `BottomNav` (client) | 4 accesos fijos: Inicio, Agenda, Mapa, Perfil. Activo por `usePathname()` |
| `LockedModule` | Módulo bloqueado. `reason: login\|ticket\|alumni` → icono/copy/CTA |
| `SupabaseNotice` | Aviso "modo vitrina" (faltan credenciales) |
| `GoogleButton` (client) | OAuth Google |
| `ServiceWorkerRegister` (client) | Registra `/sw.js` solo en producción |
| `ProfileForm` (client) | Carga roles, update de `profiles`, logout |
| `ModulePlaceholder` | Placeholder de fases (ya casi sin uso) |

## Componentes de feature

| Componente | Tipo | Tablas | Lógica clave |
|---|---|---|---|
| `agenda/AgendaClient` | client | `talks` (props) | Chips día 1/2/3, "Hoy" y horas en TZ `America/Bogota`, badge "Ahora" cada 30 s, canceladas tachadas. Sin escrituras |
| `academia/AcademiaClient` | client | `recording_ratings` (upsert) | Filtro edición client-side `[2026,2025,2024]`, StarRating accesible con upsert + `router.refresh()` |
| `comunidad/ComunidadClient` | client | — (props de la vista) | Buscador + chips rol/país derivados, normaliza wa.me/IG/LinkedIn. 100% presentacional |
| `mapa/VenueMap` | **server** | — | Arreglo estático `ZONES`; migrable a tabla sin cambiar interfaz |
| `stands/StandsClient` | client | `stand_meetings` (insert) | Buscador + categorías, cita con mensaje, estado "Solicitada" solo local |
| `tickets/TicketQR` | client | — (cero Supabase) | Núcleo offline: TOTP local cada 1 s, regenera QR solo al cambiar código, cache localStorage, badges online/offline. Ver doc 07 |
| `tickets/NoTicket` | client | RPCs `claim_my_tickets`, `link_ticket_by_order` | 3 caminos de vinculación + CTA Black WhatsApp |
| `ponentes/FollowButton` | client | `speaker_follows` | Toggle insert/delete |
| `ponentes/RatingStars` | client | `speaker_ratings` (upsert) | Solo habilitado tras la charla (`canRate` calculado en server) |
| `ponentes/QuestionsBox` | client | `speaker_questions` (insert) | Update optimista + `router.refresh()`. Sin realtime ni moderación |
| `ponentes/Stars` | — | — | Estrellas solo lectura (promedio + conteo) |

## Realtime

**No existe** en el proyecto (cero `.channel()`/`subscribe()`). "Tiempo real" = páginas dinámicas + `router.refresh()` tras mutaciones + intervalo de 30 s en Agenda para el badge "Ahora".
