# Prompt de Desarrollo por Fases — App Feria Effix (para Claude Code)

## Cómo usar este documento

1. Abre Claude Code, crea/selecciona la carpeta del proyecto.
2. Copia primero el **Master_Prompt_App_Feria_Effix_2026.md**, **Brand_Quickref.md** y **feria_effix_app_web.html** dentro de la carpeta del proyecto (contexto permanente).
3. Pega **una fase a la vez** en el chat de Claude Code, en orden. No pegues todas las fases juntas.
4. Revisa lo que construyó antes de pasar a la siguiente fase. Si algo no quedó bien, pídele el ajuste antes de avanzar — no sigas con la fase siguiente sobre una base rota.
5. Cada fase asume que las anteriores ya están construidas.

**Nota pendiente:** la ventana de días para reembolso completo (Fase 3) queda como `[TBD — definir]`. Reemplázala cuando la tengas antes de construir esa parte, o dile a Claude Code que la deje configurable en una variable para poder cambiarla después sin tocar código.

---

## FASE 0 — Configuración del proyecto

```
Vamos a construir la app web de Feria Effix, una feria de e-commerce y marketing digital en Medellín, Colombia (16-18 de octubre de 2026). Ya tengo en esta carpeta el Master Prompt del producto, la guía rápida de marca (Brand_Quickref.md) y un prototipo HTML clickeable (feria_effix_app_web.html) que muestra exactamente cómo se debe ver y navegar la app.

Quiero que uses ese HTML como referencia visual y de interacción — no lo descartes, es la especificación de diseño.

Stack recomendado para este proyecto (usa este a menos que tengas una razón concreta para sugerir otro, y si es así, explícamela antes de decidir):
- Next.js (React) con TypeScript
- Tailwind CSS (para poder traducir fácilmente los estilos del prototipo HTML)
- Supabase como backend (Postgres + autenticación + almacenamiento de archivos) — necesito algo simple de administrar sin ser desarrollador experto
- Despliegue en Vercel

Por ahora:
1. Inicializa el proyecto con este stack.
2. Configura Tailwind con los tokens de marca del Brand_Quickref.md (colores exactos: negro #000000, blanco #FFFFFF, lavanda grisáceo #726E8D; tipografía Montserrat con pesos Black y Regular).
3. Crea la estructura de carpetas para las 8 páginas/módulos que están en el Master Prompt (Tickets, Agenda, Mapa, Stands, Ponentes, Academia, Alianzas, Comunidad), aunque por ahora queden vacías.
4. No implementes lógica de negocio todavía — solo el esqueleto del proyecto, la configuración de marca, y la navegación básica entre las 8 páginas vacías.

Confírmame la estructura de carpetas que creaste antes de seguir.
```

---

## FASE 1 — Sistema de diseño

```
Ahora construye el sistema de componentes reutilizables de la app, basándote fielmente en feria_effix_app_web.html:

1. Componente de "tarjeta de vidrio/cromo" (glass card) con el efecto de brillo que recorre la tarjeta (sheen), igual al del prototipo.
2. Componente de fondo con el degradado radial lavanda sobre negro + textura de ruido sutil.
3. Componentes de botón: sólido (blanco con texto negro) y "ghost" (borde blanco translúcido).
4. Componente de chip/badge (para estados como "Modo offline activo", "Acceso permanente", etc.).
5. Barra de navegación inferior con 4 accesos (Inicio, Agenda, Mapa, Perfil), como en el prototipo.
6. Tipografía: Montserrat Black para títulos, Montserrat Regular para cuerpo — cárgala desde Google Fonts.

Estos componentes se van a reutilizar en las 8 páginas del módulo, así que priorizamos que queden bien parametrizados (props para texto, ícono, acción) en vez de repetir código por cada página.

Muéstrame los componentes construidos en una página de "storybook" simple antes de seguir a la Fase 2.
```

---

## FASE 2 — Autenticación y perfil de usuario

```
Implementa autenticación de usuarios con Supabase Auth:

1. Registro con correo electrónico + contraseña (y opción de Google, si es rápido de agregar).
2. Login / logout / recuperar contraseña.
3. Al registrarse, el usuario completa un perfil básico: nombre, país, rol/categoría (ej. trafficker, agencia, marca, asistente general — lista abierta, que se pueda ampliar después), y opcionalmente una bio corta.
4. Este mismo perfil es el que se usa después en el módulo de Comunidad (Fase 9), así que constrúyelo pensando en que ya trae esos campos.
5. Guarda en la base de datos un campo para el correo electrónico que se usará más adelante (Fase 3) para vincular la boleta comprada en La Tiquetera con la cuenta de la app — debe ser el mismo correo o debe poder vincularse manualmente si no coincide.

No implementes todavía el módulo de Comunidad completo (directorio, buscar, conectar) — eso es la Fase 9. Aquí solo crea el perfil base.
```

