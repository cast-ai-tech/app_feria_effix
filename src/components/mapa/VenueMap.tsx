import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import SectionTitle from "@/components/SectionTitle";
import { cn } from "@/lib/cn";

/**
 * Módulo Mapa (Fase 5) — plano simplificado del recinto Plaza Mayor.
 *
 * Decisión de diseño: las zonas se definen como un arreglo estático aquí
 * (NO se usa base de datos). El contenido es fijo por edición y no requiere
 * edición desde admin todavía, así que un arreglo es más simple que una tabla
 * `venue_zones` con RLS. Si en el futuro se quiere editar desde admin, se puede
 * migrar a Supabase sin cambiar esta interfaz `Zone`.
 *
 * NOTA: este es un plano por zonas (tarjetas/lista), NO un mapa geográfico real.
 * El mapa GPS con coordenadas reales queda como mejora futura.
 */
type Zone = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  /** Si tiene módulo propio en la app, se navega a él. */
  href?: string;
  /** Cuántas columnas ocupa en el plano (1 o 2). */
  span?: 1 | 2;
};

const ZONES: Zone[] = [
  {
    id: "registro",
    emoji: "🎟️",
    name: "Registro / Entrada",
    description: "Acceso principal · valida tu QR aquí",
    span: 2,
  },
  {
    id: "auditorios",
    emoji: "🎤",
    name: "Auditorios",
    description: "Charlas y paneles en vivo · Auditorios 1, 2 y 3",
    href: "/agenda",
    span: 2,
  },
  {
    id: "stands",
    emoji: "🏬",
    name: "Zona de Stands",
    description: "Directorio de expositores",
    href: "/stands",
    span: 1,
  },
  {
    id: "alianzas",
    emoji: "🤝",
    name: "Zona de Alianzas",
    description: "Aliados y patrocinadores",
    href: "/alianzas",
    span: 1,
  },
  {
    id: "comida",
    emoji: "🍽️",
    name: "Zona de comida",
    description: "Food trucks y cafetería",
    span: 1,
  },
  {
    id: "banos",
    emoji: "🚻",
    name: "Baños",
    description: "Ala Norte y Ala Sur",
    span: 1,
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
        <span className="text-[22px] leading-none">{zone.emoji}</span>
        <span className="text-[11px] text-brand-dim">{navigable ? "→" : "•"}</span>
      </div>
      <div className="text-[11.5px] font-extrabold leading-tight text-brand-white">
        {zone.name}
      </div>
    </GlassCard>
  );
}

export default function VenueMap() {
  return (
    <div className="flex flex-col">
      <div className="mb-1">
        <Badge>🛰️ Mapa GPS con coordenadas reales · próximamente</Badge>
      </div>

      <SectionTitle>Plano del recinto</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {ZONES.map((z) => (
          <MapCell key={z.id} zone={z} />
        ))}
      </div>

      <SectionTitle>Zonas</SectionTitle>
      <GlassCard className="flex flex-col divide-y divide-white/[0.06] p-2">
        {ZONES.map((z) => (
          <ListItem
            key={z.id}
            thumb={z.emoji}
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
        Recinto: Plaza Mayor, Medellín · 16–18 de octubre, 2026.
        <br />
        Este es un plano simplificado por zonas, no a escala.
      </p>
    </div>
  );
}
