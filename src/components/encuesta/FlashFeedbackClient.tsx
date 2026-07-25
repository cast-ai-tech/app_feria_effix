"use client";

import { useState } from "react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

/**
 * Encuesta flash post-charla (Fase 18): 1 tap de estrellas + comentario
 * opcional. Alimenta el filtro de calidad de Academia.
 */
export default function FlashFeedbackClient({
  talkId,
  initialStars,
  initialComment,
}: {
  talkId: string;
  initialStars: number;
  initialComment: string;
}) {
  const [stars, setStars] = useState(initialStars);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(initialStars > 0);
  const [error, setError] = useState<string | null>(null);

  async function submit(n: number) {
    setStars(n);
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
    const { error } = await supabase.from("talk_feedback").upsert(
      {
        talk_id: talkId,
        user_id: user.id,
        stars: n,
        comment: comment.trim() || null,
      },
      { onConflict: "talk_id,user_id" },
    );
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <GlassCard sheen className="flex flex-col items-center gap-4 p-6 text-center">
      <p className="text-[13px] font-extrabold text-brand-white">
        ¿Qué te pareció la charla?
      </p>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => submit(n)}
            className={cn(
              "text-[30px] leading-none transition-transform active:scale-90 disabled:opacity-50",
              n <= stars ? "text-brand-white" : "text-brand-dim/40",
            )}
          >
            {n <= stars ? "★" : "☆"}
          </button>
        ))}
      </div>

      {done && (
        <p className="text-[10.5px] font-semibold text-emerald-300">
          ¡Gracias! Puedes cambiar tu calificación tocando otra estrella.
        </p>
      )}

      <div className="w-full">
        <TextAreaField
          label="Comentario (opcional)"
          name="comment"
          value={comment}
          onChange={setComment}
          placeholder="¿Qué destacarías o mejorarías?"
        />
      </div>
      {stars > 0 && (
        <Button
          variant="ghost"
          fullWidth
          disabled={busy}
          onClick={() => submit(stars)}
        >
          {busy ? "Guardando…" : "Guardar comentario"}
        </Button>
      )}

      {error && (
        <p className="text-[10px] font-semibold text-red-300">{error}</p>
      )}
    </GlassCard>
  );
}
