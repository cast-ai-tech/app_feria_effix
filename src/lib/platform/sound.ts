/**
 * Adaptador de sonido — capa de plataforma.
 * Web: HTMLAudioElement. Si el navegador bloquea el autoplay con sonido
 * (falta gesto de usuario), falla en silencio — la app sigue funcionando
 * igual, solo sin el efecto.
 * Fase 22: candidato a sustituir por un plugin nativo si hace falta.
 */

/** Devuelve una función para detener el sonido antes de que termine solo. */
export function playSound(src: string, volume = 1): () => void {
  if (typeof window === "undefined" || typeof Audio === "undefined")
    return () => {};
  try {
    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0, volume));
    void audio.play().catch(() => {
      /* Autoplay bloqueado sin gesto de usuario — no-op. */
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  } catch {
    return () => {};
  }
}
