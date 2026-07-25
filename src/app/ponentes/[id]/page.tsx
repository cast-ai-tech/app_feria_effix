import { UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import LockedModule from "@/components/LockedModule";
import FollowButton from "@/components/ponentes/FollowButton";
import RatingStars from "@/components/ponentes/RatingStars";
import QuestionsBox from "@/components/ponentes/QuestionsBox";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

export default async function PonenteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAccess();

  if (!a.configured)
    return <LockedModule title="Ponente" reason="ticket" configured={false} />;
  if (!a.user) return <LockedModule title="Ponente" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Ponente" reason="ticket" />;

  const supabase = await createClient();
  const { data: speaker } = await supabase
    .from("speakers")
    .select(
      "id,full_name,photo_url,bio,role,talk_title,talk_starts_at,instagram,linkedin,website,edition",
    )
    .eq("id", id)
    .maybeSingle();

  // El directorio rota por edición: un deep-link a un ponente de otra edición
  // no debe mostrarse a asistentes (sí a admin, para gestión). [QA acceso MEDIA]
  if (!speaker || (speaker.edition !== a.currentEdition && !a.isAdmin)) notFound();

  const [{ data: ratings }, { data: myRating }, { data: myFollow }, { data: questions }] =
    await Promise.all([
      supabase.from("speaker_ratings").select("stars").eq("speaker_id", id),
      supabase
        .from("speaker_ratings")
        .select("stars")
        .eq("speaker_id", id)
        .eq("user_id", a.user.id)
        .maybeSingle(),
      supabase
        .from("speaker_follows")
        .select("id")
        .eq("speaker_id", id)
        .eq("user_id", a.user.id)
        .maybeSingle(),
      supabase
        .from("speaker_questions")
        .select("id,text,status,user_id,created_at")
        .eq("speaker_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  // Q&A moderado (Fase 18): votos agregados + mis votos.
  const questionIds = (questions ?? []).map((q) => q.id);
  const [{ data: voteCounts }, { data: myVotes }] = await Promise.all([
    questionIds.length
      ? supabase
          .from("question_vote_counts")
          .select("question_id,votes")
          .in("question_id", questionIds)
      : Promise.resolve({ data: [] as { question_id: string; votes: number }[] }),
    questionIds.length
      ? supabase
          .from("question_votes")
          .select("question_id")
          .eq("user_id", a.user.id)
          .in("question_id", questionIds)
      : Promise.resolve({ data: [] as { question_id: string }[] }),
  ]);
  const votesById = new Map(
    (voteCounts ?? []).map((v) => [v.question_id, v.votes]),
  );
  const myVoteSet = new Set((myVotes ?? []).map((v) => v.question_id));

  const count = ratings?.length ?? 0;
  const average = count > 0 ? ratings!.reduce((s, r) => s + r.stars, 0) / count : 0;
  const talkPassed = speaker.talk_starts_at
    ? new Date(speaker.talk_starts_at) < new Date()
    : true;

  const socials = [
    speaker.instagram && { label: "Instagram", href: normalizeUrl(speaker.instagram, "instagram") },
    speaker.linkedin && { label: "LinkedIn", href: normalizeUrl(speaker.linkedin, "linkedin") },
    speaker.website && { label: "Sitio web", href: normalizeUrl(speaker.website, "web") },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="flex flex-col">
      <PageHeader title={speaker.full_name} subtitle={speaker.role ?? undefined} backHref="/ponentes" />

      <GlassCard sheen className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-brand-lav to-[#23222b] text-[24px]">
            {speaker.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={speaker.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6 text-brand-white" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {speaker.talk_title && (
              <p className="text-[12.5px] font-extrabold text-brand-white">
                {speaker.talk_title}
              </p>
            )}
            {speaker.talk_starts_at && (
              <p className="text-[10.5px] text-brand-muted">
                {new Date(speaker.talk_starts_at).toLocaleString("es-CO", {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <FollowButton speakerId={id} initialFollowing={!!myFollow} />
        </div>

        {speaker.bio && (
          /* Lectura larga → tarjeta blanca (patrón del sitio, Fase 23). */
          <div className="card-light px-4 py-3">
            <p className="text-[11.5px] leading-relaxed">{speaker.bio}</p>
          </div>
        )}

        {socials.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/25 px-3 py-1.5 text-[10px] font-bold text-brand-white"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </GlassCard>

      <SectionTitle>Calificación</SectionTitle>
      <GlassCard className="p-4">
        <RatingStars
          speakerId={id}
          canRate={talkPassed}
          average={average}
          count={count}
          userStars={myRating?.stars ?? null}
        />
      </GlassCard>

      <SectionTitle live>Preguntas en vivo</SectionTitle>
      <QuestionsBox
        speakerId={id}
        initialQuestions={(questions ?? []).map((q) => ({
          id: q.id,
          text: q.text,
          status: q.status,
          votes: votesById.get(q.id) ?? 0,
          myVote: myVoteSet.has(q.id),
          mine: q.user_id === a.user!.id,
        }))}
      />
    </div>
  );
}

function normalizeUrl(value: string, kind: "instagram" | "linkedin" | "web"): string {
  const v = value.trim();
  if (/^https?:\/\//.test(v)) return v;
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (kind === "linkedin") return `https://linkedin.com/in/${v.replace(/^@/, "")}`;
  return `https://${v}`;
}
