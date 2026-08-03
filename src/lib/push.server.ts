import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { fcmConfigured, getMessaging } from "@/lib/firebaseAdmin";

/**
 * Envío de push desde el SERVIDOR — Web Push (Fase 16) + FCM nativo
 * Android/iOS (Fase 30). Solo se llama desde server actions ya autorizadas
 * (admin o notificaciones operativas verificadas) — nunca desde el cliente.
 *
 * `sendPushToUsers()` mantiene la misma firma pública desde la Fase 16: los
 * 4 puntos de disparo existentes (admin/notificaciones, cron de
 * recordatorios, cambio de hora de charla, conexión/sello de credencial) no
 * necesitan tocarse — la partición Web Push / FCM es un detalle interno.
 */

export type PushPayload = {
  title: string;
  body?: string;
  /** Deep link que abre el click (ruta interna, ej. /agenda). */
  url?: string;
};

type Subscription = {
  id: string;
  platform: "web" | "android" | "ios";
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
};

function vapidConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function setupWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/** Envía por Web Push (VAPID). Devuelve {sent, dead: ids muertos 404/410}. */
async function sendWebPush(
  subs: Subscription[],
  payload: PushPayload,
): Promise<{ sent: number; dead: string[] }> {
  if (subs.length === 0 || !vapidConfigured()) return { sent: 0, dead: [] };
  setupWebPush();

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  const BATCH = 50;
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (s) => {
        if (!s.p256dh || !s.auth) return; // fila corrupta: sin claves VAPID
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
  return { sent, dead };
}

/** Envía por FCM (Android nativo, e iOS puenteado a APNs vía Firebase). */
async function sendFcmPush(
  subs: Subscription[],
  payload: PushPayload,
): Promise<{ sent: number; dead: string[] }> {
  if (subs.length === 0 || !fcmConfigured()) return { sent: 0, dead: [] };

  const dead: string[] = [];
  let sent = 0;
  const byToken = new Map(subs.map((s) => [s.endpoint, s.id]));

  const BATCH = 500; // límite de sendEachForMulticast
  const tokens = subs.map((s) => s.endpoint);
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title: payload.title, body: payload.body ?? "" },
      data: payload.url ? { url: payload.url } : undefined,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
    res.responses.forEach((r, idx) => {
      const token = batch[idx];
      if (r.success) {
        sent++;
        return;
      }
      const code = r.error?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        const id = byToken.get(token);
        if (id) dead.push(id);
      }
    });
  }
  return { sent, dead };
}

/**
 * Envía el payload a TODOS los dispositivos de los usuarios dados
 * (Web Push + FCM según `platform`), en lotes. Limpia suscripciones muertas.
 * Devuelve cuántos push salieron en total. Si ningún proveedor está
 * configurado, no envía (la notificación igual queda en el centro in-app) y
 * devuelve 0.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (userIds.length === 0) return 0;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,platform,endpoint,p256dh,auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return 0;

  const webSubs = subs.filter((s) => s.platform === "web") as Subscription[];
  const nativeSubs = subs.filter((s) => s.platform !== "web") as Subscription[];

  const [web, native] = await Promise.all([
    sendWebPush(webSubs, payload),
    sendFcmPush(nativeSubs, payload),
  ]);

  const dead = [...web.dead, ...native.dead];
  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }
  return web.sent + native.sent;
}
