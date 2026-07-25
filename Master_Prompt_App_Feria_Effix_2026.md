# MASTER PROMPT — App Oficial Feria Effix 2026

> Documento de referencia para el desarrollo de la app con herramientas de IA (Claude Code, v0, Bolt, Lovable, Cursor). Consolida las decisiones de producto tomadas en el estudio de mercado, el benchmark de UX y las definiciones de negocio de Feria Effix.

---

## 1. Contexto del producto

Feria Effix es la feria de comercio electrónico y marketing digital más grande de Latinoamérica, realizada en Plaza Mayor, Medellín, del 16 al 18 de octubre de 2026. El objetivo de este producto es construir la **app oficial de asistentes** más una **herramienta separada de gestión de embajadores**, diferenciándose de toda la competencia (Whova, Cvent, Bizzabo, Swapcard, Tikzet, TuBoleta, entre otros) al no existir en el mercado ninguna plataforma que unifique ticketing, networking, marketplace de alianzas y comisiones multinivel en un solo ecosistema.

**Nota de consistencia pendiente:** existe una discrepancia entre las cifras publicadas en el sitio web de Feria Effix (380+ marcas, 180+ conferencias) y las citadas en la carta de invitación a la AFA (1.000+ marcas, ~400 conferencias). Debe resolverse antes de usar cualquier cifra en materiales de producto, pitch o dentro de la app.

---

## 2. Identidad de marca (oficial, según BRANDBOOK_FERIA_EFFIX_2026)

> Esta sección reemplaza el supuesto inicial de "fondo antracita + tarjetas lavanda-malva + blobs orgánicos + wordmark brush-script + estilo festival urbano". El brandbook oficial define una dirección distinta: **futurista/tech con acabados cromados**, no festivalera. Se documenta abajo tal como está en el brandbook.

### Paleta de color oficial (los 3 únicos colores de marca)

| Color | HEX | RGB | CMYK |
|---|---|---|---|
| Negro profundo | `#000000` | R:0 G:0 B:0 | C:91 M:79 Y:62 K:97 |
| Blanco puro | `#FFFFFF` | R:255 G:255 B:255 | C:0 M:0 Y:0 K:0 |
| Lavanda grisáceo | `#726E8D` | R:114 G:110 B:141 | C:61 M:54 Y:27 K:9 |

Si no es posible usar los colores exactos, el brandbook indica usar tonalidades dentro de la misma gama cromática (grises/lavandas apagados), no colores saturados fuera de esta paleta.

### Tipografía

- **Familia única:** Montserrat.
- **Montserrat Black:** titulares, preferiblemente en mayúsculas, numeraciones y elementos destacados.
- **Montserrat Regular:** texto continuo, cuerpos de texto largos o con mucha información (ideal para descripciones de ponentes, stands, políticas dentro de la app).
- No se especifica ninguna tipografía script/brush — se descarta esa referencia anterior.

### Logo

- **Versión cromada (preferida siempre que sea posible):** acabado metálico tipo cromo, superficies brillantes y pulidas — transmite innovación, tecnología y liderazgo. Es la versión por defecto para la app.
- **Versión general:** sin año, para piezas no ligadas a una edición específica (comunicación interna, materiales atemporales).
- **Versión "Edición actual":** debe incluir el año correspondiente (ej. "2026"), respetando proporciones, y el año siempre en Montserrat Black.
- Existen versiones alternativas estándar adicionales permitidas, pero cualquier versión nueva requiere aprobación previa del equipo de Feria Effix.
- **Usos incorrectos (prohibidos):** alterar la disposición de sus elementos, modificar proporciones, estirar/comprimir/distorsionar, cambiar la tipografía oficial, rotar o inclinar, usarlo sobre fondos que afecten su legibilidad, o reducirlo a un tamaño que comprometa su claridad.

### Texturas y fondos

- Texturas permitidas: **cromo, cristal/vidrio, fibra de vidrio**, y **degradados dentro de la paleta permitida con un toque de ruido (noise)**.
- Concepto a reforzar: futurista, innovador, digital — no orgánico ni festivalero.
- Uso recomendado: preferentemente como fondos, no como elementos decorativos aislados.
- Cada edición de la feria puede tener una temática visual adicional; cualquier elemento relacionado con esa temática debe validarse con el equipo de Feria Effix antes de usarse.

