import BannerSlot from "@/components/BannerSlot";
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
 *
 * Abierto sin sesión (Fase 30) como tablón público de avisos: la policy de
 * `notifications` ("notifs: audiencia lee") deja pasar `audience_type='all'`
 * sin exigir auth.uid(), así que un visitante anónimo solo ve esos avisos
 * generales — las filas de audiencia `tier`/`rol` dependen de auth.uid() y
 * la RLS ya las excluye automáticamente. `notification_reads` no aplica sin
 * usuario, así que se omite esa consulta.
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

  const supabase = await createClient();
  const [{ data: notifs }, readsResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,title,body,url,category,sent_at")
      .order("sent_at", { ascending: false })
      .limit(100),
    a.user
      ? supabase.from("notification_reads").select("notification_id")
      : Promise.resolve({ data: null as { notification_id: string }[] | null }),
  ]);
  const reads = readsResult.data;

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
      <BannerSlot
        placement="module_top"
        moduleKey="notificaciones"
        edition={a.currentEdition}
        className="mb-4"
      />
      <NotificacionesClient items={items} />
    </div>
  );
}
