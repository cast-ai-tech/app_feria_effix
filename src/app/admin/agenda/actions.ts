"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Verifica que quien llama es admin; devuelve el cliente service-role. */
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

type ActionResult = { ok: boolean; error?: string };

/**
 * Combina el día (1|2|3) y una hora "HH:MM" en un timestamptz con la zona
 * horaria del evento (Medellín, -05). Devuelve null si falta la hora.
 */
function toEventTimestamp(day: number, time: string): string | null {
  const t = (time || "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null;
  // Día 1 = 16 oct, Día 2 = 17, Día 3 = 18 (edición 2026).
  const dayOfMonth = 15 + day; // 1→16, 2→17, 3→18
  const [h, m] = t.split(":");
  const hh = h.padStart(2, "0");
  return `2026-10-${dayOfMonth} ${hh}:${m}:00-05`;
}

function parseForm(formData: FormData) {
  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const auditorium = ((formData.get("auditorium") as string) || "").trim();
  const speaker_name = ((formData.get("speaker_name") as string) || "").trim();
  const day = parseInt((formData.get("day") as string) || "1", 10);
  const startTime = (formData.get("start_time") as string) || "";
  const endTime = (formData.get("end_time") as string) || "";

  return {
    title,
    description: description || null,
    auditorium: auditorium || null,
    speaker_name: speaker_name || null,
    day,
    starts_at: toEventTimestamp(day, startTime),
    ends_at: toEventTimestamp(day, endTime),
  };
}

export async function createTalk(formData: FormData): Promise<ActionResult> {
  const admin = await assertAdmin();
  const p = parseForm(formData);
  if (!p.title) return { ok: false, error: "El título es obligatorio." };
  if (![1, 2, 3].includes(p.day))
    return { ok: false, error: "Día inválido (debe ser 1, 2 o 3)." };

  const edition = parseInt((formData.get("edition") as string) || "2026", 10);

  const { error } = await admin.from("talks").insert({
    title: p.title,
    description: p.description,
    auditorium: p.auditorium,
    speaker_name: p.speaker_name,
    day: p.day,
    starts_at: p.starts_at,
    ends_at: p.ends_at,
    edition,
    status: "active",
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/agenda");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateTalk(formData: FormData): Promise<ActionResult> {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la charla." };
  const p = parseForm(formData);
  if (!p.title) return { ok: false, error: "El título es obligatorio." };
  if (![1, 2, 3].includes(p.day))
    return { ok: false, error: "Día inválido (debe ser 1, 2 o 3)." };

  const { error } = await admin
    .from("talks")
    .update({
      title: p.title,
      description: p.description,
      auditorium: p.auditorium,
      speaker_name: p.speaker_name,
      day: p.day,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
    })
    .eq("id", id);

  revalidatePath("/admin/agenda");
  revalidatePath("/agenda");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Cancela (no borra) una charla → se muestra tachada en la agenda. */
export async function cancelTalk(formData: FormData): Promise<ActionResult> {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin
    .from("talks")
    .update({ status: "cancelled" })
    .eq("id", id);
  revalidatePath("/admin/agenda");
  revalidatePath("/agenda");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Reactiva una charla cancelada. */
export async function reactivateTalk(formData: FormData): Promise<ActionResult> {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin
    .from("talks")
    .update({ status: "active" })
    .eq("id", id);
  revalidatePath("/admin/agenda");
  revalidatePath("/agenda");
  return error ? { ok: false, error: error.message } : { ok: true };
}
