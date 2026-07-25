import BannerSlot from "@/components/BannerSlot";
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
  const [{ data }, { data: saved }] = await Promise.all([
    supabase
      .from("talks")
      .select(
        "id,title,description,speaker_id,speaker_name,auditorium,track,day,starts_at,ends_at,status",
      )
      .eq("edition", a.currentEdition)
      .order("starts_at", { ascending: true }),
    supabase.from("saved_talks").select("talk_id").eq("user_id", a.user.id),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Programación"
        subtitle="Actualizada en tiempo real"
        backHref="/"
      />
      <BannerSlot
        placement="module_top"
        moduleKey="agenda"
        edition={a.currentEdition}
        className="mb-4"
      />
      <AgendaClient
        talks={(data ?? []) as Talk[]}
        edition={a.edition}
        savedIds={(saved ?? []).map((s) => s.talk_id)}
      />
    </div>
  );
}
