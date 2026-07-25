import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import GlassCard from "@/components/GlassCard";
import FlashFeedbackClient from "@/components/encuesta/FlashFeedbackClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * ENCUESTA FLASH post-charla (Fase 18) — requiere boleta vigente
 * (anillo ticket): solo quien está en el evento califica charlas.
 */
export default async function EncuestaTalkPage({
  params,
}: {
  params: Promise<{ talkId: string }>;
}) {
  const { talkId } = await params;
  const a = await getAccess();

  if (!a.configured)
    return <LockedModule title="Encuesta" reason="ticket" configured={false} />;
  if (!a.user) return <LockedModule title="Encuesta" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Encuesta" reason="ticket" />;

  const supabase = await createClient();
  const { data: talk } = await supabase
    .from("talks")
    .select("id,title,speaker_name,status,edition")
    .eq("id", talkId)
    .maybeSingle();

  if (!talk || (talk.edition !== a.currentEdition && !a.isAdmin)) notFound();

  const { data: mine } = await supabase
    .from("talk_feedback")
    .select("stars,comment")
    .eq("talk_id", talkId)
    .eq("user_id", a.user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col">
      <PageHeader
        title={talk.title}
        subtitle={talk.speaker_name ?? "Encuesta flash"}
        backHref="/agenda"
      />
      {talk.status === "cancelled" ? (
        <GlassCard className="p-4">
          <p className="text-[11px] text-brand-muted">
            Esta charla fue cancelada, no recibe calificaciones.
          </p>
        </GlassCard>
      ) : (
        <FlashFeedbackClient
          talkId={talkId}
          initialStars={mine?.stars ?? 0}
          initialComment={mine?.comment ?? ""}
        />
      )}
    </div>
  );
}
