import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminBannersClient, {
  type AdminBanner,
  type SponsorOption,
} from "./AdminBannersClient";

export default async function AdminBannersPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const [{ data: banners }, { data: events }, { data: sponsors }] =
    await Promise.all([
      supabase
        .from("banners")
        .select(
          "id,placement,module_key,sponsor_tier,sponsor_id,title,image_url,link_url,sort_order,active,edition",
        )
        .order("placement")
        .order("sort_order")
        .limit(200),
      supabase
        .from("banner_events")
        .select("banner_id,event_type")
        .limit(100000),
      supabase
        .from("sponsors")
        .select("id,name")
        .eq("edition", access.currentEdition)
        .order("name")
        .limit(200),
    ]);

  const impressions = new Map<string, number>();
  const clicks = new Map<string, number>();
  for (const e of events ?? []) {
    const map = e.event_type === "click" ? clicks : impressions;
    map.set(e.banner_id, (map.get(e.banner_id) ?? 0) + 1);
  }

  const rows: AdminBanner[] = (banners ?? []).map((b) => ({
    ...b,
    impressions: impressions.get(b.id) ?? 0,
    clicks: clicks.get(b.id) ?? 0,
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Banners"
        subtitle="Espacios de patrocinio con métricas — lo que el equipo comercial vende"
        backHref="/admin"
      />
      <AdminBannersClient
        banners={rows}
        sponsors={(sponsors ?? []) as SponsorOption[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
