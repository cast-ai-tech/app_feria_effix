"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PollOptionResult = {
  option_idx: number;
  option_label: string;
  votes: number;
};

/**
 * Vista de PROYECTOR de una votación en vivo — barras animadas.
 * Los agregados vienen de la vista poll_results (sin votantes).
 * Realtime sobre live_polls (activación/apagado) + refresco por intervalo
 * de los conteos.
 */
export default function ProyectorPollClient({
  pollId,
  initialQuestion,
  initialActive,
  initialResults,
}: {
  pollId: string;
  initialQuestion: string;
  initialActive: boolean;
  initialResults: PollOptionResult[];
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [active, setActive] = useState(initialActive);
  const [results, setResults] = useState<PollOptionResult[]>(initialResults);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("poll_results")
      .select("option_idx,option_label,votes")
      .eq("poll_id", pollId)
      .order("option_idx");
    if (data) setResults(data as PollOptionResult[]);
  }, [pollId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`poll-proj-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_polls",
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          const row = payload.new as { question: string; active: boolean };
          setQuestion(row.question);
          setActive(row.active);
        },
      )
      .subscribe();
    const interval = window.setInterval(() => void refetch(), 2000);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [pollId, refetch]);

  const total = results.reduce((s, r) => s + r.votes, 0);
  const max = Math.max(1, ...results.map((r) => r.votes));

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-center overflow-y-auto bg-black px-[6vw] py-[5vh]">
      <p className="text-[2vw] font-black uppercase tracking-[0.4vw] text-white/40">
        Votación en vivo · Feria Effix
        {!active && " · CERRADA"}
      </p>
      <h1 className="mt-[1vh] text-[4.2vw] font-black leading-tight text-white">
        {question}
      </h1>
      <p className="mt-[0.5vh] text-[1.8vw] font-bold text-white/50">
        {total} {total === 1 ? "voto" : "votos"}
        {active && " · vota desde la app"}
      </p>

      <div className="mt-[5vh] flex flex-col gap-[3vh]">
        {results.map((r) => {
          const pct = total > 0 ? Math.round((r.votes / total) * 100) : 0;
          const width = total > 0 ? Math.max(4, (r.votes / max) * 100) : 4;
          return (
            <div key={r.option_idx}>
              <div className="mb-[0.8vh] flex items-baseline justify-between">
                <span className="text-[2.6vw] font-extrabold text-white">
                  {r.option_label}
                </span>
                <span className="text-[2.6vw] font-black text-[#726E8D]">
                  {pct}%
                </span>
              </div>
              <div className="h-[4.5vh] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-[#726E8D] transition-[width] duration-700 ease-out"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
