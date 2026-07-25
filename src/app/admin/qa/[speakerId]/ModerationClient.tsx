"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Badge from "@/components/Badge";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { setQuestionStatus } from "../actions";

export type ModQuestion = {
  id: string;
  text: string;
  status: string;
  created_at: string;
  votes: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  answered: "Respondida",
  discarded: "Descartada",
};

const FILTERS = ["pending", "approved", "answered", "discarded"] as const;

export default function ModerationClient({
  speakerId,
  initialQuestions,
}: {
  speakerId: string;
  initialQuestions: ModQuestion[];
}) {
  const [questions, setQuestions] = useState<ModQuestion[]>(initialQuestions);
  const [filter, setFilter] = useState<string>("pending");
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // Refetch desde el cliente (admin ve todo por RLS).
  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [{ data: qs }, { data: votes }] = await Promise.all([
      supabase
        .from("speaker_questions")
        .select("id,text,status,created_at")
        .eq("speaker_id", speakerId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("question_vote_counts").select("question_id,votes"),
    ]);
    const voteMap = new Map((votes ?? []).map((v) => [v.question_id, v.votes]));
    setQuestions(
      (qs ?? []).map((q) => ({ ...q, votes: voteMap.get(q.id) ?? 0 })),
    );
  }, [speakerId]);

  // Realtime: preguntas nuevas / cambios de estado / votos.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`qa-mod-${speakerId}`)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_votes" },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [speakerId, refetch]);

  function moveTo(id: string, status: string) {
    // Optimista: el realtime/refetch confirma después.
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, status } : q)),
    );
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", status);
      const res = await setQuestionStatus(fd);
      if (res.error) {
        setNote(`Error: ${res.error}`);
        void refetch();
      }
    });
  }

  const shown = questions
    .filter((q) => q.status === filter)
    .sort((a, b) =>
      filter === "approved" ? b.votes - a.votes : 0,
    );

  const countBy = (s: string) => questions.filter((q) => q.status === s).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {STATUS_LABEL[f]} ({countBy(f)})
          </FilterChip>
        ))}
      </div>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {shown.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sin preguntas en “{STATUS_LABEL[filter]}”.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((q) => (
            <GlassCard key={q.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "text-[12px] leading-relaxed text-brand-white",
                    q.status === "discarded" && "line-through opacity-60",
                  )}
                >
                  {q.text}
                </p>
                {q.votes > 0 && <Badge>▲ {q.votes}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {q.status !== "approved" && (
                  <button
                    disabled={pending}
                    onClick={() => moveTo(q.id, "approved")}
                    className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300"
                  >
                    Aprobar
                  </button>
                )}
                {q.status === "approved" && (
                  <button
                    disabled={pending}
                    onClick={() => moveTo(q.id, "answered")}
                    className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                  >
                    Respondida
                  </button>
                )}
                {q.status !== "discarded" && (
                  <button
                    disabled={pending}
                    onClick={() => moveTo(q.id, "discarded")}
                    className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300"
                  >
                    Descartar
                  </button>
                )}
                {q.status !== "pending" && (
                  <button
                    disabled={pending}
                    onClick={() => moveTo(q.id, "pending")}
                    className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                  >
                    A pendiente
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
