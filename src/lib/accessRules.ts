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
    isAlumni: tickets.some(
      (t) => t.status === "active" || t.status === "used",
    ),
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
