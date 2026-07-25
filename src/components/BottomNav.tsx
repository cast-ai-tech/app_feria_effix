"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, IdCard, Map, User } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Barra de navegación inferior — la navegación de la APP en TODOS los
 * tamaños (esto no es un sitio web: nada de sidebars). Fase 24.
 * 5 accesos: Inicio, Agenda, CREDENCIAL (central destacado), Mapa, Perfil.
 */
const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: House, center: false },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, center: false },
  { href: "/credencial", label: "Credencial", icon: IdCard, center: true },
  { href: "/mapa", label: "Mapa", icon: Map, center: false },
  { href: "/perfil", label: "Perfil", icon: User, center: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex w-full items-end justify-around border-t border-white/10 bg-[rgba(10,10,12,0.92)] px-3 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] backdrop-blur-md md:justify-center md:gap-16"
      aria-label="Navegacion principal"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        if (item.center) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex min-w-11 flex-col items-center gap-1 text-[9px] font-bold"
            >
              <span
                className={cn(
                  "-mt-7 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-transform duration-150 active:scale-95",
                  active
                    ? "border-white bg-brand-white text-black"
                    : "border-white/40 bg-[rgba(20,20,24,0.95)] text-brand-white",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className={active ? "text-brand-white" : "text-brand-lav"}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-11 flex-col items-center justify-end gap-1 text-[9px] font-bold transition-colors duration-150",
              active ? "text-brand-white" : "text-brand-lav",
            )}
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
