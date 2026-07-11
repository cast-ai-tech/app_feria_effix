"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Verifica que quien llama es admin; devuelve el cliente service-role. */
async function assertAdmin() {
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

type Result = { ok: boolean; error?: string };

function readStand(formData: FormData) {
  const edition = parseInt((formData.get("edition") as string) || "2026", 10);
  return {
    name: ((formData.get("name") as string) || "").trim(),
    category: ((formData.get("category") as string) || "").trim() || null,
    stand_number: ((formData.get("stand_number") as string) || "").trim() || null,
    description: ((formData.get("description") as string) || "").trim() || null,
    edition: Number.isNaN(edition) ? 2026 : edition,
  };
}

function revalidate() {
  revalidatePath("/admin/stands");
  revalidatePath("/stands");
}

export async function createStand(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const fields = readStand(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await admin.from("stands").insert(fields);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateStand(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const fields = readStand(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await admin.from("stands").update(fields).eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteStand(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("stands").delete().eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Aceptar / rechazar una solicitud de cita. */
export async function setMeetingStatus(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const status = (formData.get("status") as string) || "";
  if (!id || !["accepted", "declined"].includes(status))
    return { ok: false, error: "Datos inválidos." };
  const { error } = await admin
    .from("stand_meetings")
    .update({ status })
    .eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}
