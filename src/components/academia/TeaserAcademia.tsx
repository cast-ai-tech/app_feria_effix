"use client";

import { Gift, GraduationCap } from "lucide-react";

import Link from "next/link";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import RecordingCard, {
  type RecordingView,
} from "@/components/academia/RecordingCard";

/**
 * Teaser de Academia (Fase 20) — anillo GRATIS (registrado sin boleta).
 * Muestra las charlas marcadas is_free y convierte con CTA a boleta.
 */
export default function TeaserAcademia({
  recordings,
}: {
  recordings: RecordingView[];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-center">
        <Badge><Gift className="mr-1 inline h-3 w-3" aria-hidden />Contenido abierto</Badge>
      </div>

      <SectionTitle>Charlas destacadas gratis</SectionTitle>
      <p className="-mt-1 mb-2 text-[10.5px] leading-relaxed text-brand-muted">
        Una probada de Academia: el repositorio de ponencias que los asistentes
        con boleta conservan DE POR VIDA.
      </p>

      {recordings.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" aria-hidden />}
          title="Pronto habrá contenido abierto"
          subtitle="Estamos preparando charlas destacadas gratuitas. Vuelve pronto."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2">
          {recordings.map((r) => (
            <RecordingCard key={r.id} recording={r} />
          ))}
        </div>
      )}

      <GlassCard sheen className="mt-4 flex flex-col items-center gap-2 p-5 text-center">
        <p className="text-[13px] font-black text-brand-white">
          ¿Te gustó? Esto es solo el inicio.
        </p>
        <p className="text-[10.5px] leading-relaxed text-brand-muted">
          Con tu boleta accedes a TODAS las ponencias de todas las ediciones,
          para siempre. Alumni una vez, alumni de por vida.
        </p>
        <Link
          href="/tickets"
          className="mt-1 inline-flex items-center justify-center rounded-full bg-brand-white px-5 py-3 text-[12px] font-extrabold text-black transition-transform active:scale-95"
        >
          Consigue tu boleta →
        </Link>
      </GlassCard>
    </div>
  );
}
