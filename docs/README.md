# Feria Effix — Kit de Desarrollo del Sitio Web / App

Este es el paquete de referencia fijo para todo desarrollo relacionado con el sitio web/app de asistentes de Feria Effix. Cada vez que se cree una nueva pantalla, módulo o pieza de producto, debe partir de estos tres documentos.

## Contenido

1. **`Master_Prompt_App_Feria_Effix_2026.md`**
   El documento de producto y negocio: los 8 módulos de la app (Tickets, Programación, Mapa, Stands, Ponentes, Academia, Alianzas Estratégicas, Comunidad), el modelo de acceso por niveles, el Panel de Embajadores como producto separado, y los principios de diseño (aprendizajes del benchmark de UX de Disney/Tomorrowland/Coachella/clubes deportivos).

2. **`Brand_Quickref.md`**
   Extracto operativo del brandbook oficial: colores exactos, tipografía, reglas del logo, concepto visual (cromo/futurista) y tono de voz. Referencia rápida sin tener que abrir el PDF completo cada vez.

3. **`feria_effix_app_web.html`**
   El prototipo clickeable funcional de la app web: los 8 módulos navegables con contenido de ejemplo, sirviendo como referencia visual y de interacción exacta para lo que se debe construir con backend real.

*(Opcional: agregar aquí también `BRANDBOOK_FERIA_EFFIX_2026.pdf` original si se necesita el logo en alta resolución o ejemplos gráficos completos).*

## Cómo usar este kit

- **Para seguir refinando el diseño o agregar una pantalla nueva:** parte siempre del HTML existente y de `Brand_Quickref.md`, para que cualquier pantalla nueva sea consistente con las ya construidas.
- **Para llevarlo a Claude Code (u otra herramienta de desarrollo):** carga los tres archivos como contexto inicial de un proyecto nuevo y pide que construya la versión con backend real (base de datos, autenticación, pagos) tomando el HTML como especificación de interfaz.
- **Para validar alcance de negocio:** el Master Prompt es la fuente de verdad de qué hace cada módulo y qué regla de acceso aplica — si surge una duda de producto, se resuelve ahí primero.

## Pendientes activos (fuera de este kit, pero relevantes)

- Resolver la inconsistencia de cifras entre el sitio web y la carta a la AFA.
- Definir el flujo de compra de boleta dentro del prototipo (aún no construido).
- Panel de Embajadores: por ahora manual (fuera del alcance de este kit); evaluar más adelante si se construye como portal.
