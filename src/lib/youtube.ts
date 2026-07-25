/**
 * Helpers PUROS de YouTube (Academia embebida) — testeables.
 * Acepta watch?v=, youtu.be/, shorts/, embed/ y live/.
 */

const ID_RX = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (ID_RX.test(raw)) return raw; // ya es un ID pelado

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return ID_RX.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && ID_RX.test(v)) return v;
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

/** Embed sin cookies hasta reproducir + autoplay al abrir el player. */
export function youtubeEmbedUrl(id: string, autoplay = true): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}`;
}

/**
 * Embed de FONDO (hero del Home): autoplay silenciado en loop y SIN
 * controles ni teclado — se comporta como un video decorativo, no un player.
 */
export function youtubeBackgroundEmbedUrl(id: string): string {
  return (
    `https://www.youtube-nocookie.com/embed/${id}` +
    `?autoplay=1&mute=1&loop=1&playlist=${id}` +
    `&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3`
  );
}

/** Miniatura oficial (hq = 480x360, siempre existe). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
