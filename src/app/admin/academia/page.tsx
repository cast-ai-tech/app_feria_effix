import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import AdminAcademiaClient, {
  type AdminRecording,
} from "./AdminAcademiaClient";

export default async function AdminAcademiaPage() {
  const supabase = await createClient();

  // El admin ve TODAS las grabaciones (aprobadas y borradores) vía RLS.
  const { data } = await supabase
    .from("recordings")
    .select("id,title,speaker_name,description,video_url,edition,approved")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Academia"
        subtitle="Crear, editar y aprobar ponencias grabadas"
        backHref="/admin"
      />
      <AdminAcademiaClient recordings={(data ?? []) as AdminRecording[]} />
    </div>
  );
}
