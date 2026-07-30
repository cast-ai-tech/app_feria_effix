import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import AdminEquipoClient, { type TeamMemberRow } from "./AdminEquipoClient";

export default async function AdminEquipoPage() {
  // El layout de /admin ya gatea, pero esta página usa el service client:
  // defensa en profundidad antes de leer perfiles ajenos.
  const access = await getAccess();
  if (!access.isAdmin) redirect("/");

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id,role,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  // El nombre/correo vive en profiles, protegido por RLS a la fila propia —
  // se necesita el service client para leer las de otros usuarios (mismo
  // criterio que /admin/ponentes y /admin/patrocinadores, Fase 28).
  const userIds = (members ?? []).map((m) => m.user_id);
  const profileById = new Map<
    string,
    { full_name: string | null; ticket_email: string | null }
  >();
  if (userIds.length > 0) {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,full_name,ticket_email")
      .in("id", userIds);
    for (const p of profiles ?? []) profileById.set(p.id, p);
  }

  const rows: TeamMemberRow[] = (members ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      label: p?.full_name || p?.ticket_email || m.user_id.slice(0, 8),
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Equipo"
        subtitle="Equipo interno Effix: staff, logística, comercial y acreditación"
        backHref="/admin"
      />
      <AdminEquipoClient members={rows} />
    </div>
  );
}
