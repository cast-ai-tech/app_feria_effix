/**
 * Cola OFFLINE del MODO STAND (Fase 15): escaneos de credenciales de
 * asistentes hechos por el staff sin señal. Mismo patrón que connectQueue.
 */

import { storage } from "@/lib/platform/storage";

const QUEUE_KEY = "efx.stand_scan_queue.v1";

export type QueuedStandScan = {
  standId: string;
  code: string;
  scannedAt: number;
};

async function readQueue(): Promise<QueuedStandScan[]> {
  const raw = await storage.get(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedStandScan[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedStandScan[]): Promise<void> {
  await storage.set(QUEUE_KEY, JSON.stringify(queue));
}

/** Encola un escaneo (sin duplicar el par stand+código). */
export async function enqueueStandScan(
  standId: string,
  code: string,
): Promise<void> {
  const queue = await readQueue();
  if (queue.some((q) => q.standId === standId && q.code === code)) return;
  queue.push({ standId, code, scannedAt: Date.now() });
  await writeQueue(queue);
}

export async function pendingStandScans(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Sincroniza la cola. `send` que RESUELVE saca el ítem (llegó al server,
 * aunque el resultado sea 'not_found'); `send` que LANZA corta el flush.
 */
export async function flushStandScans(
  send: (standId: string, code: string) => Promise<unknown>,
): Promise<number> {
  const queue = await readQueue();
  let synced = 0;
  for (const item of queue) {
    try {
      await send(item.standId, item.code);
      synced++;
    } catch {
      break;
    }
  }
  if (synced > 0) await writeQueue(queue.slice(synced));
  return synced;
}
