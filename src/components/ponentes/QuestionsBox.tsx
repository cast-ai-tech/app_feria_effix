"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

export type Question = {
  id: string;
  text: string;
  /** 'pending' | 'approved' | 'answered' | 'discarded' */
  status: string;
  votes: number;
  /** Si el usuario actual ya votó esta pregunta. */
  myVote: boolean;
  /** Si la pregunta es del usuario actual (para mostrar sus pendientes). */
  mine: boolean;
};

/**
 * Q&A MODERADO (Fase 18). Las preguntas entran en 'pending' y solo se
 * muestran al público cuando el moderador las aprueba; las aprobadas se
 * pueden upvotear (1 voto por usuario) y suben en el proyector del
 * auditorio. Cada quien ve además sus propias preguntas en revisión.
 */
export default function QuestionsBox({
  speakerId,
  initialQuestions,
}: {
  speakerId: string;
  initialQuestions: Question[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Inicia sesión para preguntar.");
      return;
    }
    const { data, error } = await supabase
      .from("speaker_questions")
      .insert({ speaker_id: speakerId, user_id: user.id, text: value })
      .select("id,text,status")
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data)
      setQuestions((q) => [
        {
          id: data.id,
          text: data.text,
          status: data.status,
          votes: 0,
          myVote: false,
          mine: true,
        },
        ...q,
      ]);
    setText("");
    router.refresh();
  }

  async function toggleVote(q: Question) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Inicia sesión para votar.");
      return;
    }
    // Optimista.
    setQuestions((qs) =>
      qs.map((x) =>
        x.id === q.id
          ? { ...x, myVote: !q.myVote, votes: x.votes + (q.myVote ? -1 : 1) }
          : x,
      ),
    );
    if (q.myVote) {
      await supabase
        .from("question_votes")
        .delete()
        .eq("question_id", q.id)
        .eq("user_id", user.id);
    } else {
      const { error } = await supabase
        .from("question_votes")
        .insert({ question_id: q.id, user_id: user.id });
      if (error) {
        // Revertir el optimismo si la RLS lo rechazó.
        setQuestions((qs) =>
          qs.map((x) =>
            x.id === q.id ? { ...x, myVote: false, votes: q.votes } : x,
          ),
        );
      }
    }
  }

  const visible = questions
    .filter(
      (q) =>
        q.status === "approved" ||
        q.status === "answered" ||
        (q.mine && q.status === "pending"),
    )
    .sort((a, b) => b.votes - a.votes);

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Escribe tu pregunta para el ponente…"
          aria-label="Escribe tu pregunta para el ponente"
          className="w-full resize-none rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
        />
        <Button type="submit" variant="ghost" fullWidth disabled={busy || !text.trim()}>
          {busy ? "Enviando…" : "Enviar pregunta"}
        </Button>
        <p className="text-[9.5px] text-brand-muted">
          Tu pregunta pasa por moderación antes de aparecer en pantalla.
        </p>
        {error && <p className="text-[10px] font-semibold text-red-300">{error}</p>}
      </form>

      {visible.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sé el primero en preguntar.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((q) => (
            <GlassCard key={q.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[11.5px] leading-relaxed text-brand-dim",
                    q.status === "pending" && "opacity-70",
                  )}
                >
                  {q.text}
                </p>
                {q.status === "pending" && (
                  <p className="mt-1 text-[9px] font-bold text-amber-300">
                    En revisión — solo tú la ves
                  </p>
                )}
                {q.status === "answered" && (
                  <p className="mt-1 text-[9px] font-bold text-emerald-300">
                    ✓ Respondida en vivo
                  </p>
                )}
              </div>
              {q.status !== "pending" && (
                <button
                  onClick={() => toggleVote(q)}
                  aria-pressed={q.myVote}
                  aria-label={q.myVote ? "Quitar mi voto" : "Votar esta pregunta"}
                  className={cn(
                    "flex flex-shrink-0 flex-col items-center rounded-[10px] border px-2.5 py-1.5 transition-transform active:scale-95",
                    q.myVote
                      ? "border-white bg-brand-white text-black"
                      : "border-white/25 text-brand-white",
                  )}
                >
                  <span className="text-[11px] leading-none">▲</span>
                  <span className="text-[10px] font-black leading-tight">
                    {q.votes}
                  </span>
                </button>
              )}
              {q.status === "pending" && <Badge>Pendiente</Badge>}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
