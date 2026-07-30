import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Guardia de las server actions del equipo interno (Fase 28).
 *
 * Igual que assertAdmin() pero acepta también a los miembros de
 * `team_members`. Devuelve el cliente service-role y el rol del
 * miembro ('admin' para administradores). Lanza Error si no cumple.
 */
export async function assertStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profile?.is_admin) return { admin: createAdminClient(), role: "admin" };
  if (member?.role) return { admin: createAdminClient(), role: member.role };
  throw new Error("No autorizado (requiere equipo Effix)");
}
