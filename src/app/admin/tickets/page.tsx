import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AdminTicketsClient, { type AdminTicket } from "./AdminTicketsClient";

export default async function AdminTicketsPage() {
  const access = await getAccess();
  const supabase = await createClient();

  const { data } = await supabase
    .from("tickets")
    .select(
      "id,holder_name,ticket_email,ticket_type,order_number,edition,status,user_id,source,refund_full",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Boletas"
        subtitle="Importar, asignar Black, reembolsos y transferencias"
        backHref="/admin"
      />
      <AdminTicketsClient
        tickets={(data ?? []) as AdminTicket[]}
        currentEdition={access.currentEdition}
      />
    </div>
  );
}
