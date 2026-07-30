"use server";

import { revalidatePath } from "next/cache";
import { assertSpeakerOwner } from "@/lib/speakerPortal";

type Result = { ok: boolean; error?: string };

const EDITABLE_FIELDS = ["bio", "instagram", "linkedin", "website"] as const;
const QUESTION_STATUSES = ["pending", "approved", "answered", "discarded"];

/** Actualiza los campos editables por el ponente (nunca nombre/charla/horario). */
export async function updateSpeakerProfile(
  formData: FormData,
): Promise<Result> {
  const speakerId = (formData.get("speaker_id") as string) || "";
  if (!speakerId) return { ok: false, error: "Falta la ficha de ponente." };

  let admin;
  try {
    admin = await assertSpeakerOwner(speakerId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sin acceso" };
  }

  const patch: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    const v = ((formData.get(field) as string) || "").trim();
    patch[field] = v || null;
  }

  const { error } = await admin
    .from("speakers")
    .update(patch)
    .eq("id", speakerId);

  revalidatePath("/mi-charla");
  revalidatePath(`/ponentes/${speakerId}`);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Cambia el estado de una pregunta de una charla del ponente (mismas transiciones que /admin/qa). */
export async function setQuestionStatus(formData: FormData): Promise<Result> {
  const questionId = (formData.get("question_id") as string) || "";
  const speakerId = (formData.get("speaker_id") as string) || "";
  const status = (formData.get("status") as string) || "";
  if (!questionId || !speakerId || !QUESTION_STATUSES.includes(status))
    return { ok: false, error: "Datos inválidos." };

  let admin;
  try {
    admin = await assertSpeakerOwner(speakerId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sin acceso" };
  }

  // La pregunta debe pertenecer a la charla del ponente (no confiar en el form).
  const { error } = await admin
    .from("speaker_questions")
    .update({ status })
    .eq("id", questionId)
    .eq("speaker_id", speakerId);

  revalidatePath("/mi-charla");
  revalidatePath(`/admin/qa/${speakerId}`);
  revalidatePath(`/proyector/qa/${speakerId}`);
  return error ? { ok: false, error: error.message } : { ok: true };
}
