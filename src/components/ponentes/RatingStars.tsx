"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/ponentes/Stars";
import { createClient } from "@/lib/supabase/client";

/**
 * Bloque de calificación por estrellas.
 * - Si la charla AÚN no ocurre (`canRate` = false) muestra el promedio en
 *   solo lectura y el aviso "podrás calificar después de la charla".
 * - Si ya ocurrió, permite fijar/actualizar la calificación del usuario
 *   (upsert en speaker_ratings, único por (speaker_id, user_id)).
 */
export default function RatingStars({
  speakerId,
  canRate,
  average,
  count,
  userStars,
}: {
  speakerId: string;
  canRate: boolean;
  average: number;
  count: number;
  userStars: number | null;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<number | null>(userStars);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rate(stars: number) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Inicia sesión para calificar.");
      return;
    }
    const { error } = await supabase
      .from("speaker_ratings")
      .upsert(
        { speaker_id: speakerId, user_id: user.id, stars },
        { onConflict: "speaker_id,user_id" },
      );
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMine(stars);
    router.refresh();
  }

  if (!canRate) {
    return (
      <div className="flex flex-col gap-1.5">
        <Stars value={average} count={count} />
        <p className="text-[10px] text-brand-muted">
          Podrás calificar después de la charla.
        </p>
      </div>
    );
  }

  const shown = hover ?? mine ?? 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1 text-[18px] leading-none"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              onMouseEnter={() => setHover(n)}
              onClick={() => rate(n)}
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
              className="transition-transform active:scale-90 disabled:opacity-50"
            >
              <span className={n <= shown ? "text-[#e6e4ee]" : "text-brand-dim"}>
                ★
              </span>
            </button>
          ))}
        </div>
        <Stars value={average} count={count} />
      </div>
      <p className="text-[10px] text-brand-muted">
        {mine
          ? `Tu calificación: ${mine} ★ · toca para cambiarla`
          : "Toca una estrella para calificar esta charla."}
        {error && <span className="text-red-300"> · {error}</span>}
      </p>
    </div>
  );
}
