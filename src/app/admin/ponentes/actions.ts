"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

type Result = { ok: boolean; error?: string };

function readSpeaker(formData: FormData) {
  const edition = parseInt((formData.get("edition") as string) || "2026", 10);
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
    edition: Number.isNaN(edition) ? 2026 : edition,
  };
}

function revalidate() {
  revalidatePath("/admin/ponentes");
  revalidatePath("/ponentes");
}

export async function createSpeaker(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const fields = readSpeaker(formData);
  if (!fields.full_name) return { ok: false, error: "El nombre es obligatorio." };
  const { error } = await admin.from("speakers").insert(fields);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateSpeaker(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const fields = readSpeaker(formData);
  if (!fields.full_name) return { ok: false, error: "El nombre es obligatorio." };
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
