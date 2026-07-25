import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import AdminNotificacionesClient, {
  type SentNotification,
} from "./AdminNotificacionesClient";

export default async function AdminNotificacionesPage() {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: history }, { data: types }, { data: roles }, { data: cfg }, { count }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("id,title,body,audience_type,audience_value,category,sent_at,sent_count")
        .order("sent_at", { ascending: false })
        .limit(50),
      supabase.from("ticket_types").select("slug,label").order("sort_order"),
      supabase.from("roles").select("slug,label").order("sort_order"),
      supabase
        .from("app_config")
        .select("value")
        .eq("key", "push_marketing_daily_limit")
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("category", "marketing")
        .gte("sent_at", startOfDay.toISOString()),
    ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Notificaciones"
        subtitle="Push segmentado + centro in-app · útil, nunca spam"
        backHref="/admin"
      />
      <AdminNotificacionesClient
        history={(history ?? []) as SentNotification[]}
        tiers={(types ?? []).map((t) => ({ value: t.slug, label: t.label }))}
        roles={(roles ?? []).map((r) => ({ value: r.slug, label: r.label }))}
        marketingSentToday={count ?? 0}
        marketingLimit={parseInt(cfg?.value ?? "2", 10) || 2}
      />
    </div>
  );
}
