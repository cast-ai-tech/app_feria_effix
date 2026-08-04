/**
 * Generación PURA de calendarios iCalendar/.ics (Fase 30) — testeable.
 * La sirve /api/calendar/[token] como feed suscribible: el calendario del
 * teléfono (iOS, Google Calendar, Outlook) lo refresca solo, así que las
 * charlas guardadas en Mi Agenda aparecen y se actualizan sin hacer nada.
 */

export type IcsEvent = {
  /** Identificador estable (talkId) — permite que el calendario actualice
   * el evento en vez de duplicarlo cuando cambia hora/sala. */
  uid: string;
  title: string;
  /** ISO timestamptz de inicio/fin (fin opcional: default +1h). */
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
};

/** Escapa texto según RFC 5545 (comas, puntos y comas, saltos de línea). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** ISO → formato ICS en UTC (YYYYMMDDTHHMMSSZ). */
export function formatIcsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Pliega líneas a máx. 75 octetos (RFC 5545): las líneas de continuación
 * empiezan con un espacio. Simplificación: corta por caracteres (suficiente
 * para es-CO; los lectores toleran sobra de margen).
 */
function foldLine(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return parts.join("\r\n");
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Construye el archivo .ics completo. `calendarName` es el nombre con el
 * que aparece la suscripción en el teléfono.
 */
export function buildCalendar(
  calendarName: string,
  events: IcsEvent[],
  nowIso: string,
): string {
  const dtstamp = formatIcsDate(nowIso);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Feria Effix//App//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    // Sugerencia de refresco para los clientes que la respetan.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const ev of events) {
    const end =
      ev.endsAt ??
      new Date(new Date(ev.startsAt).getTime() + HOUR_MS).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}@feriaeffix.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsDate(ev.startsAt)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(ev.title)}`,
    );
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description)
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
