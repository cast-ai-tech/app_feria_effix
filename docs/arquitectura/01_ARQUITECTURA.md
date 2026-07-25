# 01 · Arquitectura general

## Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 16.2.10** (App Router, Turbopack) | Server Components por defecto |
| UI | **React 19.2.4** + **TypeScript 5** | |
| Estilos | **Tailwind CSS v4** | Tokens de marca en `src/app/globals.css` vía `@theme` |
| Backend | **Supabase** (Postgres + Auth) | Sin Storage todavía (imágenes = URLs de texto) |
| QR | `qrcode` (npm) | Generación client-side |
| Deploy | **Vercel** | |
| PWA | Service Worker propio (`public/sw.js`) + manifest | Modo offline para `/tickets` |

Dependencias totales: solo 7 (`@supabase/ssr`, `@supabase/supabase-js`, `qrcode`, `next`, `react`, `react-dom`, `@types/qrcode`). Proyecto deliberadamente liviano, sin librerías de UI ni de estado.

## Concepto de la aplicación

Shell tipo **app móvil**: contenedor centrado `max-w-[440px]`, fondo negro con degradados radiales lavanda + ruido (noise), tarjetas "glass/cromo", y una **BottomNav fija** con 4 accesos (Inicio, Agenda, Mapa, Perfil). En desktop se ve como un teléfono centrado.

Dos productos comparten el motor de datos (según el Master Prompt):
1. **Esta app de asistentes** (los 8 módulos).
2. El **Panel de Embajadores** (portal separado para ~200-300 comercializadores) — **no está en este repo**; solo existe la tabla `commissions` que ese panel consumirá.

## Estructura de carpetas

```
src/
  app/
    layout.tsx            # Shell móvil: Montserrat, AppBackground, BottomNav, SW register
    page.tsx              # Home: grilla de 8 módulos + saludo personalizado
    globals.css           # Tokens de marca Tailwind v4 (colores, glass, sheen, noise)
    proxy.ts (en src/)    # ⚠️ Middleware (convención Next 16, NO middleware.ts)
    tickets/              # Módulo 1: boleta QR TOTP + offline
    agenda/               # Módulo 2: programación por día
    mapa/                 # Módulo 3: mapa por zonas (estático)
    stands/               # Módulo 4: directorio expositores + citas
    ponentes/             # Módulo 5: lista + detalle [id] con rating/preguntas/follow
    academia/             # Módulo 6: grabaciones (acceso alumni de por vida)
    alianzas/             # Módulo 7: marketplace de ofertas con referidos
    comunidad/            # Módulo 8: directorio de networking (gratis)
    perfil/               # Perfil del usuario + logout
    ingresar/ registro/ recuperar/ clave-nueva/   # Auth (client components)
    auth/callback/        # Route handler GET: intercambio de código OAuth/email
    storybook/            # Catálogo visual del design system (pública)
    admin/                # Panel admin (Fase 11): 6 secciones con server actions
  components/             # UI base + subcarpetas por feature (ver 06_COMPONENTES.md)
  lib/
    access.ts             # getAccess(): la puerta única de acceso por módulo
    roles.ts              # Catálogo de roles de perfil (taxonomía, no permisos)
    totp.ts               # TOTP RFC 6238 con Web Crypto (cero dependencias)
    ticketStore.ts        # Cache de boletas en localStorage (offline)
    cn.ts                 # Utilidad de clases
    supabase/             # 4 factories de cliente + config (ver abajo)
supabase/                 # SQL idempotente por fase (schema + phase3..phase10)
docs/                     # Docs de producto/marca + prototipo HTML (spec visual)
public/                   # sw.js, manifest.webmanifest, SVGs
```

## Los 4 clientes de Supabase

Todo vive en `src/lib/supabase/`:

| Archivo | Factory | Credenciales | Dónde se usa |
|---|---|---|---|
| `config.ts` | — | Lee env vars y expone `isSupabaseConfigured()` | Guard global: sin credenciales la app arranca en "modo vitrina" |
| `client.ts` | `createBrowserClient` (@supabase/ssr) | URL + anon key | Client components (formularios, ratings, citas…) |
| `server.ts` | `createServerClient` + cookies de `next/headers` | URL + anon key | Server components, route handlers, server actions. Respeta RLS del usuario |
| `middleware.ts` | `createServerClient` con cookies del request | URL + anon key | `updateSession()`: refresca el token en cada request |
| `admin.ts` | `createClient` puro (sin SSR) | URL + **`SUPABASE_SERVICE_ROLE_KEY`** | **Salta RLS.** Solo en server actions de `/admin`, siempre detrás de `assertAdmin()` |

**Patrón de elevación de privilegios (correcto):** las server actions del admin primero verifican sesión + `profiles.is_admin` con el cliente normal (RLS activa), y solo entonces crean el cliente service-role para escribir.

## Middleware — `src/proxy.ts`

Next 16 usa la convención `proxy.ts` (no `middleware.ts`). Hace **una sola cosa**: llamar `updateSession(request)` para refrescar el token de Supabase y sincronizar cookies. **No hace control de acceso ni redirects** — el gating vive en cada `page.tsx` (decisión documentada en el código). Matcher: todo excepto `_next/static`, `_next/image`, favicon e imágenes.

Consecuencia importante: **un módulo nuevo que olvide llamar `getAccess()` queda abierto por defecto**; la última línea de defensa es la RLS en Postgres.

## Variables de entorno

| Variable | Ámbito | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Anon key (RLS activa) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Server actions del admin (salta RLS) |

⚠️ **No existe `.env.example` en el repo** aunque el README lo referencia. Sin las dos primeras, la app funciona en "modo vitrina" (`SupabaseNotice` en las páginas).

## PWA y offline

- **Manifest** (`public/manifest.webmanifest`): standalone, negro, español… pero `icons: []` **vacío** → hoy la app **no es instalable** (Chrome exige un icono ≥192px).
- **Service Worker** (`public/sw.js`, cache `efx-v1`): registrado solo en producción por `ServiceWorkerRegister.tsx`.
  - `install`: precachea `/` y `/tickets`.
  - `fetch`: network-first para navegación (fallback cache → `/tickets` → `/`); cache-first para `/_next/` y `/icons/`. **Nunca cachea Supabase** (ignora otros orígenes).
  - Objetivo: que `/tickets` abra sin red y el QR siga rotando (el TOTP se calcula localmente).

## Flujo de datos típico (página de módulo)

```
Request → proxy.ts (refresca sesión) → page.tsx (Server Component)
  → getAccess() → ¿configured? ¿user? ¿ticket/alumni/admin?
      ├─ NO → <LockedModule reason="login|ticket|alumni"> (o redirect a /ingresar)
      └─ SÍ → queries a Supabase (cliente server, RLS) → props al *Client.tsx
                → interacciones del usuario: cliente browser (insert/upsert) + router.refresh()
```

**No hay realtime** (cero suscripciones a canales de Supabase). Los textos "Actualizada en tiempo real" y "Preguntas en vivo" son copy; la frescura viene de páginas dinámicas + `router.refresh()` tras cada mutación.

## Convenciones del repo

- `AGENTS.md`: única regla — Next 16 tiene breaking changes; consultar la doc local en `node_modules/next/dist/docs/` antes de escribir código. `CLAUDE.md` = `@AGENTS.md`.
- SQL idempotente (`if not exists` / `or replace`), un archivo por fase.
- Español en toda la UI y comentarios; el tono de marca es "nosotros" + "tú".
