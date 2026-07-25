# Guía de paso a producción — App Feria Effix

> Estado del código al 24 de julio de 2026: **Fases 12–23 completadas.** Lint 0 errores · 56 tests ✅ · build 40+ rutas ✅ · 2 E2E contra BD local ✅ · 19 migraciones validadas con `db reset`. Lo que falta es 100% operación, cero código.

---

## Paso 1 — Supabase cloud (~20 min)

**Decisiones ya tomadas:** organización Kreoon · región **us-east-1** · costo $10 USD/mes.

1. Crear el proyecto (nombre sugerido: `feria-effix-2026`) desde el dashboard de Supabase, o pedirle a Claude en Cowork que lo cree (tiene acceso vía MCP — solo necesita tu confirmación del costo).
2. Vincular y subir las migraciones desde la carpeta del repo:
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push        # aplica las 19 migraciones en orden
   ```
3. Verificación de seguridad post-migración (Claude puede correr `get_advisors` de seguridad y performance vía MCP y reportarte hallazgos).
4. **Auth de producción** (Dashboard → Authentication):
   - Site URL: `https://app.feriaeffix.com` (o el dominio final).
   - Redirect URLs: `https://app.feriaeffix.com/auth/callback`.
   - Google OAuth: credenciales de producción en Google Cloud Console con el redirect de Supabase.
5. Crear el primer admin: registrarse en la app y poner `is_admin = true` en `profiles` (Table Editor) — solo la primera vez; los demás se promueven desde el panel.

## Paso 2 — Vercel (~30 min)

1. Subir el repo a GitHub (privado) si aún no está remoto:
   ```bash
   git remote add origin https://github.com/AlexanderKast/app-feria-effix.git
   git push -u origin main
   ```
2. En Vercel (equipo **Kreoon's projects**): Add New → Project → importar el repo. Framework: Next.js (auto).
3. **Variables de entorno** (copiar de `.env.example`, valores de producción):
   | Variable | De dónde sale |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Dashboard Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ídem (anon/publishable) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Ídem (service role — **secreta, solo server**) |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Generar par NUEVO de producción: `npx web-push generate-vapid-keys` (no reutilizar las locales) |
   | `CRON_SECRET` | Generar aleatorio: `openssl rand -base64 32` |
4. **Cron de recordatorios**: verificar que `vercel.json` tenga el cron de `/api/cron/reminders` (cada 5 min) — Vercel lo activa solo al deployar; el endpoint valida `CRON_SECRET`.
5. **Dominio**: agregar `app.feriaeffix.com` al proyecto en Vercel → crear el CNAME en el DNS de feriaeffix.com apuntando a `cname.vercel-dns.com`.

## Paso 3 — Configuración operativa (en /admin/config, ~15 min)

- [ ] WhatsApp real de Línea Black (reemplaza `wa.me/573000000000`).
- [ ] Los 5 `referral_url` reales de Alianzas (negociados con cada socio).
- [ ] `video_url` reales de Academia (los seeds apuntan al mismo video).
- [ ] Revisar `refund_full_days_before_event` (hoy es solo excepción administrativa).

## Paso 4 — Marca (~10 min + espera del equipo Effix)

- [ ] Recibir el SVG cromado del logo → guardarlo como `public/brand/logo-cromado.svg` (el componente BrandLogo lo toma solo).
- [ ] Regenerar iconos PWA y nativos (Android) con el logo real.
- [ ] Confirmar con el equipo Effix las cifras únicas para la app (el sitio mezcla 380+/600+ marcas).

## Paso 5 — Smoke test de producción (30 min, con 2 celulares reales)

1. Registro con correo + con Google → perfil completo.
2. Import CSV de prueba → boleta vinculada → escarapela con tier correcto.
3. Credencial: escaneo entre los 2 celulares → conexión bidireccional + nota.
4. Modo stand: sello + lead → visible en /mi-stand y /admin/evento.
5. Push: guardar charla → editar hora desde admin → llega la notificación.
6. Modo avión: QR y credencial visibles offline; el escaneo se sincroniza al volver la señal.
7. Instalar la PWA en Android e iOS (Añadir a pantalla de inicio).

## Paso 6 — Después del evento

- Subir grabaciones 2026 a Academia (máximo 2 semanas — es el motor de venta 2027).
- Fase 22 final: build Android con el logo real → Google Play; iOS desde un Mac.
- Export de leads por stand para el equipo comercial.

---

## Pendiente estratégico (no técnico)

- **La Tiquetera:** pedir export diario automático (o API) durante la semana del evento para vincular compras de última hora.
- **Precios/cifras:** confirmación final del equipo Effix antes de publicar.
