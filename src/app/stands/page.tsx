import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import StandsClient, { type Stand } from "@/components/stands/StandsClient";

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
  const { data } = await supabase
    .from("stands")
    .select("id,name,category,stand_number,description,logo_url,edition")
    .eq("edition", a.currentEdition)
    .order("name");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Stands"
        subtitle={`Expositores · Feria Effix ${a.currentEdition}`}
        backHref="/"
      />
      <StandsClient stands={(data ?? []) as Stand[]} />
    </div>
  );
}
