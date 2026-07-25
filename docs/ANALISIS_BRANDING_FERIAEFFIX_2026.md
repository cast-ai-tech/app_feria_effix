# Análisis completo de feriaeffix.com — Branding, comunicación y adaptación a la app

> Análisis realizado el 24 de julio de 2026 con inspección visual en navegador (screenshots + extracción de CSS computado) y lectura completa de contenido de: home, /entradas/, /quiero-tener-un-stand/ y /ponentes/.
> **Propósito:** alinear la app oficial con la marca REAL tal como vive hoy en el sitio, y registrar las diferencias frente al brandbook y a los docs internos del repo.

---

## 1. Identidad visual REAL del sitio (verificada en pantalla y CSS)

### 1.1 Colores extraídos del CSS computado

| Color | HEX aprox. | Uso real en el sitio |
|---|---|---|
| Negro `#000000` | — | Fondos de hero, secciones alternas, tarjetas sobre blanco. Dominante. |
| Blanco `#FFFFFF` | — | Fondos de secciones alternas, texto sobre negro, tarjetas sobre negro. |
| Azul marino profundo | `#263164` (rgb 38,49,100) | **Color de texto de cuerpo dentro de tarjetas blancas** (bullets de beneficios). Segundo color más usado. |
| Lavanda grisáceo | `#73708E` (rgb 115,112,142) | Botón CTA del Pasaporte 3 Días, acentos. Coincide casi exacto con el `#726E8D` del brandbook. ✔ |
| Azul cian | `#248ACC` (rgb 36,138,204) | **Glow/anillo neón** alrededor de los CTAs del header y acentos interactivos. |
| Gris claro | `#EEEEEE` / `#F5F7F9` | Fondos suaves, superficies secundarias. |
| Plata/cromo (degradado) | — | Sticker "ENTRADA BLACK", botón "COMPRA TU ENTRADA BLACK", gotas tipo mercurio, íconos 3D metálicos. |
| Dorado (degradado) | — | Sticker "Feria Effix VIP" y botón "COMPRA TU ENTRADA VIP". |
| Morado degradado | — | Fondo de las fotos de ponentes confirmados. |

**🎯 Hallazgo clave — código de color por tier (no está en el brandbook, sí en el sitio):**

| Tier | Color de identidad en el sitio |
|---|---|
| **Black** | Plata / cromo metálico |
| **VIP** | Dorado |
| **General / Pasaporte 3 Días** | Lavanda `#726E8D` |

> ⚠️ Esto corrige lo que veníamos asumiendo en el plan de fases (VIP plateado / Black cromo). Lo correcto según el sitio es: **VIP = oro, Black = plata/cromo, General = lavanda.**

### 1.2 Tipografía

- **Montserrat** en todo el sitio (270 elementos medidos) — confirma el brandbook.
- Titulares: **Montserrat Black/ExtraBold, MAYÚSCULAS**, frecuentemente con **contorno tipo sticker** (texto blanco con borde negro grueso o viceversa, y sombra dura) — "MÁS GRANDE DEL MUNDO", "SÉ PARTE DE LA FERIA SI…", "ENTRADA BLACK", "3 DÍAS".
- **El logo SÍ es brush-script** ("Feria Effi" caligráfico + X gigante con flecha/cohete). El brandbook decía "sin tipografía script", pero el logo vivo la usa. Regla práctica: **la caligrafía existe SOLO dentro del logo como asset gráfico — nunca se recrea como tipografía de UI.** La app usa el logo oficial en PNG/SVG y Montserrat para todo lo demás.

### 1.3 Lenguaje visual y componentes recurrentes

1. **Alternancia de secciones negro ↔ blanco** con tarjetas invertidas (tarjeta negra sobre sección blanca y viceversa). No es "todo oscuro": el ritmo negro/blanco es parte de la identidad.
2. **Esquinas muy redondeadas** (~24–28px) en tarjetas y botones pill.
3. **Stickers 3D metálicos**: titulares de tier con acabado cromo/oro y contorno; íconos 3D cromados (avión de papel, gotas de mercurio).
4. **Glow neón cian** en CTAs principales del header (anillo azul brillante alrededor del botón blanco).
5. **Botones pill** con degradado metálico según tier (plata Black, oro VIP, lavanda Pasaporte) y texto negro en Montserrat Bold.
6. **Íconos blancos en círculo** sobre tarjetas negras (calendario, ubicación, reloj, persona, tienda, camión).
7. **Countdown flip-clock** fijo al pie: "Feria Effix 2026, sólo faltan: XX días…" — urgencia permanente.
8. **Botones flotantes laterales**: Compra tu Entrada, Compra tu Stand, WhatsApp (verde) — siempre visibles.
9. Fotos reales de ediciones anteriores como prueba social; ponentes sobre fondo morado degradado.

