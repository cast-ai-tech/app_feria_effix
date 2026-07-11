import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import PageHeader from "@/components/PageHeader";

/**
 * Panel admin consolidado (Fase 11): todas las secciones de gestión interna
 * en un solo lugar, separado de la experiencia del asistente y protegido por
 * rol admin (ver src/app/admin/layout.tsx).
 */
const SECTIONS = [
  { href: "/admin/tickets", icon: "🎟️", title: "Boletas", sub: "Importar CSV, Black, reembolsos y transferencias" },
  { href: "/admin/agenda", icon: "🕐", title: "Agenda", sub: "Charlas, auditorios y horarios" },
  { href: "/admin/stands", icon: "🏬", title: "Stands", sub: "Directorio de expositores y solicitudes de cita" },
  { href: "/admin/ponentes", icon: "🎤", title: "Ponentes", sub: "Perfiles y charlas por edición" },
  { href: "/admin/academia", icon: "🎓", title: "Academia", sub: "Grabaciones y aprobación para publicar" },
  { href: "/admin/alianzas", icon: "🤝", title: "Alianzas", sub: "Ofertas del marketplace y links de referido" },
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
            thumb={s.icon}
            title={s.title}
            subtitle={s.sub}
            right={<span className="text-brand-muted">›</span>}
          />
        ))}
      </GlassCard>
    </div>
  );
}
