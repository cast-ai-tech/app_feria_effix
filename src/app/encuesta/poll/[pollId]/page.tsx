import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import PollVoteClient from "@/components/encuesta/PollVoteClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/** Voto en una VOTACIÓN EN VIVO (Fase 18) — requiere boleta vigente. */
export default async function PollVotePage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const a = await getAccess();

  if (!a.configured)
    return <LockedModule title="Votación" reason="ticket" configured={false} />;
  if (!a.user) return <LockedModule title="Votación" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Votación" reason="ticket" />;

  const supabase = await createClient();
  const { data: poll } = await supabase
    .from("live_polls")
    .select("id,question,options,active")
    .eq("id", pollId)
    .maybeSingle();
  if (!poll) notFound();

  const { data: myVote } = await supabase
    .from("poll_votes")
    .select("option_idx")
    .eq("poll_id", pollId)
    .eq("user_id", a.user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Votación en vivo"
        subtitle="Tu voto aparece en la pantalla del auditorio"
        backHref="/"
      />
      <PollVoteClient
        pollId={pollId}
        question={poll.question}
        options={(poll.options ?? []) as string[]}
        initialActive={poll.active}
        initialMyVote={myVote?.option_idx ?? null}
      />
    </div>
  );
}