### Fotografía

- Prioridad 1: fotos reales de ediciones anteriores/actuales de la feria (evento, asistentes, ponentes, marcas, aliados), disponibles en Google Drive con el equipo de comunicaciones.
- Estilo: fotos naturales, personas felices y animadas, preferiblemente en grupo (para transmitir la magnitud de la feria).
- Si no hay foto disponible: bancos de imágenes (Freepik, Pexels, Unsplash) o generación con IA (Midjourney, IA de Freepik), ajustada a la paleta cromática en la medida de lo posible.

### Tono de voz (aplica a copys dentro de la app: onboarding, notificaciones, microcopy)

- Se habla desde el **"nosotros"** (comunidad unida por el espíritu emprendedor) y se dirige al usuario de **"tú"** — cercano, amigable, claro.
- Lenguaje directo, sin tecnicismos innecesarios, evitando el tono corporativo distante.

### Nota de diseño de producto

Dado que la marca oficial es cromo/futurista y no "festival urbano con blobs orgánicos", el lenguaje visual de la app (botones, tarjetas, iconografía) debería inclinarse hacia **superficies con efecto vidrio/cromado, bordes limpios y contraste alto negro-blanco-lavanda**, en vez de formas orgánicas tipo blob. Esto debe confirmarse con el equipo de diseño de Feria Effix antes de construir el sistema de componentes definitivo, pero es la lectura más fiel al brandbook oficial.

---

## 3. Arquitectura general del producto

Dos productos distintos, un mismo motor de datos:

1. **App Feria Effix** (pública, para todos los asistentes) — 8 módulos, detallados abajo.
2. **Panel de Embajadores** (portal web separado, no app nativa en esta fase) — para los ~200-300 comercializadores de boletas, stands y patrocinios. No se integra a la app pública para no complejizar el registro ni la experiencia del asistente promedio.

Ambos productos comparten el mismo backend de ventas (boletas, stands, patrocinios, alianzas estratégicas), de modo que el Panel de Embajadores puede calcular comisiones en tiempo real sin duplicar datos.

---

## 4. Módulos de la App Feria Effix

### 4.1 Tickets
- Compra de boletas General, VIP y Black dentro de la app.
- QR de acceso con **clave dinámica** (rotación periódica del código para evitar capturas de pantalla fraudulentas).
- Funcionamiento **offline**: el QR y la validación de acceso deben funcionar sin conexión a internet, sincronizando el estado apenas se recupere señal (arquitectura offline-first, aprendizaje directo de Tomorrowland/Coachella).
- Requiere boleta vigente del año en curso para estar activo.

### 4.2 Programación en tiempo real
- Agenda completa de la feria (auditorios, horarios, charlas) actualizada en vivo.
- Idealmente personalizable por intereses del asistente (aprendizaje de Disney Genie), aunque puede empezar como agenda general en el MVP y evolucionar a personalizada en una siguiente fase.
- Notificaciones de cambios de horario o cancelaciones en tiempo real.

### 4.3 Mapa general con GPS
- Mapa interactivo del recinto (Plaza Mayor): auditorios, baños, stands, puntos de comida y servicios.
- Navegación/direccionamiento del usuario hacia cualquier punto del mapa.
- Requiere boleta vigente del año en curso (es una función operativa del evento en sí, no de contenido).

### 4.4 Stands
- Directorio de expositores con perfil de cada marca/stand.
- Agendamiento de reuniones, solicitud de citas y planificación de visitas.
- El directorio rota por edición: los stands de 2026 dan paso a los de 2027 según se renueven o se vendan los nuevos espacios.

### 4.5 Ponentes
- Perfil de cada ponente (bio, temática, horario de su charla).
- Calificación de la conferencia por parte de los asistentes.
- Seguimiento a sus redes sociales y envío de preguntas en vivo.
- El directorio de ponentes también rota por edición, igual que Stands.

### 4.6 Academia
- Repositorio de ponencias grabadas que superen un nivel de aprobación de calidad definido por la organización.
- Los asistentes pueden calificar cada ponencia dentro de la app.
- **Acceso de por vida** para cualquiera que haya comprado una boleta alguna vez (no se corta a los pocos días de terminado el evento). Este es el mecanismo que mantiene viva la feria durante todo el año y funciona como el mejor canal de venta anticipada de la edición siguiente.

