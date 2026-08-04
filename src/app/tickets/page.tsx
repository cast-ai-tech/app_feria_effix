import { GraduationCap, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import TicketQR from "@/components/tickets/TicketQR";
import NoTicket from "@/components/tickets/NoTicket";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CachedTicket } from "@/lib/ticketStore";
import { FALLBACK_EDITION, formatEditionRange } from "@/lib/editions";

export default async function TicketsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Tu escarapela" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  // Auto-vinculación: reclama boletas importadas cuyo correo coincide.
  await supabase.rpc("claim_my_tickets");

  const [{ data: tickets }, { data: types }, { data: cfg }, { data: ed }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id,secret,totp_step,totp_digits,ticket_type,holder_name,edition,status",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("ticket_types").select("slug,label"),
      supabase
        .from("app_config")
        .select("value")
        .eq("key", "black_whatsapp_url")
        .maybeSingle(),
      supabase
        .from("editions")
        .select("year,name,starts_on,ends_on,days")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

  const label = (slug: string) =>
    types?.find((t) => t.slug === slug)?.label ?? slug;
  const blackUrl = cfg?.value ?? "https://wa.me/573000000000";
  const edition = ed
    ? {
        year: ed.year,
        name: ed.name,
        startsOn: ed.starts_on,
        endsOn: ed.ends_on,
        days: ed.days,
      }
    : FALLBACK_EDITION;

  const list = tickets ?? [];
  const serverTickets: CachedTicket[] = list.map((t) => ({
    id: t.id,
    secret: t.secret,
    step: t.totp_step,
    digits: t.totp_digits,
    tierSlug: t.ticket_type,
    tierLabel: label(t.ticket_type),
    holder: t.holder_name ?? user.email ?? "",
    edition: t.edition,
    status: t.status,
    cachedAt: 0,
  }));

  const hasAny = list.length > 0;
  const hasAcademiaAccess = list.some(
    (t) => t.status === "active" || t.status === "used",
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tu escarapela"
        subtitle="QR de acceso · funciona sin conexión"
        backHref="/"
      />
      <BannerSlot
        placement="module_top"
        moduleKey="tickets"
        edition={edition.year}
        className="mb-4"
      />

      {hasAny ? (
        <>
          <TicketQR serverTickets={serverTickets} />

          <GlassCard className="mt-4 flex flex-col divide-y divide-white/[0.06] p-2">
            <ListItem
              thumb={
                <MapPin
                  className="h-[18px] w-[18px] text-brand-white"
                  aria-hidden
                />
              }
              title="Plaza Mayor, Medellín"
              subtitle={formatEditionRange(edition)}
            />
            {hasAcademiaAccess && (
              <ListItem
                thumb={
                  <GraduationCap
                    className="h-[18px] w-[18px] text-brand-white"
                    aria-hidden
                  />
                }
                title="Incluye acceso a Academia"
                subtitle="De por vida, por haber comprado esta boleta"
                right={<Badge>Permanente</Badge>}
              />
            )}
          </GlassCard>
        </>
      ) : (
        <NoTicket accountEmail={user.email ?? ""} blackWhatsappUrl={blackUrl} />
      )}
    </div>
  );
}
