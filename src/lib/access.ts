import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FALLBACK_EDITION, type EditionInfo } from "@/lib/editions";
import { resolveTicketAccess } from "@/lib/accessRules";

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

  // Admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  base.isAdmin = !!profile?.is_admin;

  // Boletas del usuario (RLS: solo ve las suyas). Si la tabla aún no existe
  // (migración de Fase 3 no ejecutada), `data` viene null y quedamos sin acceso.
  const { data: tickets } = await supabase
    .from("tickets")
    .select("edition,status")
    .eq("user_id", user.id);

  const rings = resolveTicketAccess(tickets ?? [], base.currentEdition);
  base.hasCurrentTicket = rings.hasCurrentTicket;
  base.isAlumni = rings.isAlumni;

  return base;
}
