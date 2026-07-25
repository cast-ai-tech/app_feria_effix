/**
 * Reglas PURAS del sistema de notificaciones (Fase 16) — testeables.
 * Segmentación de audiencia + límite anti-spam de marketing.
 */

export type AudienceType = "all" | "tier" | "rol";
export type NotificationCategory = "operativa" | "marketing";

export type AudienceTarget = {
  type: AudienceType;
  /** Slug de boleta (tier) o slug de rol; null para 'all'. */
  value: string | null;
};

export type UserSegment = {
  /** Rol del perfil (slug o texto libre). */
  role: string | null;
  /** Tiers de boletas ACTIVAS del usuario en la edición en curso. */
  activeTiers: string[];
  optoutMarketing: boolean;
};

/** ¿La notificación targetea a este usuario? */
export function matchesAudience(
  target: AudienceTarget,
  user: UserSegment,
): boolean {
  switch (target.type) {
    case "all":
      return true;
    case "rol":
      return !!target.value && user.role === target.value;
    case "tier":
      return !!target.value && user.activeTiers.includes(target.value);
  }
}

/** ¿Se le puede ENVIAR push? (marketing respeta el opt-out; operativa siempre). */
export function canPushUser(
  category: NotificationCategory,
  user: UserSegment,
): boolean {
  if (category === "marketing" && user.optoutMarketing) return false;
  return true;
}

/**
 * Límite anti-spam: cuántos envíos de MARKETING quedan hoy.
 * Las operativas no cuentan ni descuentan.
 */
export function marketingRemainingToday(
  sentMarketingToday: number,
  dailyLimit: number,
): number {
  return Math.max(0, dailyLimit - sentMarketingToday);
}

export function canSendCampaign(
  category: NotificationCategory,
  sentMarketingToday: number,
  dailyLimit: number,
): boolean {
  if (category === "operativa") return true;
  return marketingRemainingToday(sentMarketingToday, dailyLimit) > 0;
}
