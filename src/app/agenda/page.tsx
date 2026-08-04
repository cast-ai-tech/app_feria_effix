import { headers } from "next/headers";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AgendaClient, { type Talk } from "@/components/agenda/AgendaClient";

export default async function AgendaPage() {
  const a = await getAccess();

  // Abierta sin sesión (Fase 30): la programación es pública. Guardar
  // charlas en Mi Agenda sí exige sesión (lo maneja AgendaClient).
  if (!a.configured)
    return (
      <LockedModule title="Programación" reason="ticket" configured={false} />
    );

  const supabase = await createClient();
  const [{ data }, savedResult, { data: reminderCfg }, tokenResult] =
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
      a.user
        ? supabase
            .from("profiles")
            .select("calendar_token")
            .eq("id", a.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null as { calendar_token: string } | null }),
    ]);
  const saved = savedResult.data;
  const reminderLeadMinutes = parseInt(reminderCfg?.value ?? "15", 10) || 15;

  // URL absoluta del feed .ics (Fase 30) — host de la request, nunca
  // hardcodeado, para que funcione igual en local, preview y producción.
  let calendarFeedUrl: string | null = null;
  const token = tokenResult.data?.calendar_token;
  if (token) {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) calendarFeedUrl = `${proto}://${host}/api/calendar/${token}`;
  }

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
        calendarFeedUrl={calendarFeedUrl}
      />
    </div>
  );
}
