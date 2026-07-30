import { redirect } from "next/navigation";
import {
  CalendarClock,
  Handshake,
  MapPin,
  QrCode,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import { getAccess } from "@/lib/access";
import { formatEditionRange } from "@/lib/editions";

type StaffRole = "staff" | "logistica" | "comercial" | "acreditacion";

const ROLE_LABEL: Record<StaffRole, string> = {
  staff: "Staff",
  logistica: "Logística",
  comercial: "Comercial",
  acreditacion: "Acreditación",
};

type QuickCard = { href: string; icon: LucideIcon; label: string; sub: string };

/**
 * PANEL DEL EQUIPO EFFIX (Fase 28) — anillo interno: solo `team_members` o
 * admin. Los accesos rápidos dependen del rol operativo; el rol genérico
 * "staff" (sin especialidad) y el admin ven todos los accesos.
 */
export default async function StaffPage() {
  const a = await getAccess();

  if (!a.user) redirect("/ingresar");

  if (!a.roles.isStaff && !a.isAdmin) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Equipo Effix" backHref="/" />
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Este espacio es para el equipo Effix
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            Si trabajas en la organización de la feria, pídele a un admin que te
            agregue al equipo interno para ver tus accesos rápidos aquí.
          </p>
        </GlassCard>
      </div>
    );
  }

  const staffRole = (a.roles.staffRole as StaffRole | null) ?? "staff";
  const roleLabel = a.isAdmin ? "Admin" : (ROLE_LABEL[staffRole] ?? "Staff");
  // El rol genérico "staff" (sin especialidad) y el admin ven todos los accesos.
  const showAll = a.isAdmin || staffRole === "staff";

  const cards: QuickCard[] = [];
  if (showAll || staffRole === "acreditacion") {
    cards.push({
      href: "/credencial",
      icon: QrCode,
      label: "Escanear credenciales",
      sub: "Modo stand: sella y valida asistentes",
    });
    if (a.isAdmin) {
      cards.push({
        href: "/admin/evento",
        icon: ShieldCheck,
        label: "Día del evento",
        sub: "Panel en vivo del admin",
      });
    }
  }
  if (showAll || staffRole === "comercial") {
    cards.push(
      {
        href: "/stands",
        icon: Store,
        label: "Stands",
        sub: "Directorio de expositores",
      },
      {
        href: "/alianzas",
        icon: Handshake,
        label: "Alianzas",
        sub: "Marketplace de patrocinios",
      },
    );
  }
  if (showAll || staffRole === "logistica") {
    cards.push(
      { href: "/mapa", icon: MapPin, label: "Mapa", sub: "Plano del recinto" },
      {
        href: "/agenda",
        icon: CalendarClock,
        label: "Agenda",
        sub: "Programación en vivo",
      },
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Equipo Effix"
        subtitle={`Panel interno · ${a.edition.name} · ${formatEditionRange(a.edition)}`}
        backHref="/"
      />
      <div className="mb-5">
        <Badge dot>{roleLabel}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard
            key={c.href + c.label}
            href={c.href}
            className="flex min-h-[104px] flex-col justify-between gap-2 px-4 py-4"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-lav/50 bg-brand-lav/30">
              <c.icon className="h-5 w-5 text-brand-white" aria-hidden />
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
    </div>
  );
}
