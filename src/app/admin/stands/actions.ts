"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { FALLBACK_EDITION } from "@/lib/editions";

type Result = { ok: boolean; error?: string };

const STAND_TIERS = ["basico", "plata", "oro", "diamante"];

function readStand(formData: FormData) {
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  const tier = ((formData.get("tier") as string) || "basico").trim();
  return {
    name: ((formData.get("name") as string) || "").trim(),
    category: ((formData.get("category") as string) || "").trim() || null,
    stand_number: ((formData.get("stand_number") as string) || "").trim() || null,
    description: ((formData.get("description") as string) || "").trim() || null,
    zone: ((formData.get("zone") as string) || "").trim() || null,
    tier: STAND_TIERS.includes(tier) ? tier : "basico",
    edition: Number.isNaN(edition) ? FALLBACK_EDITION.year : edition,
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

/** Cambiar el nivel de patrocinio de un stand (Fase 19). */
export async function setStandTier(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const tier = (formData.get("tier") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  if (!STAND_TIERS.includes(tier))
    return { ok: false, error: "Nivel inválido." };
  const { error } = await admin.from("stands").update({ tier }).eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Asignar staff a un stand por correo (Fase 19). Busca el usuario por su
 * ticket_email en profiles — mismo patrón de src/app/admin/tickets.
 */
export async function addStandStaff(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const standId = (formData.get("stand_id") as string) || "";
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  if (!standId || !email)
    return { ok: false, error: "Faltan el stand o el correo." };

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
    .from("stand_staff")
    .upsert(
      { stand_id: standId, user_id: profile.id },
      { onConflict: "stand_id,user_id", ignoreDuplicates: true },
    );

  revalidate();
  revalidatePath("/mi-stand");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Quitar un miembro del staff de un stand. */
export async function removeStandStaff(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("stand_staff").delete().eq("id", id);
  revalidate();
  revalidatePath("/mi-stand");
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
