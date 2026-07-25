<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Reglas del repo (ley desde la Fase 13)

La app se empaquetará con Capacitor para Google Play y App Store (Fase 22). Estas reglas mantienen la base portable:

1. **Nunca usar APIs del navegador fuera de `src/lib/platform/`.** Nada de `localStorage`, `navigator.*`, cámara, vibración, share ni push directo en componentes o libs de negocio — siempre a través de los adaptadores (`storage.ts`, `camera.ts`, `notifications.ts`, `share.ts`, `haptics.ts`). En la Fase 22 se sustituyen por plugins de Capacitor sin tocar la UI.
2. **Todo módulo/página nuevo DEBE llamar `getAccess()`** (`src/lib/access.ts`) y respetar la matriz de anillos: gratis (Comunidad/Credencial) → alumni de por vida (Academia) → boleta vigente (resto). El middleware no hace gating; sin `getAccess()` un módulo nace abierto.
3. **Nada hardcodeado de edición, fechas o parámetros operativos.** Fechas y días de la edición → tabla `editions` (helpers en `src/lib/editions.ts`, `access.edition`); parámetros operativos (WhatsApp Black, ventana de reembolso, límites) → tabla `app_config` editable en `/admin/config`.
4. **Lógica de negocio en `src/lib/`**, nunca dentro de componentes.
5. **Server actions del admin**: siempre `assertAdmin()` de `src/lib/adminGuard.ts`.
<!-- END:nextjs-agent-rules -->