---

## FASE 3 — Módulo de Tickets (el más importante — máximo detalle)

```
Este es el módulo más importante de la app. Contexto de negocio:

- Las boletas se venden hoy a través de un tercero llamado "La Tiquetera SAS" — la app NO procesa pagos de boletas General ni VIP, solo debe mostrar la boleta ya comprada.
- Tipos de boleta 2026: General ($183.000), VIP ($1.050.000), Black ($3.997.000, venta 100% manual por WhatsApp, no por este flujo).
- Aún no sabemos si La Tiquetera tiene API/webhook. Construye el sistema para que funcione en dos escenarios, con el mismo modelo de datos:
  a) Import manual: un panel de administrador simple (protegido, solo rol "admin") donde alguien del equipo Effix sube un archivo CSV/Excel exportado de La Tiquetera (columnas esperadas: nombre, correo, tipo de boleta, número de orden, fecha de compra). El sistema cruza cada fila por correo electrónico con las cuentas de usuario registradas y les asigna la boleta.
  b) Si en el futuro hay API/webhook, debe poder reemplazarse la importación manual por un endpoint que reciba los mismos campos automáticamente, sin cambiar el modelo de datos.
- Boleta Black: no se importa desde La Tiquetera. Un admin la asigna manualmente a una cuenta de usuario desde el mismo panel, marcándola como "Black".

Requisitos del código QR (esto es crítico):
- Cada boleta activa debe mostrar un QR con una "clave dinámica": un código que rota cada 30 segundos, generado a partir de un secreto único de esa boleta (usa un esquema tipo TOTP — código basado en tiempo y un secreto almacenado del lado del servidor, para que no se pueda falsificar con una captura de pantalla).
- El QR debe funcionar SIN conexión a internet: al abrir la app la primera vez con conexión, descarga y guarda localmente (localStorage o IndexedDB) el secreto de la boleta; a partir de ahí, la generación del código rotativo se calcula en el dispositivo usando la hora del sistema, sin necesitar red.
- Muestra visualmente cuánto falta para que rote el código (como en el prototipo).

Reglas de negocio a implementar:
- Reembolso: se permite reembolso completo hasta [TBD — definir] días antes del evento. Modélalo como una variable de configuración fácil de cambiar, no como un valor fijo en el código.
- Transferencia de titular: si permitido, debe quedar un registro de quién era el dueño original y a quién se transfirió, con fecha.
- Si se reembolsa una boleta que fue vendida por un embajador con comisión ya calculada, marca esa comisión como "a descontar del próximo pago" (no la elimines del historial, solo cambia su estado) — esto es información que después va a leer el Panel de Embajadores, que es un proyecto separado, así que expón estos datos de forma que otro sistema los pueda consultar después (una tabla clara de comisiones con estado).

Pantallas a construir (usa el HTML del prototipo como base visual exacta):
1. Vista de "Mi boleta" con el QR, clave dinámica, tipo de boleta, y estado (activa / usada / cancelada).
2. Estado "sin boleta vinculada aún" con instrucciones de qué hacer (ej. verificar que el correo coincide con el de la compra, o botón de "vincular manualmente" con número de orden).
3. Vista Black: si aplica, mensaje de "Solicita tu boleta Black por WhatsApp" con el enlace, en vez de cualquier flujo de compra.
4. Panel de administrador simple: subir CSV, ver boletas importadas, asignar Black manualmente, marcar reembolsos/transferencias.

Confírmame cómo implementaste la generación del código dinámico y el modo offline antes de seguir — es la parte más delicada de todo el proyecto.
```

---

## FASE 4 — Programación en tiempo real

```
Construye el módulo de Agenda:
1. Lista de charlas por auditorio y horario, filtrable por día (Día 1/2/3).
2. La charla que está sucediendo ahora mismo se resalta visualmente (como el badge "Ahora" del prototipo) — compara la hora actual del sistema contra el horario de cada charla.
3. Cada charla enlaza al perfil del ponente (esto se conecta con la Fase 6, constrúyelo aunque esa página esté vacía todavía).
4. Panel de administrador para crear/editar/cancelar charlas y notificar cambios (la notificación push queda para una fase posterior de pulido, por ahora que se refleje el cambio en la app).
```

---

## FASE 5 — Mapa GPS

