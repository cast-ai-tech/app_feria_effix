import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FALLBACK_EDITION, type EditionInfo } from "@/lib/editions";
import {
  EMPTY_ROLES,
  resolveRoles,
  resolveTicketAccess,
  resolveTicketTier,
  type TicketTier,
  type UserRoles,
} from "@/lib/accessRules";

/**
 * Control de acceso por módulo — Modelo de acceso del Master Prompt (§5).
 *
 * | Módulo                | Requiere boleta vigente | Alumni (de por vida) | Abierto |
 * |-----------------------|:----------------------:|:--------------------:|:-------:|
 * | Tickets / Agenda /    |                        |                      |         |
 * |  Mapa / Stands /      |          Sí            |          —           |   No    |
 * |  Ponentes / Alianzas  |                        |                      |         |
 * | Academia              |          —             |          Sí          |   No    |
 * | Comunidad             |          —             |          —           |   Sí    |
 *
 * Admin siempre pasa (para poder revisar cualquier módulo).
 */
export type AccessInfo = {
  /** Supabase configurado (si no, la app funciona en modo "vitrina"). */
  configured: boolean;
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  /** Tuvo alguna boleta válida (activa o usada) en CUALQUIER edición. */
  isAlumni: boolean;
  /** Tiene boleta activa de la edición en curso. */
  hasCurrentTicket: boolean;
  /** Año de la edición activa (= edition.year). */
  currentEdition: number;
  /** Edición activa completa (fechas y días) desde la tabla `editions`. */
  edition: EditionInfo;
  /**
   * Mejor tier de boleta ACTIVA de la edición en curso (Fase 28).
   * null = sin boleta vigente (o slug desconocido).
   */
  ticketTier: TicketTier | null;
  /** Roles derivados: expositor, ponente, patrocinador, equipo (Fase 28). */
  roles: UserRoles;
};

export async function getAccess(): Promise<AccessInfo> {
  const base: AccessInfo = {
    configured: false,
    user: null,
    isAdmin: false,
    isAlumni: false,
    hasCurrentTicket: false,
    currentEdition: FALLBACK_EDITION.year,
    edition: FALLBACK_EDITION,
    ticketTier: null,
    roles: EMPTY_ROLES,
  };

  if (!isSupabaseConfigured()) return base;
  base.configured = true;

  const supabase = await createClient();

  // Edición activa (tabla `editions`, Fase 12). Si la migración aún no se
  // ejecutó, seguimos con el respaldo para no romper la app.
  const { data: ed } = await supabase
    .from("editions")
    .select("year,name,starts_on,ends_on,days")
    .eq("is_active", true)
    .maybeSingle();
  if (ed) {
    base.edition = {
      year: ed.year,
      name: ed.name,
      startsOn: ed.starts_on,
      endsOn: ed.ends_on,
      days: ed.days,
    };
    base.currentEdition = ed.year;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return base;
  base.user = { id: user.id, email: user.email ?? "" };

  // Permisos y membresías en paralelo (Fase 28). RLS limita cada consulta a
  // las filas del propio usuario; si alguna tabla aún no existe (migración
  // pendiente), su `data` viene null y ese rol simplemente queda vacío.
  const [
    { data: profile },
    { data: tickets },
    { data: standRows },
    { data: speakerRows },
    { data: sponsorRows },
    { data: teamRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("tickets")
      .select("edition,status,ticket_type")
      .eq("user_id", user.id),
    supabase.from("stand_staff").select("stand_id").eq("user_id", user.id),
    supabase.from("speakers").select("id").eq("user_id", user.id),
    supabase.from("sponsor_staff").select("sponsor_id").eq("user_id", user.id),
    supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  base.isAdmin = !!profile?.is_admin;

  const rings = resolveTicketAccess(tickets ?? [], base.currentEdition);
  base.hasCurrentTicket = rings.hasCurrentTicket;
  base.isAlumni = rings.isAlumni;
  base.ticketTier = resolveTicketTier(tickets ?? [], base.currentEdition);

  base.roles = resolveRoles({
    standIds: (standRows ?? []).map((r) => r.stand_id),
    speakerIds: (speakerRows ?? []).map((r) => r.id),
    sponsorIds: (sponsorRows ?? []).map((r) => r.sponsor_id),
    staffRole: teamRow?.role ?? null,
  });

  return base;
}
