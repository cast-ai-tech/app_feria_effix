import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminPasaporteClient, {
  type AdminCampaign,
  type AdminCompletion,
} from "./AdminPasaporteClient";

export default async function AdminPasaportePage() {
  const access = await getAccess();
  const supabase = await createClient();

  const [{ data: campaigns }, { data: completions }, { data: scans }] =
    await Promise.all([
      supabase
        .from("passport_campaigns")
        .select("id,name,goal_type,goal_value,prize_description,active,edition")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("passport_completions")
        .select(
          "id,completed_at,redeemed_at,passport_campaigns(name),profiles:user_id(full_name)",
        )
        .order("completed_at", { ascending: false })
        .limit(500),
      supabase.from("stand_scans").select("stand_id,stands(name)").limit(5000),
    ]);

  const completionRows: AdminCompletion[] = (completions ?? []).map((c) => {
    const camp = c.passport_campaigns as unknown as { name: string } | null;
    const prof = c.profiles as unknown as { full_name: string | null } | null;
    return {
      id: c.id,
      campaign_name: camp?.name ?? "—",
      full_name: prof?.full_name ?? null,
      completed_at: c.completed_at,
      redeemed_at: c.redeemed_at,
    };
  });

  const counts = new Map<string, number>();
  for (const s of scans ?? []) {
    const stand = s.stands as unknown as { name: string } | null;
    const name = stand?.name ?? "—";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const leadsPerStand = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Pasaporte"
        subtitle="Campañas de sellos, completados y tráfico por stand"
        backHref="/admin"
      />
      <AdminPasaporteClient
        campaigns={(campaigns ?? []) as AdminCampaign[]}
        completions={completionRows}
        currentEdition={access.currentEdition}
        leadsPerStand={leadsPerStand}
      />
    </div>
  );
}
