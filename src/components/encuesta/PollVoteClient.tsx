"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

/**
 * Voto del asistente en una votación en vivo (Fase 18).
 * Un voto por usuario; puede cambiarlo mientras la votación esté activa.
 * Los resultados en grande se ven en el proyector del auditorio.
 */
export default function PollVoteClient({
  pollId,
  question,
  options,
  initialActive,
  initialMyVote,
}: {
  pollId: string;
  question: string;
  options: string[];
  initialActive: boolean;
  initialMyVote: number | null;
}) {
  const [active, setActive] = useState(initialActive);
  const [myVote, setMyVote] = useState<number | null>(initialMyVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el admin apaga la votación, se bloquea en vivo.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`poll-vote-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_polls",
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          setActive((payload.new as { active: boolean }).active);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pollId]);

  async function vote(idx: number) {
    if (!active || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Inicia sesión para votar.");
      return;
    }
    const { error } = await supabase.from("poll_votes").upsert(
      { poll_id: pollId, user_id: user.id, option_idx: idx },
      { onConflict: "poll_id,user_id" },
    );
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMyVote(idx);
  }

  return (
    <GlassCard sheen className="flex flex-col gap-4 p-6">
      <p className="text-center text-[14px] font-black leading-snug text-brand-white">
        {question}
      </p>

      {!active && (
        <p className="text-center text-[10.5px] font-semibold text-amber-300">
          Esta votación ya cerró — mira los resultados en pantalla.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!active || busy}
            onClick={() => vote(idx)}
            className={cn(
              "rounded-[14px] border px-4 py-3 text-left text-[12.5px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60",
              myVote === idx
                ? "border-white bg-brand-white text-black"
                : "border-white/20 text-brand-white",
            )}
          >
            {myVote === idx ? "✓ " : ""}
            {opt}
          </button>
        ))}
      </div>

      {myVote !== null && active && (
        <p className="text-center text-[10px] font-semibold text-emerald-300">
          Voto registrado ✓ — puedes cambiarlo mientras siga abierta.
        </p>
      )}
      {error && (
        <p className="text-center text-[10px] font-semibold text-red-300">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
