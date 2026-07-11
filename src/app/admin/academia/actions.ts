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

const ALLOWED_EDITIONS = [2024, 2025, 2026];

/** Extrae y valida los campos de una grabación desde el FormData. */
function readFields(formData: FormData) {
  const title = ((formData.get("title") as string) || "").trim();
  const speaker_name = ((formData.get("speaker_name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const video_url = ((formData.get("video_url") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "2026", 10);
  const approved = formData.get("approved") === "on";
  return {
    title,
    speaker_name: speaker_name || null,
    description: description || null,
    video_url: video_url || null,
    edition: ALLOWED_EDITIONS.includes(edition) ? edition : 2026,
    approved,
  };
}

function revalidate() {
  revalidatePath("/admin/academia");
  revalidatePath("/academia");
}

// ---------------------------------------------------------------------------
// Crear una grabación.
// ---------------------------------------------------------------------------
export async function createRecording(formData: FormData) {
  const admin = await assertAdmin();
  const fields = readFields(formData);
  if (!fields.title) return { ok: false, error: "El título es obligatorio." };

  const { error } = await admin.from("recordings").insert(fields);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar una grabación existente.
// ---------------------------------------------------------------------------
export async function updateRecording(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la grabación." };
  const fields = readFields(formData);
  if (!fields.title) return { ok: false, error: "El título es obligatorio." };

  const { error } = await admin
    .from("recordings")
    .update(fields)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Alternar la bandera "aprobado para Academia".
// ---------------------------------------------------------------------------
export async function toggleApproved(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  const approved = formData.get("approved") === "true";
  if (!id) return { ok: false, error: "Falta el id de la grabación." };

  const { error } = await admin
    .from("recordings")
    .update({ approved })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Eliminar una grabación (borra en cascada sus calificaciones).
// ---------------------------------------------------------------------------
export async function deleteRecording(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la grabación." };

  const { error } = await admin.from("recordings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
