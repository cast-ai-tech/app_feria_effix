"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push.server";

type Result = { ok: boolean; error?: string };

/**
 * Guardia del portal del expositor: valida con el cliente NORMAL (RLS)
 * que el usuario es staff del stand, y solo entonces devuelve la service
 * key para escribir. Nunca usar assertAdmin aquí — el expositor no es admin.
 */
async function assertStandStaff(standId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: membership } = await supabase
    .from("stand_staff")
    .select("id")
    .eq("stand_id", standId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new Error("No eres staff de este stand");

  return { admin: createAdminClient(), userId: user.id };
}

/**
 * Campos editables según el nivel de patrocinio (parte del producto que
 * se vende): básico = descripción+logo; plata = +galería y video;
 * oro/diamante/black = +catálogo y WhatsApp.
 */
const FULL_FIELDS = [
  "description",
  "logo_url",
  "gallery_urls",
  "video_url",
  "catalog_url",
  "whatsapp_url",
];

const TIER_FIELDS: Record<string, string[]> = {
  basico: ["description", "logo_url"],
  plata: ["description", "logo_url", "gallery_urls", "video_url"],
  oro: FULL_FIELDS,
  diamante: FULL_FIELDS,
  black: FULL_FIELDS,
};

export async function updateMyStand(formData: FormData): Promise<Result> {
  const standId = (formData.get("stand_id") as string) || "";
  if (!standId) return { ok: false, error: "Falta el stand." };

  let admin;
  try {
    ({ admin } = await assertStandStaff(standId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sin acceso" };
  }

  const { data: stand } = await admin
    .from("stands")
    .select("tier")
    .eq("id", standId)
    .maybeSingle();
  if (!stand) return { ok: false, error: "Stand no encontrado." };

  const allowed = TIER_FIELDS[stand.tier] ?? TIER_FIELDS.basico;
  const patch: Record<string, unknown> = {};

  if (allowed.includes("description")) {
    const v = ((formData.get("description") as string) || "").trim();
    patch.description = v || null;
  }
  if (allowed.includes("logo_url")) {
    const v = ((formData.get("logo_url") as string) || "").trim();
    patch.logo_url = v || null;
  }
  if (allowed.includes("gallery_urls")) {
    // Textarea: una URL por línea → array json.
    const raw = ((formData.get("gallery_urls") as string) || "").trim();
    patch.gallery_urls = raw
      ? raw
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("http"))
          .slice(0, 8)
      : [];
  }
  if (allowed.includes("video_url")) {
    const v = ((formData.get("video_url") as string) || "").trim();
    patch.video_url = v || null;
  }
  if (allowed.includes("catalog_url")) {
    const v = ((formData.get("catalog_url") as string) || "").trim();
    patch.catalog_url = v || null;
  }
  if (allowed.includes("whatsapp_url")) {
    const v = ((formData.get("whatsapp_url") as string) || "").trim();
    patch.whatsapp_url = v || null;
  }

  const { error } = await admin.from("stands").update(patch).eq("id", standId);

  revalidatePath("/mi-stand");
  revalidatePath("/stands");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Aceptar/rechazar una reunión del stand, con franja horaria opcional. */
export async function setMyMeetingStatus(formData: FormData): Promise<Result> {
  const standId = (formData.get("stand_id") as string) || "";
  const meetingId = (formData.get("meeting_id") as string) || "";
  const status = (formData.get("status") as string) || "";
  const slotNote = ((formData.get("slot_note") as string) || "").trim();

  if (!standId || !meetingId) return { ok: false, error: "Faltan datos." };
  if (!["accepted", "declined"].includes(status))
    return { ok: false, error: "Estado inválido." };

  let admin;
  try {
    ({ admin } = await assertStandStaff(standId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sin acceso" };
  }

  // La reunión debe pertenecer al stand del staff (no confiar en el form).
  const { data: updated, error } = await admin
    .from("stand_meetings")
    .update({ status, slot_note: slotNote || null })
    .eq("id", meetingId)
    .eq("stand_id", standId)
    .select("user_id")
    .maybeSingle();

  if (!error && updated) {
    const { data: stand } = await admin
      .from("stands")
      .select("name")
      .eq("id", standId)
      .maybeSingle();
    const standName = stand?.name ?? "el stand";
    await sendPushToUsers([updated.user_id], {
      title:
        status === "accepted" ? "✅ Cita confirmada" : "Cita no disponible",
      body:
        status === "accepted"
          ? `${standName} aceptó tu cita${slotNote ? ` — ${slotNote}` : ""}.`
          : `${standName} no pudo agendar tu cita esta vez.`,
      url: "/stands",
    });
  }

  revalidatePath("/mi-stand");
  return error ? { ok: false, error: error.message } : { ok: true };
}
