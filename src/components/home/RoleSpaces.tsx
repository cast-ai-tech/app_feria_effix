import {
  Crown,
  Handshake,
  Mic,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import type { TicketTier, UserRoles } from "@/lib/accessRules";

type RoleSpacesProps = {
  roles: UserRoles;
  ticketTier: TicketTier | null;
};

type SpaceCard = {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  /** Acento visual del tier de boleta (VIP/Black); el resto usa el estilo neutro. */
  tier?: "vip" | "black";
};

/** Clases del círculo de icono. Los tiers usan el degradado metálico oficial. */
const ICON_STYLES: Record<"default" | "vip" | "black", string> = {
  default: "border border-brand-lav/50 bg-brand-lav/30 text-brand-white",
  vip: "tier-vip-bg border-transparent text-black",
  black: "tier-black-bg border-transparent text-black",
};

/**
 * "Tus espacios" — accesos rápidos según el rol activo del usuario
 * (expositor, ponente, patrocinador, equipo Effix) y su tier de boleta
 * (beneficios VIP/Black). Fase 28. Si no aplica ningún rol, no renderiza nada.
 */
export default function RoleSpaces({ roles, ticketTier }: RoleSpacesProps) {
  const cards: SpaceCard[] = [];

  if (roles.isExhibitor) {
    cards.push({
      href: "/mi-stand",
      icon: Store,
      label: "Mi stand",
      sub: "Portal del expositor",
    });
  }
  if (roles.isSpeaker) {
    cards.push({
      href: "/mi-charla",
      icon: Mic,
      label: "Mi charla",
      sub: "Portal del ponente",
    });
  }
  if (roles.isSponsor) {
    cards.push({
      href: "/mi-patrocinio",
      icon: Handshake,
      label: "Mi patrocinio",
      sub: "Portal del patrocinador",
    });
  }
  if (roles.isStaff) {
    cards.push({
      href: "/staff",
      icon: ShieldCheck,
      label: "Staff Effix",
      sub: "Equipo interno",
    });
  }
  if (ticketTier === "vip") {
    cards.push({
      href: "/beneficios",
      icon: Crown,
      label: "Beneficios VIP",
      sub: "Tus ventajas de boleta",
      tier: "vip",
    });
  }
  if (ticketTier === "black") {
    cards.push({
      href: "/beneficios",
      icon: Crown,
      label: "Beneficios Black",
      sub: "Tus ventajas de boleta",
      tier: "black",
    });
  }

  if (cards.length === 0) return null;

  return (
    <>
      <p className="text-caption mb-3 text-brand-dim">Tus espacios</p>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard
            key={c.href + c.label}
            href={c.href}
            className="flex min-h-[104px] flex-col justify-between gap-2 px-4 py-4"
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                ICON_STYLES[c.tier ?? "default"],
              )}
            >
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[13px] font-extrabold leading-tight text-brand-white">
                {c.label}
              </span>
              <span className="block text-[10.5px] font-medium text-brand-dim">
                {c.sub}
              </span>
            </span>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
