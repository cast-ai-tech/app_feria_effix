import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminQaClient, {
  type PollRow,
  type QaSpeakerRow,
  type QaTalkRow,
} from "./AdminQaClient";

/**
 * ADMIN Q&A (Fase 18): moderación de preguntas, encuesta flash,
 * votaciones en vivo y NPS. Protegido por el layout de /admin.
 */
export default async function AdminQaPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const [
    { data: speakers },
    { data: questions },
    { data: talks },
    { data: polls },
    { data: pollVotes },
    { data: nps },
  ] = await Promise.all([
    supabase
      .from("speakers")
      .select("id,full_name,talk_title")
      .eq("edition", access.currentEdition)
      .order("talk_starts_at", { ascending: true })
      .limit(300),
    supabase
      .from("speaker_questions")
      .select("speaker_id,status")
      .limit(5000),
    supabase
      .from("talks")
      .select("id,title,status,day")
      .eq("edition", access.currentEdition)
      .order("starts_at", { ascending: true })
      .limit(300),
    supabase
      .from("live_polls")
      .select("id,question,options,active,talk_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("poll_results").select("poll_id,votes"),
    supabase
      .from("nps_responses")
      .select("score")
      .eq("edition", access.currentEdition),
  ]);

  // Conteos de Q&A por ponente.
  const counts = new Map<
    string,
    { pending: number; approved: number; answered: number }
  >();
  for (const q of questions ?? []) {
    const c =
      counts.get(q.speaker_id) ?? { pending: 0, approved: 0, answered: 0 };
    if (q.status === "pending") c.pending++;
    else if (q.status === "approved") c.approved++;
    else if (q.status === "answered") c.answered++;
    counts.set(q.speaker_id, c);
  }

  const speakerRows: QaSpeakerRow[] = (speakers ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    talk_title: s.talk_title,
    ...(counts.get(s.id) ?? { pending: 0, approved: 0, answered: 0 }),
  }));

  const talkRows: QaTalkRow[] = (talks ?? []) as QaTalkRow[];

  const votesByPoll = new Map<string, number>();
  for (const r of pollVotes ?? []) {
    votesByPoll.set(r.poll_id, (votesByPoll.get(r.poll_id) ?? 0) + r.votes);
  }
  const talkTitle = new Map((talks ?? []).map((t) => [t.id, t.title]));
  const pollRows: PollRow[] = (polls ?? []).map((p) => ({
    id: p.id,
    question: p.question,
    options: (p.options ?? []) as string[],
    active: p.active,
    talk_title: p.talk_id ? (talkTitle.get(p.talk_id) ?? null) : null,
    totalVotes: votesByPoll.get(p.id) ?? 0,
  }));

  // NPS agregado de la edición activa.
  const scores = (nps ?? []).map((n) => n.score);
  const npsCount = scores.length;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const npsScore =
    npsCount > 0
      ? Math.round(((promoters - detractors) / npsCount) * 100)
      : null;
  const avg =
    npsCount > 0
      ? (scores.reduce((a, b) => a + b, 0) / npsCount).toFixed(1)
      : "—";

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Q&A y encuestas"
        subtitle="Moderación en vivo, votaciones y NPS del evento"
        backHref="/admin"
      />

      <SectionTitle className="mt-0">
        NPS · edición {access.currentEdition}
      </SectionTitle>
      <GlassCard className="mb-4 flex items-center justify-around p-4 text-center">
        <div>
          <p className="text-[18px] font-black text-brand-white">
            {npsScore === null ? "—" : npsScore}
          </p>
          <p className="text-[9.5px] font-bold text-brand-muted">NPS</p>
        </div>
        <div>
          <p className="text-[18px] font-black text-brand-white">{avg}</p>
          <p className="text-[9.5px] font-bold text-brand-muted">Promedio</p>
        </div>
        <div>
          <p className="text-[18px] font-black text-brand-white">{npsCount}</p>
          <p className="text-[9.5px] font-bold text-brand-muted">Respuestas</p>
        </div>
      </GlassCard>

      <AdminQaClient speakers={speakerRows} talks={talkRows} polls={pollRows} />
    </div>
  );
}
