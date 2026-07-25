import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envío de Web Push desde el SERVIDOR (Fase 16).
 * Requiere las env vars VAPID (ver .env.example). Solo se llama desde
 * server actions ya autorizadas (admin o notificaciones operativas
 * verificadas) — nunca desde el cliente.
 */

export type PushPayload = {
  title: string;
  body?: string;
  /** Deep link que abre el click (ruta interna, ej. /agenda). */
  url?: string;
};

function vapidConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function setup() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/**
 * Envía el payload a TODOS los dispositivos de los usuarios dados, en lotes.
 * Limpia suscripciones muertas (404/410). Devuelve cuántos push salieron.
 * Si VAPID no está configurado, no envía (la notificación igual queda en el
 * centro in-app) y devuelve 0.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (userIds.length === 0 || !vapidConfigured()) return 0;
  setup();

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  const BATCH = 50;
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            body,
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(s.id);
          // Otros errores: se ignoran (dispositivo temporalmente inalcanzable).
        }
      }),
    );
  }

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }
  return sent;
}
