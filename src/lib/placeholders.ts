/**
 * Detección de placeholders del seed que NO deben llegar a producción
 * (Fase 12, hallazgos #20–22). El panel admin los marca con badge
 * "placeholder" hasta que se reemplacen por los valores reales.
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("example.com") ||
    url.includes("dQw4w9WgXcQ") ||
    url.includes("wa.me/573000000000")
  );
}
