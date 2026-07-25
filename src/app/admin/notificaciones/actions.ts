"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";
import { sendPushToUsers } from "@/lib/push.server";
import {
  canSendCampaign,
  type AudienceType,
  type NotificationCategory,
} from "@/lib/notificationsRules";

type Result = { ok: boolean; error?: string; sent?: number };

/**
 * Envía una notificación segmentada (Fase 16): queda en el centro in-app
 * (RLS filtra por audiencia) y sale por Web Push a los suscritos.
 */
export async function sendNotification(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();

  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const url = ((formData.get("url") as string) || "").trim();
  const audience_type = ((formData.get("audience_type") as string) ||
    "all") as AudienceType;
  const audience_value =
    ((formData.get("audience_value") as string) || "").trim() || null;
  const category = ((formData.get("category") as string) ||
    "operativa") as NotificationCategory;

  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (!["all", "tier", "rol"].includes(audience_type))
    return { ok: false, error: "Audiencia inválida." };
  if (audience_type !== "all" && !audience_value)
    return { ok: false, error: "Falta el valor de la audiencia (tier o rol)." };
  if (!["operativa", "marketing"].includes(category))
    return { ok: false, error: "Categoría inválida." };

  // ── Anti-spam: límite diario de marketing (app_config) ──────────────
  if (category === "marketing") {
    const { data: cfg } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "push_marketing_daily_limit")
      .maybeSingle();
    const limit = parseInt(cfg?.value ?? "2", 10) || 2;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("category", "marketing")
      .gte("sent_at", startOfDay.toISOString());

    if (!canSendCampaign(category, count ?? 0, limit)) {
      return {
        ok: false,
        error: `Límite anti-spam alcanzado: máximo ${limit} pushes de marketing por día (ya van ${count}). Las operativas no cuentan.`,
      };
    }
  }

  // ── Audiencia → user_ids destino ────────────────────────────────────
  let userIds: string[] = [];
  if (audience_type === "all") {
    const { data } = await admin.from("push_subscriptions").select("user_id");
    userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  } else if (audience_type === "rol") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", audience_value);
    userIds = (data ?? []).map((r) => r.id);
  } else {
    const { data } = await admin
      .from("tickets")
      .select("user_id")
      .eq("ticket_type", audience_value)
      .eq("status", "active")
      .not("user_id", "is", null);
    userIds = [...new Set((data ?? []).map((r) => r.user_id as string))];
  }

  // Marketing respeta el opt-out del perfil.
  if (category === "marketing" && userIds.length > 0) {
    const { data: optouts } = await admin
      .from("profiles")
      .select("id")
      .eq("optout_marketing_push", true)
      .in("id", userIds);
    const excluded = new Set((optouts ?? []).map((o) => o.id));
    userIds = userIds.filter((id) => !excluded.has(id));
  }

  // ── Registrar en el centro + enviar push ────────────────────────────
  const { data: inserted, error } = await admin
    .from("notifications")
    .insert({
      title,
      body: body || null,
      url: url || null,
      audience_type,
      audience_value,
      category,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const sent = await sendPushToUsers(userIds, {
    title,
    body: body || undefined,
    url: url || "/notificaciones",
  });

  await admin
    .from("notifications")
    .update({ sent_count: sent })
    .eq("id", inserted.id);

  revalidatePath("/admin/notificaciones");
  revalidatePath("/notificaciones");
  return { ok: true, sent };
}
