import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminStandsClient, {
  type AdminStand,
  type AdminMeeting,
} from "./AdminStandsClient";

export default async function AdminStandsPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const [{ data: stands }, { data: meetings }] = await Promise.all([
    supabase
      .from("stands")
      .select("id,name,category,stand_number,description,edition")
      .order("edition", { ascending: false })
      .order("name")
      .limit(500),
    supabase
      .from("stand_meetings")
      .select("id,message,status,created_at,stand_id,stands(name)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const normalizedMeetings: AdminMeeting[] = (meetings ?? []).map((m) => {
    const rel = m.stands as { name: string } | { name: string }[] | null;
    const standName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: m.id,
      message: m.message,
      status: m.status,
      stand_name: standName ?? "—",
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Stands"
        subtitle="Directorio de expositores y solicitudes de cita"
        backHref="/admin"
      />
      <AdminStandsClient
        stands={(stands ?? []) as AdminStand[]}
        meetings={normalizedMeetings}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
