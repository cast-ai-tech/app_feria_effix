/**
 * Ediciones del evento — helpers PUROS (seguros para server y client).
 *
 * La fuente de verdad es la tabla `editions` (Fase 12): una fila por año,
 * una sola activa. El día 1 de la edición = starts_on; el día N =
 * starts_on + (N-1). Nada de fechas hardcodeadas fuera de este modelo.
 *
 * La lectura desde Supabase vive en getAccess() (src/lib/access.ts), que
 * expone la edición activa como `access.edition`.
 */

export type EditionInfo = {
  year: number;
  name: string;
  /** Primer día del evento (YYYY-MM-DD). */
  startsOn: string;
  /** Último día del evento (YYYY-MM-DD). */
  endsOn: string;
  /** Número de días de la edición. */
  days: number;
};

/**
 * Respaldo cuando la tabla `editions` aún no existe o no responde
 * (p. ej. migración de Fase 12 sin ejecutar). Mantener alineado con el
 * seed de supabase/phase12_estabilizacion.sql.
 */
export const FALLBACK_EDITION: EditionInfo = {
  year: 2026,
  name: "Feria Effix 2026",
  startsOn: "2026-10-15",
  endsOn: "2026-10-19",
  days: 5,
};

const TZ_UTC = { timeZone: "UTC" } as const;

/** Date estable (mediodía UTC) para operar sin corrimientos de zona. */
function atNoonUtc(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

/** Fecha calendario (YYYY-MM-DD) del día N de la edición. */
export function editionDayDate(edition: EditionInfo, day: number): string {
  const d = atNoonUtc(edition.startsOn);
  d.setUTCDate(d.getUTCDate() + (day - 1));
  return d.toISOString().slice(0, 10);
}

/** Etiqueta corta del día N, p. ej. "15 oct". */
export function editionDayLabel(edition: EditionInfo, day: number): string {
  const d = atNoonUtc(editionDayDate(edition, day));
  return d
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", ...TZ_UTC })
    .replace(".", "");
}

/** Lista [1..days] para chips/selects de día. */
export function editionDays(edition: EditionInfo): number[] {
  return Array.from({ length: edition.days }, (_, i) => i + 1);
}

/** Rango legible, p. ej. "15–19 de octubre de 2026". */
export function formatEditionRange(edition: EditionInfo): string {
  const start = atNoonUtc(edition.startsOn);
  const end = atNoonUtc(edition.endsOn);
  const month = end.toLocaleDateString("es-CO", { month: "long", ...TZ_UTC });
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    return `${start.getUTCDate()}–${end.getUTCDate()} de ${month} de ${end.getUTCFullYear()}`;
  }
  const startMonth = start.toLocaleDateString("es-CO", {
    month: "short",
    ...TZ_UTC,
  });
  return `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${month} ${end.getUTCFullYear()}`;
}
