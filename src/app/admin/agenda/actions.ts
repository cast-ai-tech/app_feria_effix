"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push.server";
import {
  FALLBACK_EDITION,
  editionDayDate,
  type EditionInfo,
} from "@/lib/editions";

type ActionResult = { ok: boolean; error?: string };

/** Edición activa desde la tabla `editions` (nada hardcodeado). */
async function getActiveEdition(
  admin: ReturnType<typeof createAdminClient>,
): Promise<EditionInfo> {
  const { data } = await admin
    .from("editions")
    .select("year,name,starts_on,ends_on,days")
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return FALLBACK_EDITION;
  return {
    year: data.year,
    name: data.name,
    startsOn: data.starts_on,
    endsOn: data.ends_on,
    days: data.days,
  };
}

/**
 * Combina el día (1..edition.days) y una hora "HH:MM" en un timestamptz con
 * la zona horaria del evento (Medellín, -05). Devuelve null si falta la hora.
 */
function toEventTimestamp(
  edition: EditionInfo,
  day: number,
  time: string,
): string | null {
  const t = (time || "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":");
  const hh = h.padStart(2, "0");
  return `${editionDayDate(edition, day)} ${hh}:${m}:00-05`;
}

function parseForm(formData: FormData, edition: EditionInfo) {
  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const auditorium = ((formData.get("auditorium") as string) || "").trim();
  const speaker_name = ((formData.get("speaker_name") as string) || "").trim();
  const track = ((formData.get("track") as string) || "").trim();
  const day = parseInt((formData.get("day") as string) || "1", 10);
  const startTime = (formData.get("start_time") as string) || "";
  const endTime = (formData.get("end_time") as string) || "";

  return {
    title,
    description: description || null,
    auditorium: auditorium || null,
    speaker_name: speaker_name || null,
    track: track || null,
    day,
    starts_at: toEventTimestamp(edition, day, startTime),
    ends_at: toEventTimestamp(edition, day, endTime),
  };
}

/** Push operativo a quienes GUARDARON la charla (Fase 17). */
async function notifySavers(
  admin: ReturnType<typeof createAdminClient>,
  talkId: string,
  title: string,
  body: string,
) {
  const { data: savers } = await admin
    .from("saved_talks")
    .select("user_id")
    .eq("talk_id", talkId);
  const userIds = (savers ?? []).map((s) => s.user_id);
  if (userIds.length === 0) return;
  await sendPushToUsers(userIds, { title, body, url: "/agenda" });
}

/**
 * Sincroniza los campos duplicados del ponente (hallazgo #27): editar la
 * charla actualiza talk_title/talk_starts_at del speaker vinculado.
 */
async function syncSpeaker(
  admin: ReturnType<typeof createAdminClient>,
  talkId: string,
) {
  const { data: talk } = await admin
    .from("talks")
    .select("speaker_id,title,starts_at")
    .eq("id", talkId)
    .maybeSingle();
  if (!talk?.speaker_id) return;
  await admin
    .from("speakers")
    .update({ talk_title: talk.title, talk_starts_at: talk.starts_at })
    .eq("id", talk.speaker_id);
}

export async function createTalk(formData: FormData): Promise<ActionResult> {
  const admin = await assertAdmin();
  const ed = await getActiveEdition(admin);
  const p = parseForm(formData, ed);
  if (!p.title) return { ok: false, error: "El título es obligatorio." };
  if (!Number.isInteger(p.day) || p.day < 1 || p.day > ed.days)
    return { ok: false, error: `Día inválido (debe ser 1 a ${ed.days}).` };

  const edition =
    parseInt((formData.get("edition") as string) || "", 10) || ed.year;

  const { error } = await admin.from("talks").insert({
    title: p.title,
    description: p.description,
    auditorium: p.auditorium,
    speaker_name: p.speaker_name,
    track: p.track,
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
  const ed = await getActiveEdition(admin);
  const p = parseForm(formData, ed);
  if (!p.title) return { ok: false, error: "El título es obligatorio." };
  if (!Number.isInteger(p.day) || p.day < 1 || p.day > ed.days)
    return { ok: false, error: `Día inválido (debe ser 1 a ${ed.days}).` };

  // Estado previo, para detectar cambios de sala/hora y avisar (Fase 17).
  const { data: before } = await admin
    .from("talks")
    .select("auditorium,starts_at,day")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin
    .from("talks")
    .update({
      title: p.title,
      description: p.description,
      auditorium: p.auditorium,
      speaker_name: p.speaker_name,
      track: p.track,
      day: p.day,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
    })
    .eq("id", id);

  if (!error && before) {
    const roomChanged = before.auditorium !== p.auditorium;
    const timeChanged =
      before.starts_at !== p.starts_at || before.day !== p.day;
    if (roomChanged || timeChanged) {
      await notifySavers(
        admin,
        id,
        "🔄 Cambio en una charla que guardaste",
        `"${p.title}" ${roomChanged ? `ahora es en ${p.auditorium ?? "otra sala"}` : "cambió de horario"}. Revisa tu agenda.`,
      );
    }
    await syncSpeaker(admin, id);
  }

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
  if (!error) {
    const { data: talk } = await admin
      .from("talks")
      .select("title")
      .eq("id", id)
      .maybeSingle();
    await notifySavers(
      admin,
      id,
      "🚫 Charla cancelada",
      `"${talk?.title ?? "Una charla que guardaste"}" fue cancelada.`,
    );
  }
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