### 4.7 Alianzas Estratégicas
- Marketplace donde mentores y empresas socias venden sus propios programas, productos o servicios a la audiencia de Feria Effix.
- **Modelo de negocio:** Feria Effix negocia individualmente con cada empresa/mentor una promoción y un link de referido propio. Cuando un asistente compra a través de ese link, **la comisión la gana Feria Effix como plataforma** — es una fuente de ingreso adicional y distinta a las comisiones de embajadores.
- Este módulo no depende del Panel de Embajadores; es un motor de monetización propio de la organización.

### 4.8 Comunidad y Networking
- Perfil público simple por usuario: nombre, rol/categoría (ej. trafficker, agencia, marca), país, bio corta, y campos opcionales de logros/resultados (opcional, nunca obligatorio, para evitar presión social).
- Directorio buscable y filtrable por rol, país o interés.
- Botón de "conectar" simple, redirigiendo a WhatsApp, Instagram o LinkedIn — **sin mensajería interna en el MVP**.
- **Acceso abierto y gratuito para cualquier persona registrada**, sin necesidad de haber comprado boleta nunca. Es la puerta de entrada gratuita que mantiene viva la comunidad todo el año y sirve de gancho de venta hacia la boleta de la siguiente edición.
- Sin feed, sin gamificación por puntos — aprendizaje directo de Whova y de las apps de clubes deportivos, donde estas mecánicas generan fatiga sin aportar valor real.

---

## 5. Modelo de acceso por nivel

| Función | Requiere boleta vigente del año en curso | Acceso permanente (alumni) | Abierto a cualquiera registrado |
|---|---|---|---|
| Tickets (QR activo) | Sí | No | No |
| Programación en tiempo real | Sí | No | No |
| Mapa GPS | Sí | No | No |
| Stands (directorio de la edición activa) | Sí | No | No |
| Ponentes (directorio de la edición activa) | Sí | No | No |
| Academia (contenido grabado) | — | Sí, de por vida tras la primera compra | No |
| Alianzas Estratégicas | Sí | — | No |
| Comunidad y Networking | — | Sí | **Sí, gratis para todos** |

---

## 6. Panel de Embajadores (producto separado)

- Portal web (no app nativa en esta fase), pensado para ~200-300 personas.
- Registro propio, independiente del registro de asistentes de la app pública.
- Dashboard en tiempo real de ventas y comisión por tipo:
  - Boletas (50% General/VIP, 10% Black).
  - Stands (3% del valor antes de IVA).
  - Patrocinios (2% del valor antes de IVA).
- Historial de pagos y estado de cada comisión (pendiente, aprobada, pagada).
- Este es el diferenciador de mercado más defendible identificado en el estudio: ninguna plataforma existente combina estos tres flujos de comisión en un solo panel.

---

## 7. Principios de diseño (aprendizajes del benchmark de UX)

- No sobrecargar el primer uso con configuraciones obligatorias (aprendizaje de Disney Genie+/Lightning Lane, señalado como confuso por usuarios primerizos).
- Diseñar con tolerancia a fallos de conectividad desde el MVP, no como mejora futura (aprendizaje de Tomorrowland/Coachella).
- Evitar mecánicas de gamificación complejas (puntos, leaderboards); preferir encuestas y contenido corto tipo "stories" (aprendizaje de FC Barcelona/Real Madrid y de las quejas sobre el leaderboard de Whova).
- Un solo QR/credencial digital para acceso — camino hacia una futura credencial única de pago dentro de stands, sin construirlo necesariamente en el MVP.
- Mantener la app del asistente y el panel de embajadores como productos separados para no complicar el registro general.

---

## 8. Pendientes fuera del alcance de este documento

- Validar con el equipo de diseño de Feria Effix la traducción de la dirección "cromo/futurista" del brandbook a componentes de UI concretos (botones, tarjetas, iconografía) antes de construir el sistema de diseño definitivo.
- Resolver la inconsistencia de cifras (sitio web vs. carta AFA) antes de usarlas en cualquier material.
- Definir si la membresía anual de Academia/Networking se vende como producto independiente de la boleta física (oportunidad identificada, no incluida en el MVP).
- Especificación técnica detallada (stack, esquema de datos, endpoints) — este documento es de producto/negocio, no de arquitectura técnica.