---

## 2. Comunicación y tono (textos reales del sitio)

### 2.1 Tono

- **Tuteo directo + exclamación**: "¡Compra tu Entrada!", "¡Únete y descubre lo que la Feria Effix tiene para ti!".
- **Superlativo como bandera**: "La feria de e-commerce más grande del mundo" (el sitio ya no dice "de Latinoamérica").
- **Imperativos de acción en MAYÚSCULAS** para CTAs: "COMPRA TU ENTRADA BLACK", "QUIERO SER UN PONENTE EFFIX", "ADQUIERE TU STAND".
- **Urgencia y escasez**: countdown permanente, "Solo 400 cupos en todo el mundo" (Black), "Cuando se llenan, se llenan".
- **Problema → solución**: "¿Ves que otros venden muchísimo por internet…? Aquí encuentras la pieza que te falta".
- **Confianza explícita**: "Pago 100% seguro. Esta es la página oficial de Feria EFFIX".
- Segmentación por identidad: "Sé parte de la feria si… eres emprendedor / tienes una comunidad / tienes marca de productos propios / tienes un marketplace / tienes marca personal / eres proveedor mayorista o importador / tienes una marca posicionada".

### 2.2 Fórmulas de copy reutilizables en la app

- Beneficio + cifra + precio: "3 días, +200 ponentes y +350 empresas por $201.300".
- Nombre de objetos propios: "**Escarapela** Black/VIP" (no "boleta" a secas), "**Línea Black**" (soporte dedicado), "Full Pack de comidas".
- CTAs siempre en primera persona implícita del deseo: "Compra TU entrada", "QUIERO ser ponente", "QUIERO que mi marca esté presente".

---

## 3. Información de negocio actualizada (difiere de los docs internos del repo)

| Dato | Docs internos del repo | Sitio oficial HOY | Acción en la app |
|---|---|---|---|
| Precio General/Pasaporte | $183.000 | **$201.300** (Pasaporte 3 Días, 16–18 oct) | Actualizar `ticket_types` / copys |
| Precio VIP | $1.050.000 | **$1.155.000** (5 días, 15–19 oct) | Actualizar (ambos = +10% exacto: son los precios con IVA/servicio) |
| Precio Black | $3.997.000 | $3.997.000 ✔ (limitada a **400 cupos**, pago en 4 cuotas o de contado) | Mostrar escasez "solo 400" |
| Días | 16–18 oct | **15–19 oct** (Black/VIP 5 días; General 16–18) | Ya corregido en Fase 12 del plan |
| Entrada Corporativa | No existía | **Existe: equipos de 10+ personas, precio por volumen** | Nuevo tipo en `ticket_types` (import CSV igual) |
| Reembolso | Ventana TBD 30 días | **"No reembolsable pero transferible"** (vía WhatsApp antes del evento) | ✔ Simplifica: la app implementa TRANSFERENCIA (ya diseñada), no reembolso self-service |
| Bono preventa | — | **Bootcamp de IA de 6 horas** (preventa hasta 31 de julio; incluido también en VIP) | Módulo Academia puede alojar el bootcamp |
| Cifras | 380+ marcas / 180+ conf | Home: 50.000+ / 380+ / 180+; página stands: "+600 marcas", "+170 ponentes"; entradas: "+350 stands / +200 conferencias" | ⚠️ El sitio mismo es inconsistente — dentro de la app usar UNA sola fuente (definir con el equipo Effix) |
| Beneficios Black | 9 mentorías, comidas, zonas | + **fotografías profesionales incluidas, descuentos de hotel, Línea Black anual** | Alimenta el backlog de capa Black |
| Ponentes confirmados | — | 17 confirmados (Victor Heras, Mike Munzvil, Felipe Vergara, Oscar Martan, Guillermo González Pimiento, El Profe Miguel, etc.) | Seeds reales para el módulo Ponentes |

---

## 4. Adaptación a la app — tokens y reglas de diseño

### 4.1 Paleta extendida para la app (evolución de Brand_Quickref)

