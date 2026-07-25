# Documentación técnica — App Feria Effix 2026

Documentación completa de arquitectura, funcionamiento y estructura del repositorio, generada a partir de un barrido total del código (commit `0d2698a — Feria Effix 2026 — app completa (Fases 0-12)`).

> ⚠️ El `README.md` de la raíz dice "Fase 0 completada", pero el código real cubre las **Fases 0–11** (los 8 módulos + panel admin completo). Este set de documentos refleja el estado real.

## Índice

| Documento | Contenido |
|---|---|
| [01_ARQUITECTURA.md](./01_ARQUITECTURA.md) | Visión general: stack, capas, estructura de carpetas, clientes Supabase, middleware, PWA/offline |
| [02_MODELO_DE_DATOS.md](./02_MODELO_DE_DATOS.md) | Todas las tablas, columnas, relaciones, índices, políticas RLS, funciones SQL y triggers |
| [03_AUTENTICACION_Y_ACCESO.md](./03_AUTENTICACION_Y_ACCESO.md) | Flujos de login/registro/OAuth/recuperación y la matriz de acceso por módulo |
| [04_MODULOS.md](./04_MODULOS.md) | Los 8 módulos de la app asistente, página por página: qué muestran, qué datos usan, cómo funcionan |
| [05_PANEL_ADMIN.md](./05_PANEL_ADMIN.md) | Panel `/admin`: protección, las 6 secciones, todas las server actions |
| [06_COMPONENTES.md](./06_COMPONENTES.md) | Design system (UI base) y componentes de feature con su lógica |
| [07_TICKETS_QR_OFFLINE.md](./07_TICKETS_QR_OFFLINE.md) | El sistema más complejo: boletas, TOTP, QR dinámico, modo offline, CSV de La Tiquetera |
| [08_HALLAZGOS.md](./08_HALLAZGOS.md) | Bugs detectados, riesgos, deuda técnica y pendientes antes de producción |

## Resumen en 10 líneas

- **Qué es:** app oficial de asistentes de Feria Effix (feria de e-commerce y marketing digital, Plaza Mayor Medellín, 16–18 oct 2026). PWA móvil de una sola columna (max 440px).
- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (Postgres/Auth) + deploy en Vercel.
- **8 módulos:** Tickets (QR dinámico offline), Agenda, Mapa, Stands, Ponentes, Academia, Alianzas, Comunidad.
- **Modelo de acceso:** boleta vigente del año desbloquea casi todo; Academia es de por vida para alumni; Comunidad es gratis para cualquier registrado.
- **Ventas:** la app NO cobra. General/VIP los vende La Tiquetera (se importan por CSV); Black se vende manual por WhatsApp.
- **Admin:** panel consolidado en `/admin` protegido por `profiles.is_admin`, con server actions que usan la service-role key tras verificar el rol.
- **Marca:** solo 3 colores (negro `#000000`, blanco `#FFFFFF`, lavanda `#726E8D`), Montserrat única tipografía, estética cromo/glass/futurista.
- **Estado:** funcional de punta a punta, pero con bugs conocidos y placeholders de producción sin reemplazar → ver [08_HALLAZGOS.md](./08_HALLAZGOS.md).
