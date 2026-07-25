/**
 * Cache local de la boleta para el MODO OFFLINE (cliente).
 *
 * Al abrir la app con conexión, guardamos aquí el paquete de la boleta
 * (incluida la semilla TOTP). Si luego el dispositivo pierde internet, el QR
 * se sigue generando desde estos datos con la hora del sistema (ver totp.ts).
 *
 * Fase 13: pasa por el adaptador de plataforma (src/lib/platform/storage.ts)
 * — hoy localStorage; en app nativa será @capacitor/preferences sin tocar
 * este módulo ni la UI. Se limpia al cerrar sesión.
 */

import { storage } from "@/lib/platform/storage";

const STORAGE_KEY = "efx.tickets.v1";

export type CachedTicket = {
  id: string;
  secret: string; // semilla TOTP (base32)
  step: number; // segundos por rotación
  digits: number; // longitud del código
  tierSlug: string; // 'general' | 'vip' | 'black' | 'diaria'
  tierLabel: string; // "VIP", "General"...
  holder: string;
  edition: number;
  status: "active" | "used" | "cancelled";
  cachedAt: number;
};

/** Guarda/actualiza el paquete de boletas descargado con conexión. */
export async function cacheTickets(tickets: CachedTicket[]): Promise<void> {
  const stamped = tickets.map((t) => ({ ...t, cachedAt: Date.now() }));
  await storage.set(STORAGE_KEY, JSON.stringify(stamped));
}

/** Lee las boletas cacheadas (para funcionar sin red). */
export async function loadCachedTickets(): Promise<CachedTicket[]> {
  const raw = await storage.get(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedTicket[];
  } catch {
    return [];
  }
}

/** Borra el cache (al cerrar sesión). */
export async function clearCachedTickets(): Promise<void> {
  await storage.remove(STORAGE_KEY);
}
