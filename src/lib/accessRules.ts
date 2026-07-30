/**
 * Reglas PURAS del modelo de acceso por anillos (Master Prompt §5).
 * Sin Supabase ni Next: getAccess() (access.ts) las consume en el server,
 * y los tests las verifican directo (src/lib/__tests__/accessRules.test.ts).
 *
 * | Anillo   | Quién                                  | Módulos                        |
 * |----------|----------------------------------------|--------------------------------|
 * | open     | cualquier registrado                   | Comunidad, Credencial (F14)    |
 * | alumni   | boleta válida en CUALQUIER edición     | Academia (de por vida)         |
 * | ticket   | boleta activa de la edición en curso   | Agenda, Mapa, Stands, etc.     |
 *
 * Admin siempre pasa.
 */

export type Ring = "open" | "alumni" | "ticket";

export type TicketLike = {
  edition: number;
  status: string; // 'active' | 'used' | 'cancelled'
};

export type RingAccess = {
  /** Boleta activa de la edición en curso. */
  hasCurrentTicket: boolean;
  /** Tuvo boleta válida (activa o usada) en cualquier edición. */
  isAlumni: boolean;
};

/** Resuelve los anillos a partir de las boletas del usuario. */
export function resolveTicketAccess(
  tickets: TicketLike[],
  currentEdition: number,
): RingAccess {
  return {
    hasCurrentTicket: tickets.some(
      (t) => t.edition === currentEdition && t.status === "active",
    ),
    isAlumni: tickets.some((t) => t.status === "active" || t.status === "used"),
  };
}

/** ¿Este usuario puede entrar a un módulo del anillo dado? */
export function canAccessRing(
  ring: Ring,
  access: RingAccess & { isAdmin: boolean },
): boolean {
  if (access.isAdmin) return true;
  switch (ring) {
    case "open":
      return true;
    case "alumni":
      return access.isAlumni;
    case "ticket":
      return access.hasCurrentTicket;
  }
}

// ---------------------------------------------------------------------------
// Fase 28 — Tier de boleta y roles derivados.
// ---------------------------------------------------------------------------

/** Slugs de `ticket_types` (general F3, corporativa F23, diaria F12). */
export type TicketTier = "general" | "vip" | "black" | "diaria" | "corporativa";

/** De mayor a menor privilegio: define cuál tier "gana" con varias boletas. */
const TIER_PRIORITY: TicketTier[] = [
  "black",
  "vip",
  "corporativa",
  "general",
  "diaria",
];

export type TypedTicketLike = TicketLike & { ticket_type?: string | null };

/**
 * Mejor tier entre las boletas ACTIVAS de la edición en curso.
 * Un slug desconocido se ignora: conserva el anillo `ticket`
 * (resolveTicketAccess no mira el tipo) pero no otorga tier.
 */
export function resolveTicketTier(
  tickets: TypedTicketLike[],
  currentEdition: number,
): TicketTier | null {
  const owned = new Set(
    tickets
      .filter((t) => t.edition === currentEdition && t.status === "active")
      .map((t) => (t.ticket_type ?? "").toLowerCase()),
  );
  return TIER_PRIORITY.find((tier) => owned.has(tier)) ?? null;
}

/**
 * Membresías contextuales del usuario (un usuario puede tener varias a la
 * vez: p.ej. boleta Black + staff de un stand). Las llena getAccess().
 */
export type RoleMemberships = {
  /** Stands donde es staff de expositor (`stand_staff`). */
  standIds: string[];
  /** Fichas de ponente vinculadas a su cuenta (`speakers.user_id`). */
  speakerIds: string[];
  /** Patrocinadores donde es staff (`sponsor_staff`). */
  sponsorIds: string[];
  /** Rol en el equipo interno (`team_members.role`) o null. */
  staffRole: string | null;
};

export type UserRoles = RoleMemberships & {
  isExhibitor: boolean;
  isSpeaker: boolean;
  isSponsor: boolean;
  isStaff: boolean;
};

export const EMPTY_ROLES: UserRoles = {
  standIds: [],
  speakerIds: [],
  sponsorIds: [],
  staffRole: null,
  isExhibitor: false,
  isSpeaker: false,
  isSponsor: false,
  isStaff: false,
};

/** Deriva los flags de rol a partir de las membresías. */
export function resolveRoles(m: RoleMemberships): UserRoles {
  return {
    ...m,
    isExhibitor: m.standIds.length > 0,
    isSpeaker: m.speakerIds.length > 0,
    isSponsor: m.sponsorIds.length > 0,
    isStaff: m.staffRole !== null,
  };
}
