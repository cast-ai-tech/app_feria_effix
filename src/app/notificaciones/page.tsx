import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import NotificacionesClient, {
  type NotificationItem,
} from "@/components/notificaciones/NotificacionesClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * Centro de notificaciones in-app (Fase 16) — historial para quienes no
 * aceptan push. La RLS ya filtra por audiencia (all/tier/rol).
 */
export default async function NotificacionesPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Notificaciones" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  const supabase = await createClient();
  const [{ data: notifs }, { data: reads }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,title,body,url,category,sent_at")
      .order("sent_at", { ascending: false })
      .limit(100),
    supabase.from("notification_reads").select("notification_id"),
  ]);

  const readSet = new Set((reads ?? []).map((r) => r.notification_id));
  const items: NotificationItem[] = (notifs ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.url,
    category: n.category,
    sentAt: n.sent_at,
    read: readSet.has(n.id),
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Notificaciones"
        subtitle="Avisos del evento y novedades"
        backHref="/"
      />
      <NotificacionesClient items={items} />
    </div>
  );
}
