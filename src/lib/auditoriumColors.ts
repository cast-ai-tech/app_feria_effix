/**
 * Colores por auditorio (Fase 30) — fuente ÚNICA para los filtros de
 * Programación y los bloques/leyenda de la vista Horario.
 *
 * Los colores son los del PLANO del recinto (VenueMap/planimetría 2026):
 * cada auditorio hereda el color de su pabellón, incluidos los auditorios
 * pequeños patrocinados. Nombres nuevos que no coincidan con ningún
 * pabellón caen a una paleta estable por orden alfabético de aparición.
 */

const KEYWORD_COLORS: Array<[RegExp, string]> = [
  [/effix/i, "#22c55e"], // Pabellón Verde
  [/e-?commerce/i, "#a855f7"], // Gran Salón (morado)
  [/marketing/i, "#facc15"], // Pabellón Amarillo
  [/creadores/i, "#ef4444"], // Pabellón Rojo
  [/prendas|control/i, "#3b82f6"], // Pabellón Azul
  [/unmerco/i, "#e8e8e8"], // Pabellón Blanco (cromo)
  [/vitalcom/i, "#f59e0b"], // dentro del Amarillo (tono ámbar propio)
  [/convertmate/i, "#c084fc"], // junto al Gran Salón (morado claro)
  [/sala abierta|blanco/i, "#cbd5e1"], // Pabellón Blanco
  [/effi\b|grupo effi/i, "#248acc"], // Grupo Effi (cian de marca)
];

/** Respaldo estable para auditorios sin pabellón conocido. */
export const FALLBACK_PALETTE = [
  "#248acc",
  "#726e8d",
  "#f5d67b",
  "#e8e8e8",
  "#8a86ad",
];

/**
 * Color de un auditorio. `allNames` (lista de auditorios visibles) da un
 * índice estable para el respaldo cuando el nombre no matchea pabellón.
 */
export function auditoriumColor(
  name: string | null,
  allNames: string[],
): string {
  if (name) {
    for (const [re, color] of KEYWORD_COLORS) {
      if (re.test(name)) return color;
    }
  }
  const idx = name ? allNames.indexOf(name) : -1;
  return FALLBACK_PALETTE[
    ((idx % FALLBACK_PALETTE.length) + FALLBACK_PALETTE.length) %
      FALLBACK_PALETTE.length
  ];
}
