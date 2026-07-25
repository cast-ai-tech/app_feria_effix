# Fase 22 — Empaquetado Capacitor → Google Play y App Store

> Estado al cierre de la fase (julio 2026): plataforma **Android agregada y con
> assets nativos generados**. iOS requiere una Mac con Xcode (el equipo
> principal de Alexander es Mac — hacerlo allí). Publicación real = post-evento.

## Decisión de arquitectura (tomada)

La app usa Next.js con **server components + sesión Supabase en cookies** →
NO se puede exportar a estático. Por lo tanto las apps de tienda cargan la
**URL remota de producción** (`server.url` en `capacitor.config.ts`, hoy
comentada hasta que exista `https://app.feriaeffix.com` en Vercel).
`capacitor-shell/` es solo la pantalla de respaldo sin conexión.

Consecuencia positiva: cada deploy a Vercel actualiza las apps de tienda al
instante, sin pasar por revisión de las tiendas.

## Qué ya está hecho

- `capacitor.config.ts` — appId `com.feriaeffix.app`, fondo negro, decisión documentada.
- `npx cap add android` — proyecto nativo en `android/`.
- Iconos y splash nativos (negro + FX cromado) generados con `@capacitor/assets`
  desde `resources/` (74 archivos en `android/app/src/main/res/`).
  ⚠️ Son el placeholder de marca: regenerar con el logo real del brandbook
  (reemplazar `resources/icon-*.png` y `resources/splash*.png`, luego
  `npx capacitor-assets generate --android`).
- Los 5 adaptadores de `src/lib/platform/` aíslan todas las APIs de navegador.

## Pasos pendientes (en la Mac, post-evento)

1. **iOS**: `npx cap add ios` + `pod install` + abrir en Xcode.
2. **server.url**: descomentar en `capacitor.config.ts` con el dominio real,
   `npx cap sync`.
3. **Plugins nativos** (solo donde el WebView se queda corto — los adaptadores
   hacen el swap sin tocar UI):
   | Adaptador | WebView remoto | Plugin nativo (si hace falta) |
   |---|---|---|
   | storage | localStorage funciona | `@capacitor/preferences` (más durable en iOS) |
   | camera | getUserMedia funciona | `@capacitor-mlkit/barcode-scanning` (más rápido) |
   | notifications | Web Push NO funciona en WKWebView iOS | `@capacitor/push-notifications` (FCM/APNs) — **obligatorio en iOS** |
   | share | Web Share funciona | `@capacitor/share` |
   | haptics | vibrate no funciona en iOS | `@capacitor/haptics` |
   Patrón: en cada adaptador, detectar `Capacitor.isNativePlatform()` y elegir
   implementación. El backend de push gana un provider FCM/APNs junto al Web Push
   (tabla `push_subscriptions` gana columna `platform`).
4. **Deep links universales**: `https://app.feriaeffix.com/*` →
   assetlinks.json (Android) + apple-app-site-association (iOS) servidos desde
   `public/.well-known/`.
5. **Checklist de publicación**:
   - Cuenta Google Play Console ($25 único) y Apple Developer ($99/año).
   - Política de privacidad pública (URL) — obligatoria en ambas tiendas.
   - Screenshots (6.7", 6.5", 5.5" iOS; teléfono + tablet Android) en español.
   - Ficha: título "Feria Effix", descripción corta/larga, categoría Eventos.
   - Android: `cd android && ./gradlew bundleRelease` (requiere Android Studio
     + keystore de firma — GUARDAR el keystore, sin él no hay updates).
   - iOS: Archive en Xcode + App Store Connect.

## La PWA sigue viva

La PWA es el canal sin fricción del evento; las apps de tienda son el canal
de retención anual (Academia + Comunidad todo el año).
