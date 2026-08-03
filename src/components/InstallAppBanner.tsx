"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { storage } from "@/lib/platform/storage";
import { isNativeApp } from "@/lib/platform/native";

/**
 * Aviso para instalar la app (PWA) en móviles (Fase 27). El manifest y el
 * service worker ya están listos (ServiceWorkerRegister.tsx) — este banner
 * solo empuja la instalación con un botón/instrucciones.
 *
 * - Android/Chrome/Edge: escucha `beforeinstallprompt` y dispara el prompt
 *   nativo del navegador.
 * - iOS Safari no dispara ese evento → instrucciones manuales.
 * - Solo se muestra en móvil (no en desktop) y nunca si ya corre standalone.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "effix:install-banner-dismissed-at";
const DISMISS_DAYS = 14;

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

async function logEvent(
  eventType: "shown" | "accepted" | "dismissed",
  platform: Platform,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  void supabase.from("app_install_events").insert({
    event_type: eventType,
    platform,
    user_id: user?.id ?? null,
  });
}

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownLoggedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || isNativeApp()) return;

    const detected = detectPlatform();
    if (detected === "desktop") return; // solo móviles

    let cancelled = false;

    async function maybeShow() {
      const dismissedAt = await storage.get(DISMISS_KEY);
      if (dismissedAt) {
        const daysSince = (Date.now() - Number(dismissedAt)) / 86_400_000;
        if (daysSince < DISMISS_DAYS) return;
      }
      if (cancelled) return;
      setPlatform(detected);
      setVisible(true);
    }

    void maybeShow();

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (visible && !shownLoggedRef.current) {
      shownLoggedRef.current = true;
      void logEvent("shown", platform);
    }
  }, [visible, platform]);

  async function handleDismiss() {
    setVisible(false);
    await storage.set(DISMISS_KEY, String(Date.now()));
    void logEvent("dismissed", platform);
  }

  async function handleInstall() {
    const deferred = deferredPromptRef.current;
    if (!deferred) return; // iOS: no hay prompt nativo, solo instrucciones
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferredPromptRef.current = null;
    setVisible(false);
    if (outcome === "accepted") {
      void logEvent("accepted", platform);
    } else {
      await storage.set(DISMISS_KEY, String(Date.now()));
      void logEvent("dismissed", platform);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 z-30 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] mx-auto max-w-md rounded-[16px] border border-white/[0.12] bg-gradient-to-br from-white/[0.07] to-brand-lav/10 p-4 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-brand-white text-black">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold text-brand-white">
            Instala Feria Effix
          </p>
          <p className="mt-0.5 text-[10.5px] text-brand-muted">
            {platform === "ios"
              ? 'Toca "Compartir" y luego "Agregar a pantalla de inicio".'
              : "Accede más rápido, sin buscarla en el navegador."}
          </p>
          <div className="mt-3 flex gap-2">
            {platform === "android" && (
              <button
                type="button"
                onClick={handleInstall}
                className="rounded-full bg-brand-white px-4 py-2 text-[10.5px] font-extrabold text-black active:scale-95"
              >
                Instalar
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-white/25 px-4 py-2 text-[10.5px] font-bold text-brand-dim active:scale-95"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-brand-muted"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
