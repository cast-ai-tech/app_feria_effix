import type { LucideIcon } from "lucide-react";
import {
  Bath,
  Crown,
  Handshake,
  Mic,
  ShoppingBag,
  Store,
  Ticket,
  TreePalm,
} from "lucide-react";
import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import SectionTitle from "@/components/SectionTitle";
import PlanimetriaViewer from "@/components/mapa/PlanimetriaViewer";
import { cn } from "@/lib/cn";

/**
 * Módulo Mapa — planimetría OFICIAL 2026 + zonas del plano real.
 *
 * Decisión de diseño: las zonas se definen como un arreglo estático aquí
 * (NO se usa base de datos). El contenido es fijo por edición y no requiere
 * edición desde admin todavía, así que un arreglo es más simple que una tabla
 * `venue_zones` con RLS. Si en el futuro se quiere editar desde admin, se puede
 * migrar a Supabase sin cambiar esta interfaz `Zone`.
 *
 * Las zonas siguen la planimetría oficial 2026 del sitio: 4 zonas académicas
 * (auditorios por pabellón de color), pabellones de stands, Hall de
 * Exposiciones, zonas Black/VIP y plazoleta.
 */
type Zone = {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;
  /** Si tiene módulo propio en la app, se navega a él. */
  href?: string;
  /** Cuántas columnas ocupa en el plano (1 o 2). */
  span?: 1 | 2;
  /** Color del pabellón en la planimetría oficial (punto indicador). */
  dot?: string;
};

const ZONES: Zone[] = [
  {
    id: "registro",
    icon: Ticket,
    name: "Registro / Entrada",
    description: "Acceso principal · valida tu QR aquí",
    span: 2,
  },
  {
    id: "auditorio-effix",
    icon: Mic,
    name: "Auditorio Effix",
    description: "Zona académica · Pabellón Verde",
    href: "/agenda",
    span: 1,
    dot: "bg-green-500",
  },
  {
    id: "auditorio-ecommerce",
    icon: Mic,
    name: "Auditorio E-commerce",
    description: "Zona académica · Gran Salón",
    href: "/agenda",
    span: 1,
    dot: "bg-purple-500",
  },
  {
    id: "auditorio-marketing",
    icon: Mic,
    name: "Auditorio Marketing",
    description: "Zona académica · Pabellón Amarillo",
    href: "/agenda",
    span: 1,
    dot: "bg-yellow-400",
  },
  {
    id: "auditorio-creadores",
    icon: Mic,
    name: "Auditorio Creadores",
    description: "Creadores de contenido · Pabellón Rojo",
    href: "/agenda",
    span: 1,
    dot: "bg-red-500",
  },
  {
    id: "stands",
    icon: Store,
    name: "Zona de Stands",
    description: "Pabellones Azul y Blanco · directorio de expositores",
    href: "/stands",
    span: 2,
    dot: "bg-blue-500",
  },
  {
    id: "hall",
    icon: ShoppingBag,
    name: "Hall de Exposiciones",
    description: "Muestra comercial y activaciones",
    span: 1,
  },
  {
    id: "black-vip",
    icon: Crown,
    name: "Zonas Black y VIP",
    description: "Accesos preferenciales por pabellón",
    span: 1,
    dot: "tier-vip-bg",
  },
  {
    id: "alianzas",
    icon: Handshake,
    name: "Zona de Alianzas",
    description: "Aliados y patrocinadores",
    href: "/alianzas",
    span: 1,
  },
  {
    id: "plazoleta",
    icon: TreePalm,
    name: "Plazoleta",
    description: "Zona de comida y descanso",
    span: 1,
  },
  {
    id: "banos",
    icon: Bath,
    name: "Baños",
    description: "En cada pabellón (ver planimetría)",
    span: 2,
  },
];

/** Celda del plano visual (cuadrícula estilizada). */
function MapCell({ zone }: { zone: Zone }) {
  const navigable = !!zone.href;
  return (
    <GlassCard
      href={zone.href}
      className={cn(
        "flex flex-col justify-between gap-3 border-dashed border-white/20 p-3.5",
        zone.span === 2 && "col-span-2",
        navigable && "hover:border-brand-lav/70",
      )}
    >
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1.5">
          <zone.icon className="h-[22px] w-[22px] text-brand-white" aria-hidden />
          {zone.dot && (
            <span
              className={cn("h-2 w-2 rounded-full", zone.dot)}
              aria-hidden
            />
          )}
        </span>
        <span className="text-[11px] text-brand-dim">{navigable ? "→" : "•"}</span>
      </div>
      <div className="text-[11.5px] font-extrabold leading-tight text-brand-white">
        {zone.name}
      </div>
    </GlassCard>
  );
}

export default function VenueMap({ dateRange }: { dateRange: string }) {
  return (
    <div className="flex flex-col">
      <div className="mb-1">
        <Badge>Planimetría oficial 2026</Badge>
      </div>

      <PlanimetriaViewer />

      <SectionTitle>Zonas del recinto</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {ZONES.map((z) => (
          <MapCell key={z.id} zone={z} />
        ))}
      </div>

      <SectionTitle>Detalle de zonas</SectionTitle>
      <GlassCard className="flex flex-col divide-y divide-white/[0.06] p-2">
        {ZONES.map((z) => (
          <ListItem
            key={z.id}
            thumb={<z.icon className="h-[18px] w-[18px] text-brand-white" aria-hidden />}
            title={z.name}
            subtitle={z.description}
            href={z.href}
            right={
              z.href ? (
                <span className="text-[13px] text-brand-dim">→</span>
              ) : (
                <span className="text-[10px] font-bold text-brand-dim">Aquí</span>
              )
            }
          />
        ))}
      </GlassCard>

      <p className="mt-4 text-center text-[10px] font-medium leading-relaxed text-brand-muted">
        Recinto: Plaza Mayor, Medellín · {dateRange}.
        <br />
        Planimetría oficial de la organización — sujeta a ajustes.
      </p>
    </div>
  );
}
