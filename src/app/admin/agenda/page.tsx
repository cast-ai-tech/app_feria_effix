import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminAgendaClient, { type AdminTalk } from "./AdminAgendaClient";

export default async function AdminAgendaPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const { data } = await supabase
    .from("talks")
    .select(
      "id,title,description,speaker_name,auditorium,day,starts_at,ends_at,edition,status",
    )
    .order("day", { ascending: true })
    .order("starts_at", { ascending: true })
    .limit(300);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Agenda"
        subtitle="Crear, editar y cancelar charlas de la programación"
        backHref="/admin"
      />
      <AdminAgendaClient
        talks={(data ?? []) as AdminTalk[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
