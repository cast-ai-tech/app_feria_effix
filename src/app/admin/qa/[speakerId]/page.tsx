import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorPlay } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import ModerationClient, { type ModQuestion } from "./ModerationClient";

/** Moderación en vivo del Q&A de una charla (por su ponente). */
export default async function AdminQaModerationPage({
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
      .select("id,text,status,created_at")
      .eq("speaker_id", speakerId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("question_vote_counts").select("question_id,votes"),
  ]);

  const voteMap = new Map((votes ?? []).map((v) => [v.question_id, v.votes]));
  const initial: ModQuestion[] = (questions ?? []).map((q) => ({
    ...q,
    votes: voteMap.get(q.id) ?? 0,
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title={speaker.talk_title ?? speaker.full_name}
        subtitle={`Moderación Q&A · ${speaker.full_name}`}
        backHref="/admin/qa"
      />
      <Link
        href={`/proyector/qa/${speakerId}`}
        target="_blank"
        className="mb-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-white/[0.04] px-5 py-3 text-[12px] font-extrabold text-brand-white"
      >
        <span className="inline-flex items-center gap-1.5">
          <MonitorPlay className="h-4 w-4" aria-hidden /> Abrir vista de proyector
        </span>
        <span className="text-brand-muted">›</span>
      </Link>
      <ModerationClient speakerId={speakerId} initialQuestions={initial} />
    </div>
  );
}
