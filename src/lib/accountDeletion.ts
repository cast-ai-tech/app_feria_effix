"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Borrado de cuenta a solicitud del propio usuario (política de Google Play
 * exigida desde 2023: toda app con registro debe ofrecer autoservicio de
 * borrado). Un solo `auth.admin.deleteUser` basta: TODAS las FK del schema
 * hacia auth.users/profiles ya están definidas como `on delete cascade`
 * (datos personales: perfil, conexiones, agenda, progreso de academia,
 * respuestas de encuestas, sellos de pasaporte, staff de stand/patrocinio…)
 * o `on delete set null` (registros de negocio que deben sobrevivir
 * anonimizados: boletas, transferencias, ficha de ponente, autoría de
 * banners) — verificado migración por migración antes de escribir esto.
 *
 * Bloquea el autoborrado de cuentas admin para no dejar la organización
 * sin acceso al panel por accidente; un admin debe quitarse el flag
 * `is_admin` (u ordenar el borrado a otro admin) antes de poder usarlo.
 */
export async function deleteOwnAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin) {
    return {
      error:
        "Las cuentas de administrador no se pueden autoborrar. Quita el rol de admin primero o pide a otro admin que la elimine.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
