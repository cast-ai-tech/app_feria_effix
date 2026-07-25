"use client";

import { useState } from "react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

/** NPS del evento (0-10 + comentario), una respuesta por edición. */
export default function NpsClient({
  edition,
  initialScore,
  initialComment,
}: {
  edition: number;
  initialScore: number | null;
  initialComment: string;
}) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(initialScore !== null);
  const [error, setError] = useState<string | null>(null);

  async function submit(n: number) {
    setScore(n);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Inicia sesión para responder.");
      return;
    }
    const { error } = await supabase.from("nps_responses").upsert(
      {
        user_id: user.id,
        edition,
        score: n,
        comment: comment.trim() || null,
      },
      { onConflict: "user_id,edition" },
    );
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <GlassCard sheen className="flex flex-col gap-4 p-6">
      <p className="text-center text-[13px] font-extrabold leading-snug text-brand-white">
        ¿Qué tan probable es que recomiendes Feria Effix a un colega o amigo?
      </p>

      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => submit(n)}
            className={cn(
              "rounded-[10px] border py-2.5 text-[13px] font-black transition-transform active:scale-95 disabled:opacity-50",
              score === n
                ? "border-white bg-brand-white text-black"
                : "border-white/20 text-brand-white",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-bold text-brand-muted">
        <span>0 · Nada probable</span>
        <span>10 · Totalmente</span>
      </div>

      {done && (
        <p className="text-center text-[10.5px] font-semibold text-emerald-300">
          ¡Gracias por tu respuesta!
        </p>
      )}

      <TextAreaField
        label="¿Por qué? (opcional)"
        name="comment"
        value={comment}
        onChange={setComment}
        placeholder="Cuéntanos qué mejorarías o qué te encantó…"
      />
      {score !== null && (
        <Button
          variant="ghost"
          fullWidth
          disabled={busy}
          onClick={() => submit(score)}
        >
          {busy ? "Guardando…" : "Guardar comentario"}
        </Button>
      )}

      {error && (
        <p className="text-center text-[10px] font-semibold text-red-300">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
