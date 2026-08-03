"use client";

/**
 * Alta/baja de push del DISPOSITIVO actual (Fase 16, lado cliente).
 * Usa el adaptador de plataforma y persiste la suscripción en Supabase.
 */

import { createClient } from "@/lib/supabase/client";
import { notifications } from "@/lib/platform/notifications";
import { nativePlatform } from "@/lib/platform/native";

export async function enablePush(): Promise<
  "enabled" | "denied" | "unsupported" | "error"
> {
  const state = await notifications.permissionState();
  if (state === "unsupported") return "unsupported";
  if (state === "denied") return "denied";

  const sub = await notifications.subscribe();
  if (!sub) return state === "prompt" ? "denied" : "error";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "error";

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      platform: nativePlatform(),
      // Solo Web Push trae claves VAPID; los tokens FCM nativos no las usan.
      p256dh: sub.keys?.p256dh ?? null,
      auth: sub.keys?.auth ?? null,
    },
    { onConflict: "endpoint" },
  );
  return error ? "error" : "enabled";
}

export async function disablePush(): Promise<void> {
  const endpoint = await notifications.unsubscribe();
  if (!endpoint) return;
  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
