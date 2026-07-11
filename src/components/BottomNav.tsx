"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra de navegacion inferior — 4 accesos, como el prototipo:
 * Inicio, Agenda, Mapa, Perfil (Comunidad).
 */
const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/mapa", label: "Mapa", icon: "🗺️" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[440px] -translate-x-1/2 items-center justify-around border-t border-white/10 bg-[rgba(10,10,12,0.9)] px-3 pt-3 pb-6 backdrop-blur-md"
      aria-label="Navegacion principal"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
              active ? "text-brand-white" : "text-brand-lav"
            }`}
          >
            <span className="text-[17px] leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
