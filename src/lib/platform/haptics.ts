/**
 * Adaptador de vibración/háptica — capa de plataforma.
 * Web: navigator.vibrate (no-op donde no exista, p. ej. iOS Safari).
 * Fase 22: se sustituye por @capacitor/haptics.
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* no-op */
  }
}

/** Confirmación corta (p. ej. escaneo exitoso, sello registrado). */
export function hapticSuccess(): void {
  vibrate(60);
}

/** Rechazo/error (patrón doble, distinguible sin mirar la pantalla). */
export function hapticError(): void {
  vibrate([80, 60, 80]);
}

/** Toque sutil de UI. */
export function hapticTap(): void {
  vibrate(15);
}
