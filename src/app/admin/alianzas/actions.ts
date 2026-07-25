"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { FALLBACK_EDITION } from "@/lib/editions";

type Result = { ok: boolean; error?: string };

// ---------------------------------------------------------------------------
// Crear oferta.
// ---------------------------------------------------------------------------
export async function createOffer(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const title = ((formData.get("title") as string) || "").trim();
  const partner_name = ((formData.get("partner_name") as string) || "").trim();
  const discount = ((formData.get("discount") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const referral_url = ((formData.get("referral_url") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const { error } = await admin.from("offers").insert({
    title,
    partner_name: partner_name || null,
    discount: discount || null,
    description: description || null,
    referral_url: referral_url || null,
    edition: Number.isNaN(edition) ? FALLBACK_EDITION.year : edition,
    active: true,
  });

  revalidatePath("/admin/alianzas");
  revalidatePath("/alianzas");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Actualizar oferta (incluye su link de referido).
// ---------------------------------------------------------------------------
export async function updateOffer(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim();
  const partner_name = ((formData.get("partner_name") as string) || "").trim();
  const discount = ((formData.get("discount") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const referral_url = ((formData.get("referral_url") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "", 10);
  if (!id) return { ok: false, error: "Falta el id de la oferta." };
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const { error } = await admin
    .from("offers")
    .update({
      title,
      partner_name: partner_name || null,
      discount: discount || null,
      description: description || null,
      referral_url: referral_url || null,
      edition: Number.isNaN(edition) ? FALLBACK_EDITION.year : edition,
    })
    .eq("id", id);

  revalidatePath("/admin/alianzas");
  revalidatePath("/alianzas");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Alternar visibilidad (active).
// ---------------------------------------------------------------------------
export async function toggleOffer(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const active = (formData.get("active") as string) === "true";
  if (!id) return { ok: false, error: "Falta el id de la oferta." };

  const { error } = await admin
    .from("offers")
    .update({ active: !active })
    .eq("id", id);

  revalidatePath("/admin/alianzas");
  revalidatePath("/alianzas");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Eliminar oferta.
// ---------------------------------------------------------------------------
export async function deleteOffer(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id de la oferta." };

  const { error } = await admin.from("offers").delete().eq("id", id);

  revalidatePath("/admin/alianzas");
  revalidatePath("/alianzas");
  return error ? { ok: false, error: error.message } : { ok: true };
}
