"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (solo en producción) para habilitar el modo
 * offline del QR. En desarrollo no se registra para no interferir con el
 * hot-reload de Next.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW la app sigue funcionando online; el QR offline usa el cache
        // local de la boleta (localStorage) mientras la pestaña esté abierta.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
