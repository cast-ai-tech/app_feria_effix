/**
 * Adaptador de compartir — capa de plataforma.
 * Web: Web Share API con fallback a copiar al portapapeles.
 * Fase 22: se sustituye por @capacitor/share.
 */

export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export type ShareOutcome = "shared" | "copied" | "unsupported";

/**
 * Comparte el contenido con la hoja nativa si existe; si no, copia el
 * texto/URL al portapapeles. Devuelve qué ocurrió para que la UI informe
 * ("¡Copiado!" vs nada).
 */
export async function share(payload: SharePayload): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return "unsupported";

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch {
      // Usuario canceló la hoja de compartir → no forzar el fallback.
      return "unsupported";
    }
  }

  const text = [payload.text, payload.url].filter(Boolean).join("\n");
  if (text && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      /* sigue al unsupported */
    }
  }
  return "unsupported";
}
