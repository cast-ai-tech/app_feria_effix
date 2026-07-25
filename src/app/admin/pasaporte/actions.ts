"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";

type Result = { ok: boolean; error?: string };

function revalidate() {
  revalidatePath("/admin/pasaporte");
  revalidatePath("/pasaporte");
}

export async function createCampaign(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const name = ((formData.get("name") as string) || "").trim();
  const goal_type = (formData.get("goal_type") as string) || "total";
  const goal_value = parseInt((formData.get("goal_value") as string) || "0", 10);
  const prize = ((formData.get("prize_description") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "", 10);

  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (!goal_value || goal_value < 1)
    return { ok: false, error: "La meta debe ser un número mayor a 0." };
  if (!["total", "por_zona"].includes(goal_type))
    return { ok: false, error: "Tipo de meta inválido." };

  const { error } = await admin.from("passport_campaigns").insert({
    name,
    goal_type,
    goal_value,
    prize_description: prize || null,
    edition,
    active: false,
  });
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Activa una campaña y desactiva las demás de su edición. */
export async function toggleCampaign(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const activate = (formData.get("activate") as string) === "true";
  if (!id) return { ok: false, error: "Falta el id." };

  if (activate) {
    const { data: camp } = await admin
      .from("passport_campaigns")
      .select("edition")
      .eq("id", id)
      .maybeSingle();
    if (camp) {
      await admin
        .from("passport_campaigns")
        .update({ active: false })
        .eq("edition", camp.edition);
    }
  }
  const { error } = await admin
    .from("passport_campaigns")
    .update({ active: activate })
    .eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markRedeemed(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin
    .from("passport_completions")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}
