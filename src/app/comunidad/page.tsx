import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import ComunidadClient, {
  type CommunityMember,
} from "@/components/comunidad/ComunidadClient";

export default async function ComunidadPage() {
  // Comunidad es ABIERTA a cualquier usuario registrado (sin boleta).
  const a = await getAccess();
  if (!a.configured)
    return <LockedModule title="Comunidad" reason="login" configured={false} />;
  if (!a.user) return <LockedModule title="Comunidad" reason="login" />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("community_directory")
    .select("id,full_name,country,role,bio,whatsapp,instagram,linkedin")
    .limit(1000);

  // Solo perfiles con nombre (evita filas vacías en el directorio).
  const members = ((data ?? []) as CommunityMember[]).filter(
    (m) => (m.full_name ?? "").trim().length > 0,
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Comunidad"
        subtitle="Conecta con la comunidad Effix · abierto para todos"
        backHref="/"
      />
      <ComunidadClient members={members} />
    </div>
  );
}