```
Construye el módulo de Mapa:
1. Mapa del recinto (Plaza Mayor) con zonas marcadas: auditorios, stands, baños, zona de comida, zona de alianzas.
2. Por ahora puede ser un mapa simplificado (como el del prototipo, con zonas en tarjetas/lista) — no necesita ser un mapa geográfico real todavía; eso puede ser una mejora futura con coordenadas GPS reales del recinto.
3. Cada zona, al tocarla, debe poder llevar al módulo correspondiente (ej. tocar "Zona de Stands" navega al módulo de Stands).
```

---

## FASE 6 — Stands

```
Construye el módulo de Stands:
1. Directorio de expositores de la edición activa (2026), con nombre, categoría, número de stand.
2. Buscador y filtro por categoría.
3. Botón de "agendar cita": el asistente solicita una reunión con el stand, el stand recibe la solicitud (puede ser tan simple como una lista de solicitudes pendientes en un panel del expositor, sin necesitar un sistema de calendario complejo en esta fase).
4. Panel de administrador para cargar/editar los stands de cada edición (recuerda que este directorio rota: los de 2026 no deben mezclarse automáticamente con los de años futuros sin revisión).
```

---

## FASE 7 — Ponentes

```
Construye el módulo de Ponentes:
1. Perfil de cada ponente: foto, bio, charla asociada (de la Fase 4), enlaces a redes sociales.
2. Sistema de calificación por estrellas después de que la charla haya ocurrido (no antes).
3. Campo para que los asistentes envíen preguntas en vivo durante la charla — una lista simple visible para el ponente/organizador, no necesita moderación compleja en esta fase.
4. Botón de "seguir" (puede ser un simple registro de interés dentro de la app, no necesita integrarse con redes sociales reales todavía).
```

---

## FASE 8 — Academia

```
Construye el módulo de Academia:
1. Listado de charlas grabadas, filtrable por edición (2024, 2025, 2026).
2. Cada video/charla debe pasar por un campo de "aprobado para Academia" (bandera que marca el admin) antes de aparecer aquí — no todas las charlas grabadas se publican automáticamente.
3. Control de acceso: solo usuarios que hayan tenido al menos una boleta válida en cualquier edición (revisa la tabla de boletas de la Fase 3) pueden ver este contenido — acceso de por vida, no se corta con el tiempo.
4. Los asistentes pueden calificar cada ponencia grabada.
```

---

## FASE 9 — Alianzas Estratégicas

```
Construye el módulo de Alianzas Estratégicas (marketplace):
1. Listado de ofertas/promociones de mentores y empresas aliadas.
2. Cada oferta tiene un link de referido único, negociado y administrado por el equipo de Feria Effix (no por embajadores individuales) — la comisión de esa venta la gana Feria Effix, no un usuario de la app.
3. Panel de administrador para crear/editar ofertas y sus links de referido.
4. Requiere boleta vigente de la edición en curso para ver este módulo.
```

---

## FASE 10 — Comunidad y Networking

```
Construye el módulo de Comunidad:
1. Directorio público de perfiles (usa los datos de perfil de la Fase 2: nombre, país, rol, bio).
2. Buscador y filtro por rol y país.
3. Botón de "conectar" que abre WhatsApp, Instagram o LinkedIn según lo que el usuario haya puesto en su perfil (sin mensajería interna en esta fase).
4. Acceso abierto y gratuito para cualquier usuario registrado, sin necesidad de boleta — a diferencia de casi todos los demás módulos.
5. Nada de feed, nada de puntos ni leaderboards — solo perfil, directorio y conexión externa.
```

---

## FASE 11 — Panel de administrador (consolidado)

```
Ya construiste piezas de administrador sueltas en fases anteriores (importar boletas, cargar stands, crear ofertas, etc.). Ahora consolídalas en un solo panel de administrador con navegación propia, protegido por rol "admin", separado de la experiencia del asistente.
```

---

## FASE 12 — Pruebas y despliegue

```
Antes de desplegar a producción:
1. Prueba el modo offline del módulo de Tickets desactivando la conexión a internet del dispositivo — el QR debe seguir funcionando y rotando.
2. Prueba con datos de ejemplo simulando el archivo CSV de La Tiquetera, incluyendo casos donde el correo no coincide con ninguna cuenta registrada.
3. Revisa que los módulos con restricción de acceso (Academia, Alianzas, Tickets, Agenda, Mapa, Stands, Ponentes) respeten las reglas de la tabla de acceso del Master Prompt, y que Comunidad quede abierta para todos.
4. Despliega a Vercel en un entorno de staging antes de pasar a producción.
```
