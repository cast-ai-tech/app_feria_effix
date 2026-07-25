import { Handshake } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import GlassCard from "@/components/GlassCard";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

type Offer = {
  id: string;
  title: string;
  partner_name: string | null;
  description: string | null;
  discount: string | null;
  referral_url: string | null;
};

export default async function AlianzasPage() {
  const access = await getAccess();

  // Gate de acceso — Alianzas requiere boleta vigente de la edición en curso.
  if (!access.configured)
    return (
      <LockedModule
        title="Alianzas Estratégicas"
        subtitle="Ofertas negociadas por Feria Effix"
        reason="ticket"
        configured={false}
      />
    );
  if (!access.user)
    return (
      <LockedModule
        title="Alianzas Estratégicas"
        subtitle="Ofertas negociadas por Feria Effix"
        reason="login"
      />
    );
  if (!access.hasCurrentTicket && !access.isAdmin)
    return (
      <LockedModule
        title="Alianzas Estratégicas"
        subtitle="Ofertas negociadas por Feria Effix"
        reason="ticket"
      />
    );

  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("id,title,partner_name,description,discount,referral_url")
    .eq("active", true)
    .eq("edition", access.currentEdition)
    .order("created_at", { ascending: false });

  const offers = (data ?? []) as Offer[];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Alianzas Estratégicas"
        subtitle="Ofertas negociadas por Feria Effix"
        backHref="/"
      />

      <BannerSlot
        placement="module_top"
        moduleKey="alianzas"
        edition={access.currentEdition}
        className="mb-4"
      />
      {offers.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-6 w-6" aria-hidden />}
          title="Aún no hay ofertas"
          subtitle="Pronto publicaremos los beneficios exclusivos que negociamos con nuestros aliados para esta edición."
        />
      ) : (
        <>
          <SectionTitle className="mt-0">
            Beneficios exclusivos · Edición {access.currentEdition}
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {offers.map((o) => (
              <GlassCard key={o.id} sheen className="flex flex-col gap-2.5 p-5">
                <div>
                  <p className="text-[14px] font-black leading-tight text-brand-white">
                    {o.title}
                  </p>
                  {o.partner_name && (
                    <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[1px] text-brand-dim">
                      {o.partner_name}
                    </p>
                  )}
                </div>

                {o.discount && (
                  <p className="text-[12px] font-extrabold text-brand-lav">
                    {o.discount}
                  </p>
                )}

                {o.description && (
                  <p className="text-[11px] leading-relaxed text-brand-muted">
                    {o.description}
                  </p>
                )}

                {o.referral_url && (
                  <div className="pt-1">
                    <Button href={o.referral_url} fullWidth size="md">
                      Ver oferta →
                    </Button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
