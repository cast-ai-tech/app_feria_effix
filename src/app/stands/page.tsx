import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import StandsClient, {
  type MyMeeting,
  type Stand,
} from "@/components/stands/StandsClient";

export default async function StandsPage() {
  const a = await getAccess();
  if (!a.configured)
    return <LockedModule title="Stands" reason="ticket" configured={false} />;
  if (!a.user) return <LockedModule title="Stands" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return (
      <LockedModule
        title="Stands"
        subtitle="Directorio de expositores de la edición en curso"
        reason="ticket"
      />
    );

  const supabase = await createClient();
  const [{ data }, { data: meetings }] = await Promise.all([
    supabase
      .from("stands")
      .select(
        "id,name,category,stand_number,description,logo_url,tier,gallery_urls,video_url,catalog_url,whatsapp_url,zone,edition",
      )
      .eq("edition", a.currentEdition)
      .order("name"),
    // Citas previas del usuario (RLS: solo ve las suyas) — el estado de la
    // solicitud persiste al recargar (fix hallazgo #11).
    supabase
      .from("stand_meetings")
      .select("stand_id,status,intent,slot_note")
      .eq("user_id", a.user.id),
  ]);

  const myMeetings: Record<string, MyMeeting> = {};
  for (const m of meetings ?? []) {
    myMeetings[m.stand_id] = {
      status: m.status,
      intent: m.intent,
      slotNote: m.slot_note,
    };
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Stands"
        subtitle={`Expositores · Feria Effix ${a.currentEdition}`}
        backHref="/"
      />
      <BannerSlot
        placement="module_top"
        moduleKey="stands"
        edition={a.currentEdition}
        className="mb-4"
      />
      <StandsClient stands={(data ?? []) as Stand[]} myMeetings={myMeetings} />
    </div>
  );
}
