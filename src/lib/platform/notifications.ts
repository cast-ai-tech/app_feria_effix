/**
 * Adaptador de notificaciones push — capa de plataforma.
 *
 * Interfaz definida en Fase 13; implementación web COMPLETA en Fase 16
 * (Web Push + VAPID sobre el service worker existente). Fase 30: provider
 * nativo con @capacitor/push-notifications (FCM — Android directo, iOS
 * puenteado a APNs vía Firebase) junto al Web Push, elegido en tiempo de
 * carga con isNativeApp() (mismo criterio que el resto de src/lib/platform/).
 *
 * También vive aquí la programación de alarmas LOCALES de charla
 * (@capacitor/local-notifications) — es otra forma de "notificación", pero
 * a diferencia del push no depende del servidor: sigue funcionando aunque
 * el push remoto falle o el dispositivo esté sin señal. No-op en web (ese
 * caso ya lo cubre el cron server-side, ver src/app/api/cron/reminders).
 */

import { isNativeApp } from "@/lib/platform/native";
import {
  computeReminderFireTime,
  talkReminderId,
} from "@/lib/reminderScheduling";

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export type PushSubscriptionInfo = {
  endpoint: string;
  /** Ausente en suscripciones nativas (FCM no usa claves VAPID). */
  keys?: { p256dh: string; auth: string };
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

export type ReminderTalk = {
  id: string;
  title: string;
  startsAt: string;
  auditorium: string | null;
};

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

  // No-op: las alarmas locales solo existen en nativo (ver NativeNotifications).
  async scheduleTalkReminder(): Promise<void> {}
  async cancelTalkReminder(): Promise<void> {}
  initListeners(): void {}
}

class NativeNotifications implements NotificationsAdapter {
  private lastToken: string | null = null;

  async permissionState(): Promise<PushPermission> {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    try {
      const { receive } = await PushNotifications.checkPermissions();
      if (receive === "granted") return "granted";
      if (receive === "denied") return "denied";
      return "prompt";
    } catch {
      return "unsupported";
    }
  }

  async subscribe(): Promise<PushSubscriptionInfo | null> {
    try {
      const { PushNotifications } =
        await import("@capacitor/push-notifications");
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== "granted") return null;

      const token = await new Promise<string | null>((resolve) => {
        const okHandle = PushNotifications.addListener("registration", (t) => {
          void okHandle.then((h) => h.remove());
          void errHandle.then((h) => h.remove());
          resolve(t.value);
        });
        const errHandle = PushNotifications.addListener(
          "registrationError",
          () => {
            void okHandle.then((h) => h.remove());
            void errHandle.then((h) => h.remove());
            resolve(null);
          },
        );
        void PushNotifications.register();
      });

      if (!token) return null;
      this.lastToken = token;
      return { endpoint: token };
    } catch {
      // Plugin no disponible (p. ej. falta google-services.json en el
      // build) — degrada a "sin push nativo" en vez de romper la app.
      return null;
    }
  }

  async unsubscribe(): Promise<string | null> {
    // @capacitor/push-notifications no expone un "unregister" limpio
    // cross-platform; nos limitamos a devolver el último token conocido
    // para que el backend borre la fila — el token puede seguir vivo en
    // FCM, pero sin fila en push_subscriptions no recibe nada.
    return this.lastToken;
  }

  async scheduleTalkReminder(
    talk: ReminderTalk,
    leadMinutes: number,
  ): Promise<void> {
    const fireAt = computeReminderFireTime(talk.startsAt, leadMinutes);
    if (fireAt === null) return;
    try {
      const { LocalNotifications } =
        await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== "granted") {
        const { display: req } = await LocalNotifications.requestPermissions();
        if (req !== "granted") return;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id: talkReminderId(talk.id),
            title: "⏰ Tu charla empieza pronto",
            body: `"${talk.title}"${talk.auditorium ? ` · ${talk.auditorium}` : ""}`,
            schedule: { at: new Date(fireAt) },
            extra: { url: "/agenda" },
          },
        ],
      });
    } catch {
      // Sin local-notifications disponible: el cron server-side sigue
      // siendo la red de respaldo.
    }
  }

  async cancelTalkReminder(talkId: string): Promise<void> {
    try {
      const { LocalNotifications } =
        await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({
        notifications: [{ id: talkReminderId(talkId) }],
      });
    } catch {
      /* nada que cancelar si el plugin no está disponible */
    }
  }

  initListeners(): void {
    void (async () => {
      try {
        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const url = (
              action.notification.data as { url?: string } | undefined
            )?.url;
            if (url && typeof window !== "undefined") {
              window.location.href = url;
            }
          },
        );
      } catch {
        /* plugin no disponible */
      }
    })();
  }
}

const impl: NotificationsAdapter &
  Pick<
    NativeNotifications,
    "scheduleTalkReminder" | "cancelTalkReminder" | "initListeners"
  > = isNativeApp() ? new NativeNotifications() : new WebNotifications();

export const notifications: NotificationsAdapter = impl;

/** Programa la alarma local de una charla guardada. No-op en web. */
export function scheduleTalkReminder(
  talk: ReminderTalk,
  leadMinutes: number,
): Promise<void> {
  return impl.scheduleTalkReminder(talk, leadMinutes);
}

/** Cancela la alarma local de una charla. No-op en web. */
export function cancelTalkReminder(talkId: string): Promise<void> {
  return impl.cancelTalkReminder(talkId);
}

/** Registra los listeners nativos (tap en la notificación, etc). No-op en web. */
export function initNativeListeners(): void {
  impl.initListeners();
}
