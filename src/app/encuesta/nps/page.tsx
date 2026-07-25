import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import NpsClient from "@/components/encuesta/NpsClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * NPS DEL EVENTO (Fase 18) — requiere boleta vigente: responde quien
 * vivió la feria. Se envía por push el último día (Fase 16).
 */
export default async function NpsPage() {
  const a = await getAccess();

  if (!a.configured)
    return <LockedModule title="Encuesta" reason="ticket" configured={false} />;
  if (!a.user) return <LockedModule title="Encuesta" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Encuesta" reason="ticket" />;

  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("nps_responses")
    .select("score,comment")
    .eq("user_id", a.user.id)
    .eq("edition", a.currentEdition)
    .maybeSingle();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tu opinión"
        subtitle={`Feria Effix ${a.currentEdition} · 30 segundos`}
        backHref="/"
      />
      <NpsClient
        edition={a.currentEdition}
        initialScore={mine?.score ?? null}
        initialComment={mine?.comment ?? ""}
      />
    </div>
  );
}
