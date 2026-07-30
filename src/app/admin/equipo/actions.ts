"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";

type Result = { ok: boolean; error?: string };

const TEAM_ROLES = ["staff", "logistica", "comercial", "acreditacion"];

function revalidate() {
  revalidatePath("/admin/equipo");
  revalidatePath("/staff");
}

/**
 * Agregar a alguien al equipo interno por correo — mismo patrón de
 * addStandStaff: busca en profiles.ticket_email. team_members.user_id es
 * la primary key, así que un upsert simplemente actualiza el rol si la
 * persona ya estaba en el equipo.
 */
export async function addTeamMember(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  const role = ((formData.get("role") as string) || "staff").trim();
  if (!email) return { ok: false, error: "El correo es obligatorio." };
  if (!TEAM_ROLES.includes(role)) return { ok: false, error: "Rol inválido." };

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("ticket_email", email)
    .maybeSingle();
  if (!profile)
    return {
      ok: false,
      error: `No hay ningún usuario registrado con el correo ${email}. La persona debe registrarse primero en la app.`,
    };

  const { error } = await admin
    .from("team_members")
    .upsert({ user_id: profile.id, role }, { onConflict: "user_id" });

  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setTeamRole(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const userId = (formData.get("user_id") as string) || "";
  const role = ((formData.get("role") as string) || "").trim();
  if (!userId) return { ok: false, error: "Falta el usuario." };
  if (!TEAM_ROLES.includes(role)) return { ok: false, error: "Rol inválido." };
  const { error } = await admin
    .from("team_members")
    .update({ role })
    .eq("user_id", userId);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeTeamMember(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const userId = (formData.get("user_id") as string) || "";
  if (!userId) return { ok: false, error: "Falta el usuario." };
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("user_id", userId);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}
