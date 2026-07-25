import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProyectorPollClient, {
  type PollOptionResult,
} from "./ProyectorPollClient";

/**
 * PROYECTOR de votación en vivo (Fase 18) — vista pública de SOLO
 * LECTURA. Solo muestra la pregunta y agregados (vista poll_results).
 */
export default async function ProyectorPollPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const supabase = await createClient();

  const { data: poll } = await supabase
    .from("live_polls")
    .select("id,question,active")
    .eq("id", pollId)
    .maybeSingle();
  if (!poll) notFound();

  const { data: results } = await supabase
    .from("poll_results")
    .select("option_idx,option_label,votes")
    .eq("poll_id", pollId)
    .order("option_idx");

  return (
    <ProyectorPollClient
      pollId={pollId}
      initialQuestion={poll.question}
      initialActive={poll.active}
      initialResults={(results ?? []) as PollOptionResult[]}
    />
  );
}
