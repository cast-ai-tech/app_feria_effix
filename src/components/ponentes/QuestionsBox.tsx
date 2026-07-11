"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { createClient } from "@/lib/supabase/client";

type Question = { id: string; text: string };

/**
 * Preguntas en vivo para un ponente. Lista simple visible para todos
 * (ponente/organizador incluidos); cualquier asistente autenticado puede
 * enviar una pregunta. Sin moderación compleja en esta fase.
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
      .select("id,text")
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) setQuestions((q) => [{ id: data.id, text: data.text }, ...q]);
    setText("");
    router.refresh();
  }

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
        {error && <p className="text-[10px] font-semibold text-red-300">{error}</p>}
      </form>

      {questions.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sé el primero en preguntar.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <GlassCard key={q.id} className="p-3">
              <p className="text-[11.5px] leading-relaxed text-brand-dim">{q.text}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
