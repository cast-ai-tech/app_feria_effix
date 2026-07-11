import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminAlianzasClient, { type AdminOffer } from "./AdminAlianzasClient";

export default async function AdminAlianzasPage() {
  const access = await getAccess();
  const supabase = await createClient();

  // Admin (RLS: is_admin() ve también las inactivas).
  const { data } = await supabase
    .from("offers")
    .select(
      "id,title,partner_name,description,discount,referral_url,edition,active",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Alianzas"
        subtitle="Ofertas del marketplace y sus links de referido"
        backHref="/admin"
      />
      <AdminAlianzasClient
        offers={(data ?? []) as AdminOffer[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
