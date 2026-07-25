"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";

type Result = { ok: boolean; error?: string };

const QUESTION_STATUSES = ["pending", "approved", "answered", "discarded"];

/** Cambia el estado de una pregunta del Q&A moderado. */
export async function setQuestionStatus(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const status = (formData.get("status") as string) || "";
  if (!id || !QUESTION_STATUSES.includes(status))
    return { ok: false, error: "Datos inválidos." };

  const { error } = await admin
    .from("speaker_questions")
    .update({ status })
    .eq("id", id);

  revalidatePath("/admin/qa");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Marca una charla como finalizada → habilita la encuesta flash.
 * Punto de integración F16/17: aquí se dispara el push "¿Qué te pareció?"
 * a quienes guardaron la charla.
 */
export async function finishTalk(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id de la charla." };

  const { error } = await admin
    .from("talks")
    .update({ status: "finished" })
    .eq("id", id);

  revalidatePath("/admin/qa");
  revalidatePath("/agenda");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Crea una votación en vivo (opciones: una por línea). */
export async function createPoll(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const question = ((formData.get("question") as string) || "").trim();
  const talkId = ((formData.get("talk_id") as string) || "").trim();
  const rawOptions = ((formData.get("options") as string) || "").trim();

  const options = rawOptions
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  if (!question) return { ok: false, error: "La pregunta es obligatoria." };
  if (options.length < 2)
    return { ok: false, error: "Escribe al menos 2 opciones (una por línea)." };

  const { error } = await admin.from("live_polls").insert({
    question,
    options,
    talk_id: talkId || null,
    active: false,
  });

  revalidatePath("/admin/qa");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Activa/desactiva una votación (el proyector reacciona en vivo). */
export async function setPollActive(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const active = (formData.get("active") as string) === "true";
  if (!id) return { ok: false, error: "Falta el id de la votación." };

  const { error } = await admin
    .from("live_polls")
    .update({ active })
    .eq("id", id);

  revalidatePath("/admin/qa");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Elimina una votación (borra sus votos en cascada). */
export async function deletePoll(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id de la votación." };

  const { error } = await admin.from("live_polls").delete().eq("id", id);

  revalidatePath("/admin/qa");
  return error ? { ok: false, error: error.message } : { ok: true };
}
