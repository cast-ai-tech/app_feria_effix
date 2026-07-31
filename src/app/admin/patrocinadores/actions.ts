"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { FALLBACK_EDITION } from "@/lib/editions";

type Result = { ok: boolean; error?: string };

const SPONSOR_TIERS = ["basico", "plata", "oro", "diamante", "black"];

function readSponsor(formData: FormData) {
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  const tier = ((formData.get("tier") as string) || "basico").trim();
  return {
    name: ((formData.get("name") as string) || "").trim(),
    logo_url: ((formData.get("logo_url") as string) || "").trim() || null,
    website: ((formData.get("website") as string) || "").trim() || null,
    tier: SPONSOR_TIERS.includes(tier) ? tier : "basico",
    edition: Number.isNaN(edition) ? FALLBACK_EDITION.year : edition,
    active: (formData.get("active") as string) !== "false",
  };
}

function revalidate() {
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/mi-patrocinio");
}

/** Crea o actualiza un patrocinador (id presente = update). */
export async function upsertSponsor(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const fields = readSponsor(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = id
    ? await admin.from("sponsors").update(fields).eq("id", id)
    : await admin.from("sponsors").insert(fields);

  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSponsor(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("sponsors").delete().eq("id", id);
  revalidate();
  revalidatePath("/admin/banners");
  revalidatePath("/admin/stands");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Asignar staff a un patrocinador por correo — mismo patrón de
 * addStandStaff: busca en profiles.ticket_email.
 */
export async function addSponsorStaff(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const sponsorId = (formData.get("sponsor_id") as string) || "";
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  if (!sponsorId || !email)
    return { ok: false, error: "Faltan el patrocinador o el correo." };

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
    .from("sponsor_staff")
    .upsert(
      { sponsor_id: sponsorId, user_id: profile.id },
      { onConflict: "sponsor_id,user_id", ignoreDuplicates: true },
    );

  revalidate();
  revalidatePath("/mi-patrocinio");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeSponsorStaff(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("sponsor_staff").delete().eq("id", id);
  revalidate();
  revalidatePath("/mi-patrocinio");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Vincula (o desvincula, con sponsor_id vacío) un banner a un patrocinador. */
export async function linkBannerToSponsor(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const bannerId = (formData.get("banner_id") as string) || "";
  const sponsorId = ((formData.get("sponsor_id") as string) || "").trim();
  if (!bannerId) return { ok: false, error: "Falta el banner." };

  const { error } = await admin
    .from("banners")
    .update({ sponsor_id: sponsorId || null })
    .eq("id", bannerId);

  revalidate();
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return error ? { ok: false, error: error.message } : { ok: true };
}
