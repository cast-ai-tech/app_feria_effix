# App Feria Effix 2026

App oficial de asistentes de **Feria Effix** — la feria de e-commerce y marketing digital.
Plaza Mayor, Medellín · 16–18 de octubre de 2026.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de marca en `src/app/globals.css`)
- **Supabase** (Postgres + Auth + Storage) — se integra desde la Fase 2
- Despliegue en **Vercel**

## Documentos de referencia

Están en [`docs/`](./docs) y son la fuente de verdad del producto y del diseño:

- `Master_Prompt_App_Feria_Effix_2026.md` — producto/negocio: 8 módulos y modelo de acceso.
- `Brand_Quickref.md` — marca: colores, tipografía, concepto cromo/futurista.
- `feria_effix_app_web.html` — prototipo clickeable = especificación visual.
- `Prompt_Desarrollo_por_Fases_Claude_Code.md` — plan de construcción por fases.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
```

Copia `.env.example` como `.env.local` y rellena las credenciales de Supabase (necesarias desde la Fase 2).

## Estructura

```
src/
  app/
    layout.tsx        # shell de app móvil + fuente Montserrat + fondo de marca
    page.tsx          # home con grid de 8 módulos
    globals.css       # tokens de marca (Tailwind v4)
    tickets/          # Fase 3
    agenda/           # Fase 4
    mapa/             # Fase 5
    stands/           # Fase 6
    ponentes/         # Fase 7
    academia/         # Fase 8
    alianzas/         # Fase 9
    comunidad/        # Fase 10
  components/
    BottomNav.tsx         # navegación inferior (4 accesos)
    ModulePlaceholder.tsx # placeholder de módulo (temporal, Fase 0)
```

## Estado

**Fase 0 completada:** scaffold, configuración de marca, 8 páginas navegables (placeholder) y navegación básica. Sin lógica de negocio todavía.
