/**
 * Cache local de la boleta para el MODO OFFLINE (cliente).
 *
 * Al abrir la app con conexión, guardamos aquí el paquete de la boleta
 * (incluida la semilla TOTP). Si luego el dispositivo pierde internet, el QR
 * se sigue generando desde estos datos con la hora del sistema (ver totp.ts).
 *
 * Se usa localStorage (permitido por el spec de la Fase 3): es síncrono,
 * persiste sin red y basta para un dato tan pequeño. Se limpia al cerrar sesión.
 */

const STORAGE_KEY = "efx.tickets.v1";

export type CachedTicket = {
  id: string;
  secret: string; // semilla TOTP (base32)
  step: number; // segundos por rotación
  digits: number; // longitud del código
  tierSlug: string; // 'general' | 'vip' | 'black'
  tierLabel: string; // "VIP", "General"...
  holder: string;
  edition: number;
  status: "active" | "used" | "cancelled";
  cachedAt: number;
};

function read(): CachedTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CachedTicket[]) : [];
  } catch {
    return [];
  }
}

function write(list: CachedTicket[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando online.
  }
}

/** Guarda/actualiza el paquete de boletas descargado con conexión. */
export function cacheTickets(tickets: CachedTicket[]) {
  const stamped = tickets.map((t) => ({ ...t, cachedAt: Date.now() }));
  write(stamped);
}

/** Lee las boletas cacheadas (para funcionar sin red). */
export function loadCachedTickets(): CachedTicket[] {
  return read();
}

/** Borra el cache (al cerrar sesión). */
export function clearCachedTickets() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
