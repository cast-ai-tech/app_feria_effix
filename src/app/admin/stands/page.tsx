import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminStandsClient, {
  type AdminStand,
  type AdminMeeting,
  type StaffRow,
  type StandMetrics,
} from "./AdminStandsClient";

export default async function AdminStandsPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const [
    { data: stands },
    { data: meetings },
    { data: staff },
    { data: scans },
  ] = await Promise.all([
    supabase
      .from("stands")
      .select("id,name,category,stand_number,description,zone,tier,edition")
      .order("edition", { ascending: false })
      .order("name")
      .limit(500),
    supabase
      .from("stand_meetings")
      .select("id,message,intent,status,created_at,stand_id,stands(name)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("stand_staff")
      .select("id,stand_id,user_id,profiles(full_name,ticket_email)")
      .limit(500),
    supabase.from("stand_scans").select("stand_id").limit(10000),
  ]);

  const normalizedMeetings: AdminMeeting[] = (meetings ?? []).map((m) => {
    const rel = m.stands as { name: string } | { name: string }[] | null;
    const standName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: m.id,
      message: m.message,
      intent: m.intent,
      status: m.status,
      stand_id: m.stand_id,
      stand_name: standName ?? "—",
    };
  });

  const staffRows: StaffRow[] = (staff ?? []).map((s) => {
    const rel = s.profiles as
      | { full_name: string | null; ticket_email: string | null }
      | { full_name: string | null; ticket_email: string | null }[]
      | null;
    const p = Array.isArray(rel) ? rel[0] : rel;
    return {
      id: s.id,
      stand_id: s.stand_id,
      label: p?.full_name || p?.ticket_email || s.user_id.slice(0, 8),
    };
  });

  // Métricas comerciales (Fase 19): leads y reuniones por stand — los
  // números con los que el equipo Effix vende stands y niveles 2027.
  const leadCounts = new Map<string, number>();
  for (const s of scans ?? []) {
    leadCounts.set(s.stand_id, (leadCounts.get(s.stand_id) ?? 0) + 1);
  }
  const meetingCounts = new Map<string, number>();
  for (const m of meetings ?? []) {
    meetingCounts.set(m.stand_id, (meetingCounts.get(m.stand_id) ?? 0) + 1);
  }
  const metrics: StandMetrics[] = (stands ?? [])
    .map((s) => ({
      stand_id: s.id,
      name: s.name,
      tier: s.tier,
      leads: leadCounts.get(s.id) ?? 0,
      meetings: meetingCounts.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.leads - a.leads || b.meetings - a.meetings);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Stands"
        subtitle="Expositores, niveles, staff, citas y métricas"
        backHref="/admin"
      />
      <AdminStandsClient
        stands={(stands ?? []) as AdminStand[]}
        meetings={normalizedMeetings}
        staff={staffRows}
        metrics={metrics}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
