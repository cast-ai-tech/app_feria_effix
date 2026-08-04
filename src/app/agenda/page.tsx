import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AgendaClient, {
  type Talk,
  type UserEvent,
} from "@/components/agenda/AgendaClient";

export default async function AgendaPage() {
  const a = await getAccess();

  // Abierta sin sesión (Fase 30): la programación es pública. Guardar
  // charlas y crear citas en Mi Agenda sí exige sesión.
  if (!a.configured)
    return (
      <LockedModule title="Programación" reason="ticket" configured={false} />
    );

  const supabase = await createClient();
  const [{ data }, savedResult, { data: reminderCfg }, eventsResult] =
    await Promise.all([
      supabase
        .from("talks")
        .select(
          "id,title,description,speaker_id,speaker_name,auditorium,track,day,starts_at,ends_at,status",
        )
        .eq("edition", a.currentEdition)
        .order("starts_at", { ascending: true }),
      a.user
        ? supabase
            .from("saved_talks")
            .select("talk_id")
            .eq("user_id", a.user.id)
        : Promise.resolve({ data: null as { talk_id: string }[] | null }),
      supabase
        .from("app_config")
        .select("value")
        .eq("key", "reminder_lead_minutes")
        .maybeSingle(),
      // Citas personales (Fase 30) — RLS: solo las propias.
      a.user
        ? supabase
            .from("user_events")
            .select("id,title,starts_at,ends_at,location,notes")
            .eq("user_id", a.user.id)
            .order("starts_at")
        : Promise.resolve({ data: null as UserEvent[] | null }),
    ]);
  const saved = savedResult.data;
  const reminderLeadMinutes = parseInt(reminderCfg?.value ?? "15", 10) || 15;

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
        reminderLeadMinutes={reminderLeadMinutes}
        userEvents={(eventsResult.data ?? []) as UserEvent[]}
        isLoggedIn={!!a.user}
      />
    </div>
  );
}
