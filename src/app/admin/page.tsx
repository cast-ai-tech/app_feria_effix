import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  ChartColumn,
  GraduationCap,
  Handshake,
  Image,
  Megaphone,
  Mic,
  Radio,
  Settings,
  Stamp,
  Store,
  Ticket,
  UsersRound,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import PageHeader from "@/components/PageHeader";

/**
 * Panel admin consolidado (Fase 11): todas las secciones de gestión interna
 * en un solo lugar, separado de la experiencia del asistente y protegido por
 * rol admin (ver src/app/admin/layout.tsx).
 */
const SECTIONS: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  sub: string;
}> = [
  {
    href: "/admin/evento",
    icon: ChartColumn,
    title: "Día del evento",
    sub: "Dashboard en vivo: conexiones, sellos, sesiones y push",
  },
  {
    href: "/admin/tickets",
    icon: Ticket,
    title: "Escarapelas",
    sub: "Importar CSV, Black y transferencias de titular",
  },
  {
    href: "/admin/agenda",
    icon: CalendarClock,
    title: "Agenda",
    sub: "Charlas, auditorios y horarios",
  },
  {
    href: "/admin/stands",
    icon: Store,
    title: "Stands",
    sub: "Directorio de expositores y solicitudes de cita",
  },
  {
    href: "/admin/ponentes",
    icon: Mic,
    title: "Ponentes",
    sub: "Perfiles, charlas y vinculación de cuenta por edición",
  },
  {
    href: "/admin/patrocinadores",
    icon: Megaphone,
    title: "Patrocinadores",
    sub: "Sponsors, staff autorizado y banners vinculados",
  },
  {
    href: "/admin/equipo",
    icon: UsersRound,
    title: "Equipo",
    sub: "Equipo interno Effix: staff, logística, comercial, acreditación",
  },
  {
    href: "/admin/academia",
    icon: GraduationCap,
    title: "Academia",
    sub: "Pipeline de publicación, colecciones y teaser",
  },
  {
    href: "/admin/alianzas",
    icon: Handshake,
    title: "Alianzas",
    sub: "Ofertas del marketplace y links de referido",
  },
  {
    href: "/admin/pasaporte",
    icon: Stamp,
    title: "Pasaporte",
    sub: "Campañas de sellos, completados y tráfico por stand",
  },
  {
    href: "/admin/qa",
    icon: Radio,
    title: "Q&A y encuestas",
    sub: "Moderación en vivo, votaciones y NPS",
  },
  {
    href: "/admin/notificaciones",
    icon: Bell,
    title: "Notificaciones",
    sub: "Push segmentado y centro de avisos",
  },
  {
    href: "/admin/banners",
    icon: Image,
    title: "Banners",
    sub: "Espacios de patrocinio con métricas e impresiones",
  },
  {
    href: "/admin/config",
    icon: Settings,
    title: "Configuración",
    sub: "WhatsApp Black, reembolsos y parámetros operativos",
  },
];

export default function AdminHome() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Panel admin"
        subtitle="Gestión interna de Feria Effix"
        backHref="/"
      />
      <GlassCard className="flex flex-col divide-y divide-white/[0.06] p-2">
        {SECTIONS.map((s) => (
          <ListItem
            key={s.href}
            href={s.href}
            thumb={
              <s.icon
                className="h-[18px] w-[18px] text-brand-white"
                aria-hidden
              />
            }
            title={s.title}
            subtitle={s.sub}
            right={<span className="text-brand-muted">›</span>}
          />
        ))}
      </GlassCard>
    </div>
  );
}
