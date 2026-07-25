"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { FALLBACK_EDITION } from "@/lib/editions";

/**
 * Admin de Academia 2.0 (Fase 20): pipeline de publicación
 * (borrador → revision → publicada), teaser gratuito y colecciones.
 * `recordings.approved` es una columna derivada del status (trigger en BD);
 * aquí solo se escribe `status`.
 */

const STATUSES = ["borrador", "revision", "publicada"] as const;
type RecordingStatus = (typeof STATUSES)[number];

/**
 * Valida la edición contra la tabla `editions` (nada hardcodeado).
 * Si el año no existe, cae a la edición activa.
 */
async function resolveEdition(
  admin: ReturnType<typeof createAdminClient>,
  raw: number,
): Promise<number> {
  const { data } = await admin
    .from("editions")
    .select("year,is_active")
    .order("year", { ascending: false });
  const list = data ?? [];
  if (list.some((e) => e.year === raw)) return raw;
  return list.find((e) => e.is_active)?.year ?? FALLBACK_EDITION.year;
}

/** Extrae y valida los campos de una grabación desde el FormData. */
async function readFields(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData,
) {
  const title = ((formData.get("title") as string) || "").trim();
  const speaker_name = ((formData.get("speaker_name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const video_url = ((formData.get("video_url") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  const rawStatus = (formData.get("status") as string) || "borrador";
  const is_free = formData.get("is_free") === "on";
  return {
    title,
    speaker_name: speaker_name || null,
    description: description || null,
    video_url: video_url || null,
    edition: await resolveEdition(admin, edition),
    status: (STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as RecordingStatus)
      : "borrador",
    is_free,
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
  const fields = await readFields(admin, formData);
  if (!fields.title) return { ok: false, error: "El título es obligatorio." };

  const { error } = await admin.from("recordings").insert(fields);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar una grabación existente (metadata completa).
// ---------------------------------------------------------------------------
export async function updateRecording(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la grabación." };
  const fields = await readFields(admin, formData);
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
// Pipeline: mover una grabación de estado.
// ---------------------------------------------------------------------------
export async function setRecordingStatus(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "";
  if (!id) return { ok: false, error: "Falta el id de la grabación." };
  if (!(STATUSES as readonly string[]).includes(status))
    return { ok: false, error: "Estado inválido." };

  const { error } = await admin
    .from("recordings")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Teaser gratuito: marcar/desmarcar una charla como abierta al anillo gratis.
// ---------------------------------------------------------------------------
export async function toggleFree(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  const is_free = formData.get("is_free") === "true";
  if (!id) return { ok: false, error: "Falta el id de la grabación." };

  const { error } = await admin
    .from("recordings")
    .update({ is_free })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Eliminar una grabación (borra en cascada ratings, progreso e items).
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

// ---------------------------------------------------------------------------
// Colecciones curadas.
// ---------------------------------------------------------------------------
export async function createCollection(formData: FormData) {
  const admin = await assertAdmin();
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const editionRaw = ((formData.get("edition") as string) || "").trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  let edition: number | null = null;
  if (editionRaw) {
    edition = await resolveEdition(admin, parseInt(editionRaw, 10));
  }

  const { error } = await admin.from("collections").insert({
    name,
    description: description || null,
    edition,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteCollection(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la colección." };

  const { error } = await admin.from("collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function addCollectionItem(formData: FormData) {
  const admin = await assertAdmin();
  const collection_id = formData.get("collection_id") as string;
  const recording_id = formData.get("recording_id") as string;
  if (!collection_id || !recording_id)
    return { ok: false, error: "Faltan la colección o la grabación." };

  const { error } = await admin
    .from("collection_items")
    .upsert(
      { collection_id, recording_id },
      { onConflict: "collection_id,recording_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function removeCollectionItem(formData: FormData) {
  const admin = await assertAdmin();
  const collection_id = formData.get("collection_id") as string;
  const recording_id = formData.get("recording_id") as string;
  if (!collection_id || !recording_id)
    return { ok: false, error: "Faltan la colección o la grabación." };

  const { error } = await admin
    .from("collection_items")
    .delete()
    .eq("collection_id", collection_id)
    .eq("recording_id", recording_id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
