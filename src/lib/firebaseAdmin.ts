import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging as getFirebaseMessaging } from "firebase-admin/messaging";

/**
 * Cliente lazy de Firebase Admin SDK — SOLO servidor (Fase 30).
 * Único proveedor de push nativo (FCM) para Android y iOS (FCM puentea a
 * APNs una vez cargada la APNs Auth Key en la consola de Firebase — sin
 * cliente APNs aparte). Requiere las 3 env vars de la cuenta de servicio
 * (ver docs/FASE22_CAPACITOR.md). Mismo criterio que vapidConfigured() en
 * src/lib/push.server.ts: si no está configurado, degrada a "0 enviados"
 * sin romper nada.
 */

let app: App | null = null;

export function fcmConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function getApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel guarda el private key con \n literales — hay que revertirlos.
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  return app;
}

export function getMessaging() {
  return getFirebaseMessaging(getApp());
}
