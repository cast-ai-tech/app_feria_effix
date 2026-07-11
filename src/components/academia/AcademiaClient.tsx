"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export type Recording = {
  id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  video_url: string | null;
  edition: number;
  /** Promedio de estrellas (0 si nadie ha calificado). */
  avg: number;
  /** Número de calificaciones. */
  count: number;
  /** Estrellas que dio el usuario actual (0 = aún no ha calificado). */
  myStars: number;
};

const EDITIONS = [2026, 2025, 2024] as const;

/** Fila de estrellas interactiva — calificación 1-5 del usuario. */
function StarRating({
  recordingId,
  myStars,
  avg,
  count,
}: {
  recordingId: string;
  myStars: number;
  avg: number;
  count: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function rate(stars: number) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Inicia sesión para calificar.");
        return;
      }
      const { error } = await supabase.from("recording_ratings").upsert(
        { recording_id: recordingId, user_id: user.id, stars },
        { onConflict: "recording_id,user_id" },
      );
      if (error) {
        setError(error.message);
        return;
      }
      router.refresh();
    });
  }

  const shown = hover || myStars;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              aria-label={`Calificar con ${n} ${n === 1 ? "estrella" : "estrellas"}`}
              aria-pressed={myStars === n}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => rate(n)}
              className={cn(
                "text-[15px] leading-none transition-transform active:scale-90 disabled:opacity-50",
                n <= shown ? "text-brand-white" : "text-brand-dim/40",
              )}
            >
              {n <= shown ? "★" : "☆"}
            </button>
          ))}
        </div>
        <span className="text-[9.5px] font-medium text-brand-muted">
          {count > 0
            ? `${avg.toFixed(1)} · ${count} ${count === 1 ? "voto" : "votos"}`
            : "Sé el primero en calificar"}
        </span>
      </div>
      {myStars > 0 && !error && (
        <span className="text-[9px] text-brand-dim">
          Tu calificación: {myStars}/5 · toca para cambiarla
        </span>
      )}
      {error && <span className="text-[9px] text-red-300">{error}</span>}
    </div>
  );
}

export default function AcademiaClient({
  recordings,
}: {
  recordings: Recording[];
}) {
  const [edition, setEdition] = useState<number>(EDITIONS[0]);

  const shown = useMemo(
    () => recordings.filter((r) => r.edition === edition),
    [recordings, edition],
  );

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-center">
        <Badge>🔓 Acceso permanente</Badge>
      </div>

      {/* Chips de edición */}
      <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {EDITIONS.map((e) => (
          <FilterChip
            key={e}
            active={edition === e}
            onClick={() => setEdition(e)}
          >
            {e}
          </FilterChip>
        ))}
      </div>

      <SectionTitle>
        Ponencias {edition} ({shown.length})
      </SectionTitle>

      {shown.length === 0 ? (
        <div className="mt-1">
          <EmptyState
            icon="🎓"
            title={`Sin grabaciones de ${edition}`}
            subtitle="Aún no hay ponencias publicadas para esta edición. Vuelve pronto: seguimos subiendo contenido."
          />
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-2.5">
          {shown.map((r) => (
            <GlassCard key={r.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand-lav to-[#23222b] text-[16px]">
                  ▶️
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold leading-snug text-brand-white">
                    {r.title}
                  </p>
                  {r.speaker_name && (
                    <p className="mt-0.5 text-[10.5px] font-medium text-brand-muted">
                      {r.speaker_name}
                    </p>
                  )}
                </div>
              </div>

              {r.description && (
                <p className="text-[10.5px] leading-relaxed text-brand-muted">
                  {r.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-3">
                <StarRating
                  recordingId={r.id}
                  myStars={r.myStars}
                  avg={r.avg}
                  count={r.count}
                />
                {r.video_url && (
                  <a
                    href={r.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center justify-center rounded-full border border-white/35 bg-transparent px-[13px] py-[7px] text-[10px] font-extrabold text-brand-white transition-transform active:scale-95"
                  >
                    Ver video →
                  </a>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
