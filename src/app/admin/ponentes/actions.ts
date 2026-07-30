"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { FALLBACK_EDITION } from "@/lib/editions";

type Result = { ok: boolean; error?: string };

function readSpeaker(formData: FormData) {
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  const startsRaw = ((formData.get("talk_starts_at") as string) || "").trim();
  let talk_starts_at: string | null = null;
  if (startsRaw) {
    const d = new Date(startsRaw);
    if (!isNaN(d.getTime())) talk_starts_at = d.toISOString();
  }
  return {
    full_name: ((formData.get("full_name") as string) || "").trim(),
    role: ((formData.get("role") as string) || "").trim() || null,
    bio: ((formData.get("bio") as string) || "").trim() || null,
    photo_url: ((formData.get("photo_url") as string) || "").trim() || null,
    talk_title: ((formData.get("talk_title") as string) || "").trim() || null,
    talk_starts_at,
    instagram: ((formData.get("instagram") as string) || "").trim() || null,
    linkedin: ((formData.get("linkedin") as string) || "").trim() || null,
    website: ((formData.get("website") as string) || "").trim() || null,
    edition: Number.isNaN(edition) ? FALLBACK_EDITION.year : edition,
  };
}

function revalidate() {
  revalidatePath("/admin/ponentes");
  revalidatePath("/ponentes");
}

export async function createSpeaker(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const fields = readSpeaker(formData);
  if (!fields.full_name)
    return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await admin.from("speakers").insert(fields);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateSpeaker(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const fields = readSpeaker(formData);
  if (!fields.full_name)
    return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await admin.from("speakers").update(fields).eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSpeaker(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("speakers").delete().eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Vincular un ponente a una cuenta por correo (Fase 28) — mismo patrón de
 * búsqueda que addStandStaff: busca en profiles.ticket_email. El unique
 * (user_id, edition) de speakers evita que una cuenta tenga dos fichas en
 * la misma edición.
 */
export async function linkSpeakerUser(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const speakerId = (formData.get("speaker_id") as string) || "";
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  if (!speakerId || !email)
    return { ok: false, error: "Faltan el ponente o el correo." };

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
    .from("speakers")
    .update({ user_id: profile.id })
    .eq("id", speakerId);

  revalidate();
  revalidatePath("/mi-charla");

  if (error) {
    if (error.code === "23505")
      return {
        ok: false,
        error: "Esa cuenta ya está vinculada a otro ponente de esta edición.",
      };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Quitar la vinculación de cuenta de un ponente. */
export async function unlinkSpeakerUser(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const speakerId = (formData.get("speaker_id") as string) || "";
  if (!speakerId) return { ok: false, error: "Falta el ponente." };
  const { error } = await admin
    .from("speakers")
    .update({ user_id: null })
    .eq("id", speakerId);
  revalidate();
  revalidatePath("/mi-charla");
  return error ? { ok: false, error: error.message } : { ok: true };
}
