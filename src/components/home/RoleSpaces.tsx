import {
  Handshake,
  Mic,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import type { UserRoles } from "@/lib/accessRules";

type RoleSpacesProps = {
  roles: UserRoles;
};

type SpaceCard = {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
};

/**
 * "Tus espacios" — accesos rápidos según el rol activo del usuario
 * (expositor, ponente, patrocinador, equipo Effix). Fase 28; en Fase 30 la
 * insignia del tier de boleta se movió al header (HeaderTierBadge) y los
 * beneficios se abren desde el perfil, así que aquí solo quedan los roles.
 * Si no aplica ningún rol, no renderiza nada.
 */
export default function RoleSpaces({ roles }: RoleSpacesProps) {
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
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-lav/50 bg-brand-lav/30 text-brand-white">
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
