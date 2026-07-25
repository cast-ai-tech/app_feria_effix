import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import ContactosClient, {
  type ContactRow,
} from "@/components/credencial/ContactosClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/** Mis contactos Effix (Fase 14) — anillo abierto, requiere login. */
export default async function ContactosPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mis contactos" backHref="/credencial" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("connections")
    .select("connected_profile_id,note,created_at")
    .eq("owner_id", a.user.id)
    .order("created_at", { ascending: false });

  const list = connections ?? [];
  const ids = list.map((c) => c.connected_profile_id);

  const { data: profiles } = ids.length
    ? await supabase
        .from("community_directory")
        .select("id,full_name,country,role,whatsapp,instagram,linkedin")
        .in("id", ids)
    : { data: [] };

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const contacts: ContactRow[] = list.map((c) => {
    const p = byId.get(c.connected_profile_id);
    return {
      profileId: c.connected_profile_id,
      fullName: p?.full_name ?? null,
      country: p?.country ?? null,
      role: p?.role ?? null,
      whatsapp: p?.whatsapp ?? null,
      instagram: p?.instagram ?? null,
      linkedin: p?.linkedin ?? null,
      note: c.note,
      createdAt: c.created_at,
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mis contactos Effix"
        subtitle="La libreta de contactos de tu feria"
        backHref="/credencial"
      />
      <ContactosClient contacts={contacts} />
    </div>
  );
}
