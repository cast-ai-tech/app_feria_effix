"use client";

import { useEffect } from "react";
import { initNativeListeners } from "@/lib/platform/notifications";

/**
 * Registra los listeners nativos de push (tap en la notificación → deep
 * link) una vez al montar — no pide permiso ni se suscribe (eso sigue
 * pasando solo vía PushOptIn.tsx → enablePush(), en el momento de valor).
 * No-op en web (initNativeListeners revisa isNativeApp() internamente).
 */
export default function NativePushBootstrap() {
  useEffect(() => {
    initNativeListeners();
  }, []);
  return null;
}
