"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";

type Result = { ok: boolean; error?: string };

/** Actualiza el valor de una clave de app_config (solo claves existentes). */
export async function updateConfigValue(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const key = ((formData.get("key") as string) || "").trim();
  const value = ((formData.get("value") as string) || "").trim();
  if (!key) return { ok: false, error: "Falta la clave." };

  const { data: existing } = await admin
    .from("app_config")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  if (!existing)
    return { ok: false, error: `La clave "${key}" no existe en app_config.` };

  const { error } = await admin
    .from("app_config")
    .update({ value: value || null })
    .eq("key", key);

  revalidatePath("/admin/config");
  revalidatePath("/tickets");
  return error ? { ok: false, error: error.message } : { ok: true };
}
