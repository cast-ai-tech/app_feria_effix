import { Building2, Globe, Megaphone } from "lucide-react";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import type { SponsorBannerMetrics, SponsorInfo } from "@/lib/sponsors";

/**
 * Portal del patrocinador (Fase 28) — render puro, sin interactividad:
 * tarjetas de sus marcas patrocinadoras + tabla de sus espacios
 * publicitarios con impresiones/clics/CTR. Server component.
 */

const TIER_LABEL: Record<SponsorInfo["tier"], string> = {
  basico: "Básico",
  plata: "Plata",
  oro: "Oro",
  diamante: "Diamante",
};

const TIER_RANK: Record<SponsorInfo["tier"], number> = {
  basico: 0,
  plata: 1,
  oro: 2,
  diamante: 3,
};

/** Mismas etiquetas en español que admin/banners (AdminBannersClient). */
const PLACEMENT_LABEL: Record<string, string> = {
  splash_sponsor: 'Splash al abrir — "Con el apoyo de" (logo)',
  home_hero: "Home — carrusel principal",
  home_inline: "Home — banner intermedio",
  module_top: "Módulo — banner superior",
  footer_strip: 'Franja "Patrocinan" (logos)',
};

const MODULE_LABEL: Record<string, string> = {
  agenda: "Agenda",
  stands: "Stands",
  ponentes: "Ponentes",
  academia: "Academia",
  alianzas: "Alianzas",
};

export default function MiPatrocinioClient({
  sponsors,
  metrics,
}: {
  sponsors: SponsorInfo[];
  metrics: SponsorBannerMetrics[];
}) {
  if (sponsors.length === 0) {
    return (
      <GlassCard className="p-5 text-center">
        <p className="text-[13px] font-extrabold text-brand-white">
          Tu cuenta no está vinculada a ningún patrocinador
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
          Este portal es para el equipo de las marcas patrocinadoras de la
          feria. Pídele al organizador que agregue tu correo como staff del
          patrocinador para ver aquí tus espacios y métricas.
        </p>
      </GlassCard>
    );
  }

  const ordered = [...sponsors].sort(
    (a, b) =>
      TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col">
      <SectionTitle>Tus marcas patrocinadoras ({sponsors.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {ordered.map((s) => {
          const destacado = s.tier === "diamante";
          return (
            <GlassCard
              key={s.id}
              sheen={destacado}
              className={`flex items-center gap-3 p-4 ${
                destacado ? "border-white/40" : ""
              }`}
            >
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="h-12 w-12 flex-shrink-0 rounded-[10px] border border-white/10 bg-white/5 object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-brand-lav/20">
                  <Building2 className="h-5 w-5 text-brand-lav" aria-hidden />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-brand-white">
                  {s.name}
                  {destacado && (
                    <span className="ml-2 text-[9px] font-bold text-brand-lav">
                      DESTACADO
                    </span>
                  )}
                </p>
                {s.website && (
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] font-medium text-brand-muted hover:text-brand-white"
                  >
                    <Globe className="h-3 w-3 flex-shrink-0" aria-hidden />
                    <span className="truncate">{s.website}</span>
                  </a>
                )}
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                <Badge>{TIER_LABEL[s.tier] ?? s.tier}</Badge>
                <Badge dot={s.active}>{s.active ? "Activo" : "Inactivo"}</Badge>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <SectionTitle>Tus espacios publicitarios ({metrics.length})</SectionTitle>
      {metrics.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-7 w-7 text-brand-lav" aria-hidden />}
          title="Aún no tienes espacios publicitarios"
          subtitle="Cuando el equipo de Effix active un banner para tu marca, aparecerá aquí con sus métricas en tiempo real."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {metrics.map((m) => (
            <GlassCard key={m.bannerId} className="flex flex-col gap-2 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-extrabold text-brand-white">
                    {m.title ?? PLACEMENT_LABEL[m.placement] ?? m.placement}
                  </p>
                  <p className="truncate text-[10px] text-brand-muted">
                    {PLACEMENT_LABEL[m.placement] ?? m.placement}
                    {m.moduleKey
                      ? ` · ${MODULE_LABEL[m.moduleKey] ?? m.moduleKey}`
                      : ""}
                  </p>
                </div>
                <Badge dot={m.active}>{m.active ? "Activo" : "Inactivo"}</Badge>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-brand-dim">
                <span>{m.impressions} impresiones</span>
                <span>{m.clicks} clics</span>
                <span className="text-brand-lav">
                  CTR {m.ctr.toFixed(1)}%
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
