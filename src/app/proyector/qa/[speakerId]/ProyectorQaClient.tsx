"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProjQuestion = {
  id: string;
  text: string;
  status: string;
  votes: number;
};

/**
 * Vista de PROYECTOR del Q&A — solo lectura, tipografía gigante.
 * Se monta como overlay a pantalla completa (fixed) para salir del shell
 * móvil de 440px. Realtime en preguntas + refresco de votos.
 */
export default function ProyectorQaClient({
  speakerId,
  talkTitle,
  initialQuestions,
}: {
  speakerId: string;
  talkTitle: string;
  initialQuestions: ProjQuestion[];
}) {
  const [questions, setQuestions] = useState<ProjQuestion[]>(initialQuestions);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [{ data: qs }, { data: votes }] = await Promise.all([
      supabase
        .from("speaker_questions")
        .select("id,text,status")
        .eq("speaker_id", speakerId)
        .in("status", ["approved", "answered"])
        .limit(200),
      supabase.from("question_vote_counts").select("question_id,votes"),
    ]);
    const voteMap = new Map((votes ?? []).map((v) => [v.question_id, v.votes]));
    setQuestions(
      (qs ?? []).map((q) => ({ ...q, votes: voteMap.get(q.id) ?? 0 })),
    );
  }, [speakerId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`qa-proj-${speakerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speaker_questions",
          filter: `speaker_id=eq.${speakerId}`,
        },
        () => void refetch(),
      )
      .subscribe();
    // Los votos agregados se refrescan por intervalo (la vista no emite eventos).
    const interval = window.setInterval(() => void refetch(), 3000);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [speakerId, refetch]);

  const shown = [...questions]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black px-[5vw] py-[4vh]">
      <p className="text-[2.2vw] font-black uppercase tracking-[0.4vw] text-white/40">
        Preguntas del público · Feria Effix
      </p>
      <h1 className="mt-[1vh] text-[3.6vw] font-black leading-tight text-white">
        {talkTitle}
      </h1>

      {shown.length === 0 ? (
        <p className="mt-[8vh] text-center text-[3vw] font-bold text-white/50">
          Aún no hay preguntas aprobadas.
          <br />
          Envía la tuya desde la app
        </p>
      ) : (
        <ol className="mt-[4vh] flex flex-col gap-[2.5vh]">
          {shown.map((q, i) => (
            <li
              key={q.id}
              className={
                "flex items-start gap-[2vw] rounded-[1.5vw] border border-white/15 bg-white/[0.05] px-[2.5vw] py-[2vh] " +
                (q.status === "answered" ? "opacity-45" : "")
              }
            >
              <span className="text-[2.8vw] font-black text-white/40">
                {i + 1}
              </span>
              <p className="flex-1 text-[2.8vw] font-extrabold leading-snug text-white">
                {q.text}
                {q.status === "answered" && (
                  <span className="ml-[1vw] text-[1.8vw] text-emerald-300">
                    ✓ respondida
                  </span>
                )}
              </p>
              <span className="whitespace-nowrap text-[2.2vw] font-black text-[#726E8D]">
                ▲ {q.votes}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
