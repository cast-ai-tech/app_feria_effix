/**
 * Reglas PURAS de las alarmas locales de charla (Fase 30) — testeables.
 * Lógica de "cuándo debe sonar" y "qué ID numérico usar", separada del I/O
 * de @capacitor/local-notifications (que vive en src/lib/platform/notifications.ts).
 */

/**
 * Momento (epoch ms) en el que debe dispararse el recordatorio, o null si
 * ya pasó (mismo criterio que usa src/app/api/cron/reminders/route.ts: no
 * tiene sentido programar una alarma en el pasado).
 */
export function computeReminderFireTime(
  startsAtIso: string,
  leadMinutes: number,
): number | null {
  const fireAt = new Date(startsAtIso).getTime() - leadMinutes * 60_000;
  return fireAt > Date.now() ? fireAt : null;
}

/**
 * Hash determinista string → entero de 31 bits (FNV-1a). Local Notifications
 * exige IDs numéricos; el determinismo permite cancelar una alarma por
 * talkId sin tener que guardar un mapeo aparte en ningún lado.
 */
export function talkReminderId(talkId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < talkId.length; i++) {
    hash ^= talkId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash & 0x7fffffff;
}
