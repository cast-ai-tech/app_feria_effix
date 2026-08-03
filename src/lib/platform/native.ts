/**
 * Adaptador de plataforma — detección de shell nativo (Fase 22).
 *
 * Único punto del repo que importa `@capacitor/core` directo (es el SDK
 * puente, no una API de navegador cruda) para que ningún componente tenga
 * que saber si corre dentro del WebView nativo o del navegador normal.
 */

import { Capacitor } from "@capacitor/core";

/** true cuando la app corre empaquetada (Android/iOS), no en un navegador. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/**
 * Plataforma real (Fase 30) — usada para guardar `push_subscriptions.platform`
 * y así poder enviar por FCM (android/ios) o Web Push (web) según corresponda.
 */
export function nativePlatform(): "web" | "android" | "ios" {
  if (typeof window === "undefined") return "web";
  const p = Capacitor.getPlatform();
  return p === "android" || p === "ios" ? p : "web";
}
