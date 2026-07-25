import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProyectorQaClient, { type ProjQuestion } from "./ProyectorQaClient";

/**
 * PROYECTOR Q&A (Fase 18) — vista pública de SOLO LECTURA para el
 * auditorio. No expone datos sensibles: únicamente preguntas aprobadas
 * (que ya son de lectura pública por RLS) y conteos de votos agregados.
 */
export default async function ProyectorQaPage({
  params,
}: {
  params: Promise<{ speakerId: string }>;
}) {
  const { speakerId } = await params;
  const supabase = await createClient();

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id,full_name,talk_title")
    .eq("id", speakerId)
    .maybeSingle();
  if (!speaker) notFound();

  const [{ data: questions }, { data: votes }] = await Promise.all([
    supabase
      .from("speaker_questions")
      .select("id,text,status")
      .eq("speaker_id", speakerId)
      .in("status", ["approved", "answered"])
      .limit(200),
    supabase.from("question_vote_counts").select("question_id,votes"),
  ]);

  const voteMap = new Map((votes ?? []).map((v) => [v.question_id, v.votes]));
  const initial: ProjQuestion[] = (questions ?? []).map((q) => ({
    ...q,
    votes: voteMap.get(q.id) ?? 0,
  }));

  return (
    <ProyectorQaClient
      speakerId={speakerId}
      talkTitle={speaker.talk_title ?? speaker.full_name}
      initialQuestions={initial}
    />
  );
}
