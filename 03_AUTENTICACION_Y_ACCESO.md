# 03 · Autenticación y modelo de acceso

## Flujos de autenticación

### Login — `/ingresar` (client)
`supabase.auth.signInWithPassword({email, password})` → éxito: `router.push("/perfil")` + `router.refresh()`. Enlaces a `/recuperar` y `/registro`, más botón Google.
- ⚠️ No preserva URL de origen (`next`): todo login termina en `/perfil`.
- ⚠️ `/auth/callback` redirige con `?error=auth` pero esta página **no lee ni muestra** ese parámetro.

### Registro — `/registro` (client)
1. Precarga roles desde la tabla `roles` (fallback `DEFAULT_ROLES` de `src/lib/roles.ts`); opción "Otro…" con campo libre (`__otro__`).
2. `supabase.auth.signUp({ email, password, options: { emailRedirectTo: {origin}/auth/callback, data: { full_name, country, role, bio } } })`.
3. Los metadatos van a `raw_user_meta_data` → el trigger `handle_new_user()` crea la fila de `profiles` automáticamente (y usa el email como `ticket_email` inicial).
4. Si la confirmación de email está desactivada (`data.session` existe) → directo a `/perfil`; si no → pantalla "Revisa tu correo".

### Google OAuth — `GoogleButton.tsx` (client)
`signInWithOAuth({ provider: "google", redirectTo: {origin}/auth/callback })`. Presente en `/ingresar` y `/registro`. Errores (proveedor no habilitado) se muestran sin romper.

### Recuperación de contraseña
1. `/recuperar`: `resetPasswordForEmail(email, { redirectTo: {origin}/auth/callback?next=/clave-nueva })`.
2. `/auth/callback` intercambia el código y redirige a `/clave-nueva`.
3. `/clave-nueva`: `auth.updateUser({ password })` → 1.2 s después → `/perfil`.
- ⚠️ `/clave-nueva` no tiene guardia de servidor: abierta sin sesión de recovery, el error solo aparece al enviar.

### Callback — `/auth/callback/route.ts` (route handler GET)
Sirve a los 3 flujos (OAuth, confirmación de registro, recuperación):
- Lee `code` y `next` (default `/perfil`) → `exchangeCodeForSession(code)` → redirect a `{origin}{next}`.
- Falta código o falla → redirect a `/ingresar?error=auth`.

### Sesión persistente — `src/proxy.ts`
El middleware llama `updateSession()` en cada request: refresca token expirado y sincroniza cookies request↔response. **No redirige ni gatea nada.**

### Logout — `ProfileForm.tsx`
`auth.signOut()` → `router.push("/")`. ⚠️ No limpia el cache de boletas en localStorage (`clearCachedTickets()` existe pero nunca se invoca) ni el cache del Service Worker.

## Modelo de acceso — `src/lib/access.ts`

`getAccess()` se ejecuta en el server component de cada página protegida. Devuelve:

| Campo | Cálculo |
|---|---|
| `configured` | ¿Env vars de Supabase presentes? Si no → "modo vitrina" |
| `user` | `auth.getUser()` → `{id, email}` |
| `currentEdition` | `app_config.current_edition` (fallback 2026) |
| `isAdmin` | `profiles.is_admin` |
| `hasCurrentTicket` | Alguna boleta `edition === currentEdition && status === 'active'` |
| `isAlumni` | Alguna boleta `active` o `used` **de cualquier edición** |

Falla cerrado: si la tabla `tickets` no existe, el usuario queda sin acceso.

## Matriz de acceso por ruta

| Ruta | Login | Boleta vigente | Alumni | Bypass admin | Si falla |
|---|:--:|:--:|:--:|:--:|---|
| `/` Home | no | no | no | — | contenido público |
| `/tickets` | **sí** | no | no | — | `redirect("/ingresar")` |
| `/perfil` | **sí** | no | no | — | `redirect("/ingresar")` |
| `/agenda`, `/mapa`, `/stands`, `/ponentes`, `/ponentes/[id]`, `/alianzas` | sí | **sí** | — | sí | `<LockedModule reason="login"\|"ticket">` |
| `/academia` | sí | no | **sí (de por vida)** | sí | `<LockedModule reason="alumni">` |
| `/comunidad` | **sí** | no | no | — | `<LockedModule reason="login">` |
| `/storybook` | no | no | no | — | sin gating (pública) |
| `/admin/*` | sí | — | — | **requiere admin** | redirects en cascada del layout |
| `/ingresar`, `/registro`, `/recuperar`, `/clave-nueva`, `/auth/callback` | público | — | — | — | — |

Refinamiento extra: `/ponentes/[id]` hace `notFound()` si el ponente es de otra edición y el usuario no es admin (protección de deep-links).

`LockedModule` traduce el motivo a copy + CTA: `login` → "/ingresar", `ticket`/`alumni` → "/tickets". Si `configured=false` muestra `SupabaseNotice`.

## Capas de defensa (de fuera a dentro)

1. **UI/página**: `getAccess()` + `LockedModule`/redirect — la principal, pero opt-in por página.
2. **RLS en Postgres**: la real para datos sensibles (tickets, profiles, commissions). Los catálogos (talks, stands, speakers, offers) son de lectura pública por diseño.
3. **Server actions admin**: `assertAdmin()` verifica `is_admin` con el cliente anon ANTES de crear el cliente service-role.

⚠️ El middleware NO gatea: un módulo nuevo sin `getAccess()` queda abierto en la UI (aunque RLS proteja los datos privados).
