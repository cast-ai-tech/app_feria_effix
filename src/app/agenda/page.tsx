import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AgendaClient, { type Talk } from "@/components/agenda/AgendaClient";

export default async function AgendaPage() {
  const a = await getAccess();

  // Acceso: requiere boleta vigente de la edición en curso (o admin).
  if (!a.configured)
    return (
      <LockedModule title="Programación" reason="ticket" configured={false} />
    );
  if (!a.user) return <LockedModule title="Programación" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Programación" reason="ticket" />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("talks")
    .select(
      "id,title,description,speaker_id,speaker_name,auditorium,day,starts_at,ends_at,status",
    )
    .eq("edition", a.currentEdition)
    .order("starts_at", { ascending: true });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Programación"
        subtitle="Actualizada en tiempo real"
        backHref="/"
      />
      <AgendaClient talks={(data ?? []) as Talk[]} />
    </div>
  );
}
