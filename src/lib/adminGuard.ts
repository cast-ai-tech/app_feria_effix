import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Guardia de las server actions del panel admin (Fase 12 — antes estaba
 * duplicada literal en los 6 archivos de actions).
 *
 * Verifica que quien llama tiene sesión y es admin; devuelve el cliente
 * service-role para operar saltando RLS. Lanza Error si no cumple.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) throw new Error("No autorizado (requiere admin)");
  return createAdminClient();
}
