import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminPonentesClient, { type AdminSpeaker } from "./AdminPonentesClient";

export default async function AdminPonentesPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const { data } = await supabase
    .from("speakers")
    .select("id,full_name,role,talk_title,talk_starts_at,edition")
    .order("edition", { ascending: false })
    .order("full_name")
    .limit(500);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ponentes"
        subtitle="Directorio de ponentes por edición"
        backHref="/admin"
      />
      <AdminPonentesClient
        speakers={(data ?? []) as AdminSpeaker[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
