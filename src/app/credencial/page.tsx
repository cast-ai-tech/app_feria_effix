import { Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import CredencialClient, {
  type CredencialData,
} from "@/components/credencial/CredencialClient";
import StandModeCard, {
  type StaffStand,
} from "@/components/credencial/StandModeCard";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * CREDENCIAL EFFIX (Fase 14) — anillo ABIERTO: solo requiere estar
 * registrado. El networking es el gancho de la app. El tier visual
 * (General/VIP/Black) solo aparece con boleta vigente.
 */
export default async function CredencialPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi credencial" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("connect_code,full_name,country,role")
    .eq("id", a.user.id)
    .single();

  // Tier visual solo con boleta vigente de la edición activa.
  let tier: string | null = null;
  let tierLabel: string | null = null;
  if (a.hasCurrentTicket) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("ticket_type, ticket_types(label)")
      .eq("user_id", a.user.id)
      .eq("edition", a.currentEdition)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    tier = ticket?.ticket_type ?? null;
    const tt = ticket?.ticket_types as unknown as { label: string } | null;
    tierLabel = tt?.label ?? null;
  }

  const data: CredencialData = {
    connectCode: profile?.connect_code ?? "",
    fullName: profile?.full_name ?? "",
    role: profile?.role ?? null,
    country: profile?.country ?? null,
    tier,
    tierLabel,
  };

  // Modo stand (Fase 15): solo para staff autorizado por el admin.
  const { data: staffRows } = await supabase
    .from("stand_staff")
    .select("stand_id, stands(name)")
    .eq("user_id", a.user.id);
  const staffStands: StaffStand[] = (staffRows ?? []).map((r) => {
    const stand = r.stands as unknown as { name: string } | null;
    return { id: r.stand_id, name: stand?.name ?? "Stand" };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi credencial"
        subtitle="Tu identidad dentro de la feria · escanea para conectar"
        backHref="/"
      />
      <CredencialClient data={data} />
      {staffStands.length > 0 && (
        <div className="mt-4">
          <StandModeCard stands={staffStands} />
        </div>
      )}
      <Link
        href="/credencial/contactos"
        className="mt-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-white/[0.04] px-5 py-3 text-[12px] font-extrabold text-brand-white"
      >
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden /> Mis contactos Effix
        </span>
        <span className="text-brand-muted">›</span>
      </Link>
      <BannerSlot
        placement="module_top"
        moduleKey="credencial"
        edition={a.currentEdition}
        className="mt-6"
      />
    </div>
  );
}
