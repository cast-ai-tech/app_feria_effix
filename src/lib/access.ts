import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
  currentEdition: number;
};

export async function getAccess(): Promise<AccessInfo> {
  const base: AccessInfo = {
    configured: false,
    user: null,
    isAdmin: false,
    isAlumni: false,
    hasCurrentTicket: false,
    currentEdition: 2026,
  };

  if (!isSupabaseConfigured()) return base;
  base.configured = true;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return base;
  base.user = { id: user.id, email: user.email ?? "" };

  // Edición en curso (configurable desde app_config).
  const { data: cfg } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "current_edition")
    .maybeSingle();
  base.currentEdition = cfg?.value ? parseInt(cfg.value, 10) || 2026 : 2026;

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

  const list = tickets ?? [];
  base.hasCurrentTicket = list.some(
    (t) => t.edition === base.currentEdition && t.status === "active",
  );
  base.isAlumni = list.some(
    (t) => t.status === "active" || t.status === "used",
  );

  return base;
}
