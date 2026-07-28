"use client";

import { CircleCheck, Play } from "lucide-react";

import { useState, useTransition } from "react";
import GlassCard from "@/components/GlassCard";
import YoutubePlayer from "@/components/academia/YoutubePlayer";
import { useMiniPlayer } from "@/components/player/MiniPlayerProvider";
import { createClient } from "@/lib/supabase/client";
import { parseYoutubeId } from "@/lib/youtube";
import { cn } from "@/lib/cn";

/**
 * Card de una grabación de Academia (Fase 20) — compartido entre la vista
 * completa (alumni) y el teaser del anillo gratis.
 *
 * El video se abre en el mini-player global (Fase 27, MiniPlayerProvider),
 * que es dueño único del progreso (seconds/duration/completed) — esta tarjeta
 * solo lee el estado ya calculado por el servidor y hace overrides
 * OPTIMISTAS locales para calificar/marcar visto (sin router.refresh: el
 * mini-player vive en el layout raíz y un refresh interrumpiría cualquier
 * video sonando en otra sección de la app).
 */
export type RecordingView = {
  id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  video_url: string | null;
  edition: number;
  /** Promedio de estrellas (vista recording_rating_stats; 0 = sin votos). */
  avg: number;
  /** Número de calificaciones. */
  count: number;
  /** Estrellas del usuario actual (0 = aún no califica). */
  myStars: number;
  /** Ya abrió el video alguna vez. */
  opened: boolean;
  /** La marcó como vista. */
  completed: boolean;
  /** Segundo donde quedó la última vez (resume). */
  initialSeconds: number;
  /** Duración conocida del video en segundos (0 = desconocida). */
  durationSeconds: number;
};

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
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [myStarsOverride, setMyStarsOverride] = useState<number | null>(null);
  const effectiveStars = myStarsOverride ?? myStars;

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
      const { error } = await supabase
        .from("recording_ratings")
        .upsert(
          { recording_id: recordingId, user_id: user.id, stars },
          { onConflict: "recording_id,user_id" },
        );
      if (error) {
        setError(error.message);
        return;
      }
      // Sin router.refresh(): estado optimista local (ver comentario de arriba).
      setMyStarsOverride(stars);
    });
  }

  const shown = hover || effectiveStars;

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
              aria-pressed={effectiveStars === n}
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
      {effectiveStars > 0 && !error && (
        <span className="text-[9px] text-brand-dim">
          Tu calificación: {effectiveStars}/5 · toca para cambiarla
        </span>
      )}
      {error && <span className="text-[9px] text-red-300">{error}</span>}
    </div>
  );
}

export default function RecordingCard({
  recording,
}: {
  recording: RecordingView;
}) {
  const { open } = useMiniPlayer();
  const [marking, setMarking] = useState(false);
  const [completedOverride, setCompletedOverride] = useState<boolean | null>(
    null,
  );
  const r = recording;
  const completed = completedOverride ?? r.completed;

  /** Registra la apertura de un video NO-YouTube (pestaña externa). */
  function registerExternalOpen() {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      void supabase
        .from("watch_progress")
        .upsert(
          { user_id: user.id, recording_id: r.id },
          { onConflict: "user_id,recording_id", ignoreDuplicates: true },
        );
    });
  }

  async function toggleCompleted() {
    setMarking(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const next = !completed;
      const { error } = await supabase
        .from("watch_progress")
        .upsert(
          { user_id: user.id, recording_id: r.id, completed: next },
          { onConflict: "user_id,recording_id" },
        );
      // Sin router.refresh(): estado optimista local (ver comentario de arriba).
      if (!error) setCompletedOverride(next);
    }
    setMarking(false);
  }

  const youtubeId = parseYoutubeId(r.video_url);

  return (
    <GlassCard className="flex flex-col gap-3 p-4">
      {/* Abre el mini-player global (Fase 27) en vez de un iframe inline. */}
      {youtubeId && (
        <YoutubePlayer
          videoId={youtubeId}
          title={r.title}
          onOpen={() =>
            open({
              recordingId: r.id,
              videoId: youtubeId,
              title: r.title,
              speakerName: r.speaker_name,
              initialSeconds: r.initialSeconds,
              durationSeconds: r.durationSeconds,
            })
          }
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand-lav to-[#23222b] text-[16px]">
          {completed ? (
            <CircleCheck className="h-5 w-5 text-emerald-300" aria-hidden />
          ) : (
            <Play className="h-5 w-5 text-brand-white" aria-hidden />
          )}
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
        /* Lectura larga → tarjeta blanca con texto #263164 (patrón del
           sitio, Fase 23). */
        <div className="card-light px-4 py-3">
          <p className="text-[10.5px] leading-relaxed">{r.description}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <StarRating
          recordingId={r.id}
          myStars={r.myStars}
          avg={r.avg}
          count={r.count}
        />
        {r.video_url && !youtubeId && (
          /* Solo videos NO-YouTube salen a una pestaña externa. */
          <a
            href={r.video_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={registerExternalOpen}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-full border border-white/35 bg-transparent px-[13px] py-[7px] text-[10px] font-extrabold text-brand-white transition-transform active:scale-95"
          >
            {r.opened && !completed ? "Continuar →" : "Ver video →"}
          </a>
        )}
      </div>

      {r.opened && (
        <button
          onClick={toggleCompleted}
          disabled={marking}
          className={cn(
            "self-start rounded-full border px-3 py-1 text-[9.5px] font-bold",
            completed
              ? "border-emerald-400/40 text-emerald-300"
              : "border-white/25 text-brand-dim",
          )}
        >
          {marking
            ? "Guardando…"
            : completed
              ? "Vista ✓ · toca para desmarcar"
              : "Marcar como vista"}
        </button>
      )}
    </GlassCard>
  );
}
