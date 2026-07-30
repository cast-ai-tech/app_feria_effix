import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";
import AdminPatrocinadoresClient, {
  type AdminSponsor,
  type SponsorStaffRow,
  type BannerOption,
} from "./AdminPatrocinadoresClient";

export default async function AdminPatrocinadoresPage() {
  // El layout de /admin ya gatea, pero esta página usa el service client:
  // defensa en profundidad antes de leer perfiles ajenos.
  const access = await getAccess();
  if (!access.isAdmin) redirect("/");

  const supabase = await createClient();

  const [{ data: sponsors }, { data: staff }, { data: banners }] =
    await Promise.all([
      supabase
        .from("sponsors")
        .select("id,name,logo_url,website,tier,edition,active")
        .order("edition", { ascending: false })
        .order("name")
        .limit(500),
      supabase.from("sponsor_staff").select("id,sponsor_id,user_id").limit(500),
      supabase
        .from("banners")
        .select("id,title,placement,sponsor_id,edition")
        .eq("edition", access.currentEdition)
        .order("placement")
        .limit(200),
    ]);

  // El correo/nombre de la cuenta del staff vive en profiles, protegido por
  // RLS a la fila propia — se necesita el service client para leer las de
  // otros usuarios (mismo criterio que /admin/ponentes, Fase 28).
  const userIds = Array.from(new Set((staff ?? []).map((s) => s.user_id)));
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

  const staffRows: SponsorStaffRow[] = (staff ?? []).map((s) => {
    const p = profileById.get(s.user_id);
    return {
      id: s.id,
      sponsor_id: s.sponsor_id,
      label: p?.full_name || p?.ticket_email || s.user_id.slice(0, 8),
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Patrocinadores"
        subtitle="Sponsors, staff autorizado y banners vinculados"
        backHref="/admin"
      />
      <AdminPatrocinadoresClient
        sponsors={(sponsors ?? []) as AdminSponsor[]}
        staff={staffRows}
        banners={(banners ?? []) as BannerOption[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
