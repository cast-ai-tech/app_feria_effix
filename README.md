# App Feria Effix

App oficial de asistentes de **Feria Effix** — la feria de e-commerce y marketing digital de Latinoamérica (Plaza Mayor, Medellín). Es una PWA móvil (una app web que se instala como app en el celular) con 8 módulos: Tickets con QR offline, Agenda, Mapa, Stands, Ponentes, Academia, Alianzas y Comunidad, más un panel de administración.

> **Estado real del repo:** Fases 0–22 construidas — los 8 módulos originales + Credencial Effix (scan-to-connect), Pasaporte de stands, push + centro de notificaciones, Mi Agenda con realtime, Q&A en vivo + votaciones + NPS, Exhibitor Hub (/mi-stand), Academia 2.0, dashboard día-del-evento, hardening y plataforma Android de Capacitor. Plan: [`docs/PLAN_FASES_DEFINITIVO.md`](./docs/PLAN_FASES_DEFINITIVO.md) · Publicación en tiendas: [`docs/FASE22_CAPACITOR.md`](./docs/FASE22_CAPACITOR.md).

---

## Cómo correr la app en tu computador (paso a paso)

No necesitas ser programador. Sigue cada paso en orden.

### Lo que necesitas tener instalado

1. **Node.js** (el motor que ejecuta la app): descárgalo de [nodejs.org](https://nodejs.org) (botón "LTS") e instálalo dando "Siguiente" a todo.
2. **Una cuenta en Supabase** (la base de datos, gratis): créala en [supabase.com](https://supabase.com).

### Paso 1 — Descarga las dependencias

Abre una terminal en la carpeta del proyecto y escribe:

```bash
npm install
```

Esto descarga todas las piezas que la app necesita. Tarda unos minutos la primera vez.

### Paso 2 — Crea tu proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) e inicia sesión.
2. Botón **New project** → ponle nombre (ej. `feria-effix`) → crea el proyecto.
3. Espera 1-2 minutos a que termine de crearse.

### Paso 3 — Copia las llaves de Supabase a la app

1. En Supabase: **Settings → API**. Ahí verás 3 datos: la **URL** del proyecto, la llave **anon** y la llave **service_role**.
2. En la carpeta del proyecto, copia el archivo `.env.example` y renombra la copia a `.env.local`.
3. Abre `.env.local` con cualquier editor de texto y pega cada valor donde corresponde. Guarda.

### Paso 4 — Crea las tablas de la base de datos

1. En Supabase: **SQL Editor** (ícono de hoja con `SQL`).
2. Abre la carpeta `supabase/` de este proyecto. Verás varios archivos `.sql`.
3. Copia el contenido de cada archivo, pégalo en el SQL Editor y dale **Run**, **en este orden**:
   1. `schema.sql`
   2. `phase3_tickets.sql`
   3. `phase4_agenda.sql`
   4. `phase6_stands.sql`
   5. `phase7_ponentes.sql`
   6. `phase8_academia.sql`
   7. `phase9_alianzas.sql`
   8. `phase10_comunidad.sql`
   9. `phase12_estabilizacion.sql`
   10. `phase12b_grants.sql`
   11. `phase14_credencial.sql`
   12. `phase15_pasaporte.sql`
   13. `phase16_notifications.sql`
   14. `phase17_mi_agenda.sql`
   15. `phase18_qa_polls.sql`
   16. `phase19_exhibitor.sql`
   17. `phase20_academia2.sql`
   18. `phase21_hardening.sql`

   💡 Atajo: la carpeta `supabase/migrations/` tiene estos mismos archivos ya
   numerados — con el CLI (`npx supabase db push` al proyecto cloud, o
   `npx supabase db reset` en local) se aplican todos solos y en orden.

### Paso 5 — Enciende la app

En la terminal:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. Listo: la app está corriendo en tu computador.

### Paso 6 (opcional) — Hazte administrador

Para entrar al panel `/admin`:

1. Regístrate en la app con tu correo.
2. En Supabase: **SQL Editor** y ejecuta (cambia el correo por el tuyo):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

---

## Referencia técnica (para desarrolladores)

### Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (Postgres/Auth/RLS) + Vercel. PWA móvil de una columna (max 440px), estética cromo/glass del brandbook (negro `#000000`, blanco `#FFFFFF`, lavanda `#726E8D`, Montserrat).

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | Linter |
| `npm test` | Tests unitarios (Vitest: TOTP, matriz de acceso, storage) |
| `npm run test:e2e` | E2E (Playwright: login → boleta → QR rota) — requiere Supabase local arriba |

### Supabase local (desarrollo sin proyecto cloud)

Con Docker Desktop instalado, no necesitas un proyecto en supabase.com:

```bash
npx supabase start   # levanta Postgres + Auth + API locales y aplica supabase/migrations/
npx supabase stop    # apaga (los datos se conservan)
npx supabase db reset  # borra y re-aplica todas las migraciones
```

Copia las llaves que imprime `npx supabase status` a `.env.local`. Interfaz visual de la BD: http://127.0.0.1:54323 · correos de prueba (recuperación, etc.): http://127.0.0.1:54324.

Usuarios de prueba (los usa el E2E): corre `node scripts/seed-local.mjs` — crea `asistente@test.local / prueba123` (boleta General activa) y `admin@test.local / admin123` (admin). Solo funciona contra el Supabase local.

### Variables de entorno (`.env.local`)

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (el RLS protege los datos) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta, solo servidor (panel admin) |

### Conceptos clave del código

- **Multi-edición (Fase 12):** la tabla `editions` es la fuente de verdad de fechas/días de cada edición (una sola activa). Nada de años ni fechas hardcodeadas — `getAccess()` expone `access.edition` y los helpers viven en `src/lib/editions.ts`.
- **Acceso por anillos:** `getAccess()` (`src/lib/access.ts`) resuelve: gratis (Comunidad), alumni de por vida (Academia), boleta vigente (resto). Todo módulo nuevo DEBE llamarla.
- **Boletas multi-día:** `ticket_types.allowed_days` define qué días de la edición habilita cada tipo (Black/VIP todos, General días 2–4, diaria por boleta vía `tickets.valid_days`).
- **QR TOTP offline:** la boleta genera un código rotativo sin conexión (`src/lib/totp.ts` + cache en `src/lib/ticketStore.ts`, que se limpia al cerrar sesión). En 2026 el ingreso físico lo controla La Tiquetera; este QR será la **Credencial Effix** (identidad interna, Fase 14).
- **Panel admin:** server actions con `assertAdmin()` (`src/lib/adminGuard.ts`) + service-role key. Configuración operativa editable en `/admin/config` (tabla `app_config`).
- **Placeholders de producción:** los valores del seed que no deben salir a producción (WhatsApp Black, referral URLs, videos de ejemplo) se marcan con badge "⚠ placeholder" en el admin (`src/lib/placeholders.ts`).

### Documentación de arquitectura

| Documento | Contenido |
|---|---|
| [01_ARQUITECTURA.md](./01_ARQUITECTURA.md) | Stack, capas, estructura, clientes Supabase, middleware, PWA/offline |
| [02_MODELO_DE_DATOS.md](./02_MODELO_DE_DATOS.md) | Tablas, RLS, funciones SQL y triggers |
| [03_AUTENTICACION_Y_ACCESO.md](./03_AUTENTICACION_Y_ACCESO.md) | Login/registro/OAuth y matriz de acceso |
| [04_MODULOS.md](./04_MODULOS.md) | Los 8 módulos página por página |
| [05_PANEL_ADMIN.md](./05_PANEL_ADMIN.md) | Panel `/admin` y sus server actions |
| [06_COMPONENTES.md](./06_COMPONENTES.md) | Design system y componentes |
| [07_TICKETS_QR_OFFLINE.md](./07_TICKETS_QR_OFFLINE.md) | Boletas, TOTP, QR dinámico, offline, CSV La Tiquetera |
| [08_HALLAZGOS.md](./08_HALLAZGOS.md) | Bugs, riesgos y deuda técnica |
| [docs/PLAN_FASES_DEFINITIVO.md](./docs/PLAN_FASES_DEFINITIVO.md) | **Plan de fases vigente (12–22)** |

### Pendientes de producción (se ven en `/admin/config`)

- Reemplazar `black_whatsapp_url` por el número real de WhatsApp.
- Definir `refund_full_days_before_event` con La Tiquetera (hoy TBD = 30).
- Reemplazar los `referral_url` de Alianzas y los `video_url` de Academia del seed (badge "⚠ placeholder" en el admin).
- Los iconos PWA (`public/icons/`) y los assets nativos (`resources/`, `android/`) son placeholder de marca — regenerar con el logo oficial del brandbook.
- Generar llaves VAPID de producción (`npx web-push generate-vapid-keys`) y `CRON_SECRET`; configurar el cron de Vercel para `/api/cron/reminders` cada 5 min.
- `npm audit`: quedan 3 avisos high transitivos (postcss/sharp empaquetados DENTRO de next, sin fix upstream aún) + cadena dev de eslint (fix = eslint 10, breaking). Next ya está en 16.2.11 con los 9 advisories propios corregidos.
- iOS de Capacitor: agregar la plataforma desde una Mac (ver `docs/FASE22_CAPACITOR.md`).
