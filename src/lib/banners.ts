/**
 * Sistema de banners de patrocinio (Fase 24) — lógica PURA testeable.
 * El fetch/registro vive en <BannerSlot/>; aquí las reglas.
 */

export type BannerRow = {
  id: string;
  placement: string;
  module_key: string | null;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

/**
 * Banners que deben MOSTRARSE ahora: activos y dentro de su ventana
 * (starts_at/ends_at opcionales), ordenados por sort_order.
 */
export function filterLiveBanners(
  rows: BannerRow[],
  nowMs: number,
): BannerRow[] {
  return rows
    .filter((b) => {
      if (!b.active) return false;
      if (b.starts_at && nowMs < new Date(b.starts_at).getTime()) return false;
      if (b.ends_at && nowMs > new Date(b.ends_at).getTime()) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Impresiones: máximo UNA por banner por sesión de la app.
 * `seen` es el registro de la sesión (Set en memoria del cliente).
 * Devuelve true si hay que registrar (y marca el banner como visto).
 */
export function shouldRecordImpression(
  seen: Set<string>,
  bannerId: string,
): boolean {
  if (seen.has(bannerId)) return false;
  seen.add(bannerId);
  return true;
}

/**
 * Splash de patrocinio: UNA vez por sesión de la app.
 * Flag en memoria del módulo (vive lo que vive la SPA) — testeable vía
 * el par shouldShowSplash/markSplashShown + resetSplashForTests.
 */
let splashShown = false;

export function shouldShowSplash(): boolean {
  return !splashShown;
}

export function markSplashShown(): void {
  splashShown = true;
}

/** Solo para tests. */
export function resetSplashForTests(): void {
  splashShown = false;
}

/** CTR con divisor seguro (para la tabla de métricas del admin). */
export function ctr(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}
