/**
 * Lógica PURA del progreso de reproducción de Academia (Fase 27).
 * Separada de `MiniPlayerHost` (efectos: setInterval, upsert a Supabase)
 * para poder testearla sin DOM ni red.
 */

/** ¿Ya pasó suficiente tiempo desde el último guardado para volver a escribir? */
export function shouldPersistTick(
  lastPersistedAtMs: number,
  nowMs: number,
  minIntervalMs = 5000,
): boolean {
  return nowMs - lastPersistedAtMs >= minIntervalMs;
}

/** Se considera "vista" al superar el umbral (90% por defecto). */
export function resolveCompleted(
  currentSeconds: number,
  durationSeconds: number,
  threshold = 0.9,
): boolean {
  if (durationSeconds <= 0) return false;
  return currentSeconds / durationSeconds >= threshold;
}

/** Recorta segundos negativos o que se pasan de la duración conocida. */
export function clampSeconds(seconds: number, durationSeconds: number): number {
  if (seconds < 0) return 0;
  if (durationSeconds > 0 && seconds > durationSeconds) return durationSeconds;
  return seconds;
}

export type WatchProgressPayload = {
  user_id: string;
  recording_id: string;
  seconds: number;
  duration_seconds: number;
  completed: boolean;
};

/** Fila lista para upsert (onConflict: "user_id,recording_id"). */
export function buildWatchProgressPayload({
  userId,
  recordingId,
  seconds,
  durationSeconds,
  completed,
}: {
  userId: string;
  recordingId: string;
  seconds: number;
  durationSeconds: number;
  completed?: boolean;
}): WatchProgressPayload {
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const safeSeconds = clampSeconds(Math.floor(seconds), safeDuration);
  return {
    user_id: userId,
    recording_id: recordingId,
    seconds: safeSeconds,
    duration_seconds: safeDuration,
    completed: completed ?? resolveCompleted(safeSeconds, safeDuration),
  };
}

/** "65" → "1:05", "3661" → "1:01:01". */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
