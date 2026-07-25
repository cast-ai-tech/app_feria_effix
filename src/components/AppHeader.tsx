"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import NotificationsBell from "@/components/NotificationsBell";

/**
 * Header de APP unificado (Fase 24) — sticky en TODAS las rutas:
 * logo a la izquierda + campana de notificaciones DENTRO del header.
 * Se funde con la barra de estado del teléfono (fondo negro + safe area).
 * Oculto en admin y proyector (tienen su propio contexto).
 */
export default function AppHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/proyector")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[rgba(5,5,7,0.88)] px-5 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md md:px-8 xl:px-12">
      <Link href="/" aria-label="Inicio">
        <BrandLogo />
      </Link>
      <NotificationsBell variant="inline" />
    </header>
  );
}
