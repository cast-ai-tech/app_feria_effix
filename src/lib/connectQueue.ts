/**
 * Cola OFFLINE de escaneos de credencial (Fase 14).
 *
 * Dentro del recinto la señal es mala: si el RPC de conexión falla por red,
 * el código escaneado se encola aquí (adaptador de storage) y se sincroniza
 * al volver la conexión. Lógica pura + storage inyectable → testeable.
 */

import { storage } from "@/lib/platform/storage";

const QUEUE_KEY = "efx.connect_queue.v1";

export type QueuedScan = {
  code: string;
  scannedAt: number;
};

async function readQueue(): Promise<QueuedScan[]> {
  const raw = await storage.get(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedScan[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedScan[]): Promise<void> {
  await storage.set(QUEUE_KEY, JSON.stringify(queue));
}

/** Encola un código escaneado sin señal (sin duplicados). */
export async function enqueueScan(code: string): Promise<void> {
  const queue = await readQueue();
  if (queue.some((q) => q.code === code)) return;
  queue.push({ code, scannedAt: Date.now() });
  await writeQueue(queue);
}

/** Cuántos escaneos esperan sincronización. */
export async function pendingScans(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Intenta sincronizar la cola: llama `send` por cada código.
 * - Si `send` resuelve (aunque el resultado sea 'not_found'), el ítem sale
 *   de la cola: ya llegó al servidor.
 * - Si `send` LANZA (sin red), el ítem se conserva y se corta el flush.
 * Devuelve cuántos se sincronizaron.
 */
export async function flushScans(
  send: (code: string) => Promise<unknown>,
): Promise<number> {
  const queue = await readQueue();
  let synced = 0;
  for (const item of queue) {
    try {
      await send(item.code);
      synced++;
    } catch {
      break; // sigue sin red: conservar lo pendiente
    }
  }
  if (synced > 0) {
    await writeQueue(queue.slice(synced));
  }
  return synced;
}
