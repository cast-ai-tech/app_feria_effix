/**
 * Adaptador de notificaciones push — capa de plataforma.
 *
 * Interfaz definida en Fase 13; implementación web COMPLETA en Fase 16
 * (Web Push + VAPID sobre el service worker existente). Fase 22: provider
 * nativo con @capacitor/push-notifications (FCM/APNs) junto al Web Push.
 */

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export type PushSubscriptionInfo = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export interface NotificationsAdapter {
  /** Estado actual del permiso, sin pedirlo. */
  permissionState(): Promise<PushPermission>;
  /**
   * Pide permiso (si hace falta) y suscribe el dispositivo.
   * Devuelve la suscripción para registrarla en el backend, o null si el
   * usuario negó el permiso o la plataforma no soporta push.
   */
  subscribe(): Promise<PushSubscriptionInfo | null>;
  /** Cancela la suscripción del dispositivo. Devuelve el endpoint cancelado. */
  unsubscribe(): Promise<string | null>;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** base64url → Uint8Array (formato que exige pushManager.subscribe). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

class WebNotifications implements NotificationsAdapter {
  async permissionState(): Promise<PushPermission> {
    if (!supported()) return "unsupported";
    const p = Notification.permission;
    return p === "default" ? "prompt" : p;
  }

  async subscribe(): Promise<PushSubscriptionInfo | null> {
    if (!supported()) return null;
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
    return {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    };
  }

  async unsubscribe(): Promise<string | null> {
    if (!supported()) return null;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  }
}

export const notifications: NotificationsAdapter = new WebNotifications();
