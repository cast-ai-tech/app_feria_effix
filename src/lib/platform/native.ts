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
