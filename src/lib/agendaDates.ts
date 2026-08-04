/**
 * Fechas de Mi Agenda (Fase 30) — helpers PUROS y testeables.
 * Mi Agenda combina charlas del evento y citas personales que pueden caer
 * en CUALQUIER fecha (post-evento incluido), así que se navega por fechas
 * reales del calendario, no por "día 1..N" de la edición.
 */

const TZ = "America/Bogota";

/** Fecha local del evento (YYYY-MM-DD en Medellín) de un timestamptz. */
export function bogotaDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Etiqueta corta del chip de fecha: "mié 15 oct". */
export function dateChipLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00Z`)
    .toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .replace(/\./g, "");
}

/**
 * Fecha inicial a mostrar: hoy si tiene items; si no, la próxima con
 * items; si todas ya pasaron, la última (historial reciente).
 */
export function defaultDateKey(
  sortedKeys: string[],
  todayKey: string,
): string | null {
  if (sortedKeys.length === 0) return null;
  if (sortedKeys.includes(todayKey)) return todayKey;
  return (
    sortedKeys.find((k) => k > todayKey) ?? sortedKeys[sortedKeys.length - 1]
  );
}
