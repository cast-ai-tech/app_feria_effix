import { redirect } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import MiCharlaClient, {
  type MyQuestion,
} from "@/components/micharla/MiCharlaClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getMySpeakers } from "@/lib/speakerPortal";

/**
 * PORTAL DEL PONENTE (Fase 28) — /mi-charla.
 * Gate real: estar en speakers.user_id (lo vincula el admin). Requiere
 * login; no requiere boleta (el ponente entra con su cuenta).
 */
export default async function MiCharlaPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi charla" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  if (!a.roles.isSpeaker && !a.isAdmin) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Mi charla"
          subtitle="Portal del ponente"
          backHref="/"
        />
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Este espacio es para ponentes
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            Tu cuenta no está vinculada a ninguna ficha de ponente. Si vas a dar
            una charla en la feria, pídele al organizador que vincule tu correo
            a tu ficha — y desde aquí podrás editar tu perfil, moderar las
            preguntas de tu público y ver tus métricas.
          </p>
          <Button href="/" variant="ghost" className="mt-4">
            Volver al inicio
          </Button>
        </GlassCard>
      </div>
    );
  }

  const mySpeakers = await getMySpeakers(a.user.id);

  if (mySpeakers.length === 0) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Mi charla"
          subtitle="Portal del ponente"
          backHref="/"
        />
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Aún no tienes una ficha de ponente
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            {a.isAdmin
              ? "Como admin puedes entrar a este portal, pero tu cuenta no tiene una ficha de ponente propia vinculada."
              : "Cuando el organizador vincule tu correo a tu ficha, tu perfil y las preguntas de tu charla aparecerán aquí."}
          </p>
        </GlassCard>
      </div>
    );
  }

  const speakerIds = mySpeakers.map((s) => s.id);
  const supabase = await createClient();

  // Preguntas de TODAS sus charlas + votos agregados (RLS: el ponente ve
  // pending/approved/answered/discarded de su propia ficha, Fase 28).
  const [{ data: questions }, { data: votes }] = await Promise.all([
    supabase
      .from("speaker_questions")
      .select("id,speaker_id,text,status,created_at")
      .in("speaker_id", speakerIds)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("question_vote_counts").select("question_id,votes"),
  ]);

  const voteMap = new Map((votes ?? []).map((v) => [v.question_id, v.votes]));
  const myQuestions: MyQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    speakerId: q.speaker_id,
    text: q.text,
    status: q.status,
    createdAt: q.created_at,
    votes: voteMap.get(q.id) ?? 0,
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi charla"
        subtitle="Portal del ponente · perfil, Q&A y métricas"
        backHref="/"
      />
      <MiCharlaClient speakers={mySpeakers} questions={myQuestions} />
    </div>
  );
}