```css
/* Núcleo (brandbook, se mantiene) */
--negro: #000000;
--blanco: #FFFFFF;
--lavanda: #726E8D;        /* también color del tier General */

/* Extensión validada por el sitio en vivo */
--texto-tarjeta: #263164;   /* cuerpo de texto sobre tarjetas blancas */
--glow-cian: #248ACC;       /* anillo neón de CTAs primarios */
--gris-suave: #EEEEEE;      /* superficies secundarias */

/* Degradados de tier (stickers y botones) */
--tier-black: linear-gradient(135deg, #E8E8E8, #9A9A9A, #F5F5F5, #6E6E6E);  /* plata/cromo */
--tier-vip: linear-gradient(135deg, #F5D67B, #C9962E, #FFE9A8, #A67C1E);     /* oro */
--tier-general: #726E8D;                                                      /* lavanda */
```

### 4.2 Reglas de UI derivadas del sitio

1. **La boleta/credencial en la app hereda el color del tier del sitio**: Black = tarjeta cromo animada, VIP = tarjeta dorada, General = tarjeta lavanda/glass. (Corrige la Fase 14 del plan.)
2. **CTAs primarios**: botón pill blanco con glow cian animado (patrón del header del sitio) para acciones principales; botones degradado metálico solo para acciones ligadas a un tier.
3. **Titulares de módulo**: Montserrat Black MAYÚSCULAS. El efecto sticker (contorno) se reserva para pantallas "momento wow" (celebración de pasaporte completado, credencial) — no en UI funcional densa.
4. **Alternancia y tarjetas invertidas**: mantener el esquema actual de la app (fondo negro + glass) como base, pero adoptar tarjetas blancas con texto `#263164` para bloques de lectura larga (descripciones de Academia, políticas) — es el patrón de legibilidad que el sitio ya usa.
5. **Countdown**: widget de cuenta regresiva en el Home de la app (idéntico concepto al del sitio) hasta el 15 de octubre; después muta a "Día 1/5 de la feria".
6. **WhatsApp siempre a un tap**: el sitio canaliza TODA la venta consultiva por WhatsApp (+57 322 712 8649). La app debe seguir esa lógica: soporte, Black y stands cierran por WhatsApp.
7. **El logo nunca se recrea con tipografía**: siempre asset oficial (pedir SVG/PNG cromado al equipo de comunicaciones).

### 4.3 Reglas de copy para la app (microcopy, notificaciones, vacíos)

- Hablar de **"tu escarapela" / "tu entrada"**, "tu Pasaporte 3 Días" — usar los nombres comerciales del sitio.
- Exclamación en momentos de logro ("¡Conexión guardada!"), sobriedad en lo operativo.
- Urgencia honesta: countdown y cupos reales, sin inventar escasez.
- Prueba social con cifras — pero UNA sola versión de cifras aprobada por Effix.
- Nosotros-comunidad + tú-directo (confirma el brandbook): "Únete", "descubre", "tu negocio".

---

## 5. Discrepancias a resolver con el equipo Effix (checklist)

- [ ] **Cifras oficiales únicas** para usar en la app (el sitio mezcla 380+/600+ marcas y 180+/200+ conferencias según la página).
- [ ] Confirmar **precios finales** que mostrará la app ($201.300 / $1.155.000 / $3.997.000) y si se muestran con o sin fee.
- [ ] Pedir **assets oficiales**: logo cromado SVG, stickers de tier (Black plata, VIP oro), íconos 3D, fotos de ediciones anteriores (Drive de comunicaciones).
- [ ] Validar la **política "no reembolsable pero transferible"** como regla única en la app (elimina la ventana de reembolso TBD).
- [ ] Confirmar si la **Entrada Corporativa** llega por el mismo CSV de La Tiquetera (columna tipo).
- [ ] Definir si el **Bootcamp de IA** (bono de preventa) se entrega dentro del módulo Academia de la app.

---

## 6. Cambios que este análisis introduce en los documentos del proyecto

1. **PLAN_FASES_DEFINITIVO.md — Fase 12:** actualizar precios en `ticket_types` y agregar tipo "Corporativa"; reemplazar lógica de reembolso por transferencia de titular.
2. **PLAN_FASES_DEFINITIVO.md — Fase 14:** corrección de tiers visuales de la credencial → **General lavanda, VIP dorada, Black plata/cromo**.
3. **Brand_Quickref.md:** queda complementado por la sección 4 de este documento (paleta extendida + reglas de UI y copy).
4. **Módulo Ponentes:** usar los 17 ponentes confirmados reales como seeds de desarrollo.
