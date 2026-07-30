import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import AdminPonentesClient, { type AdminSpeaker } from "./AdminPonentesClient";

export default async function AdminPonentesPage() {
  // El layout de /admin ya gatea, pero esta página usa el service client:
  // defensa en profundidad antes de leer perfiles ajenos.
  const access = await getAccess();
  if (!access.isAdmin) redirect("/");

  const supabase = await createClient();

  const { data } = await supabase
    .from("speakers")
    .select("id,full_name,role,talk_title,talk_starts_at,edition,user_id")
    .order("edition", { ascending: false })
    .order("full_name")
    .limit(500);

  // La cuenta vinculada vive en profiles, que solo se puede leer con RLS
  // para la fila propia — el admin necesita el service client para ver el
  // correo/nombre de OTRAS cuentas (Fase 28).
  const userIds = Array.from(
    new Set(
      (data ?? [])
        .map((s) => s.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

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

  const speakers: AdminSpeaker[] = (data ?? []).map((s) => {
    const p = s.user_id ? profileById.get(s.user_id) : undefined;
    return {
      id: s.id,
      full_name: s.full_name,
      role: s.role,
      talk_title: s.talk_title,
      talk_starts_at: s.talk_starts_at,
      edition: s.edition,
      user_id: s.user_id,
      linked_email: s.user_id ? p?.ticket_email || p?.full_name || null : null,
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ponentes"
        subtitle="Directorio de ponentes por edición"
        backHref="/admin"
      />
      <AdminPonentesClient
        speakers={speakers}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
