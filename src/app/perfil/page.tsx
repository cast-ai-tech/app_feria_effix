import {
  Crown,
  Handshake,
  Mic,
  ShieldCheck,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import BannerSlot from "@/components/BannerSlot";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAccess } from "@/lib/access";
import type { TicketTier } from "@/lib/accessRules";

/** Etiqueta legible del tier de boleta (Fase 28). */
const TIER_LABEL: Record<TicketTier, string> = {
  general: "General",
  vip: "VIP",
  black: "Black",
  diaria: "Diaria",
  corporativa: "Corporativa",
};

/** Clases del badge por tier — mismo código de color oficial (metálico para VIP/Black). */
const TIER_BADGE_CLASS: Record<TicketTier, string> = {
  general: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  corporativa: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  diaria: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  vip: "tier-vip-bg border-transparent text-black",
  black: "tier-black-bg border-transparent text-black",
};

/** Portales por rol/tier a mostrar en el perfil (mismo estilo de enlace). */
type PortalLink = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export default async function PerfilPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi perfil" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }

  const a = await getAccess();

  if (!a.user) {
    redirect("/ingresar");
  }

  const supabase = await createClient();
  const [{ data: profile }, { data: activeEd }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name,country,role,bio,ticket_email,whatsapp,instagram,linkedin,share_whatsapp,share_instagram,share_linkedin,optout_marketing_push,is_admin",
      )
      .eq("id", a.user.id)
      .single(),
    supabase
      .from("editions")
      .select("year")
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  const currentEdition = activeEd?.year ?? a.currentEdition;

  const roleBadges: string[] = [];
  if (a.roles.isExhibitor) roleBadges.push("Expositor");
  if (a.roles.isSpeaker) roleBadges.push("Ponente");
  if (a.roles.isSponsor) roleBadges.push("Patrocinador");
  if (a.roles.isStaff) roleBadges.push("Equipo Effix");

  const portalLinks: PortalLink[] = [];
  if (a.roles.isExhibitor) {
    portalLinks.push({
      href: "/mi-stand",
      icon: Store,
      label: "Mi stand (portal del expositor)",
    });
  }
  if (a.roles.isSpeaker) {
    portalLinks.push({
      href: "/mi-charla",
      icon: Mic,
      label: "Mi charla (portal del ponente)",
    });
  }
  if (a.roles.isSponsor) {
    portalLinks.push({
      href: "/mi-patrocinio",
      icon: Handshake,
      label: "Mi patrocinio (portal del patrocinador)",
    });
  }
  if (a.roles.isStaff) {
    portalLinks.push({
      href: "/staff",
      icon: ShieldCheck,
      label: "Staff Effix",
    });
  }
  if (a.ticketTier) {
    portalLinks.push({
      href: "/beneficios",
      icon: Crown,
      label: `Beneficios ${TIER_LABEL[a.ticketTier]}`,
    });
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi perfil"
        subtitle="Estos datos alimentan tu tarjeta en Comunidad"
        backHref="/"
      />

      {(roleBadges.length > 0 || a.ticketTier) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {roleBadges.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
          {a.ticketTier && (
            <Badge className={TIER_BADGE_CLASS[a.ticketTier]}>
              {TIER_LABEL[a.ticketTier]}
            </Badge>
          )}
        </div>
      )}

      {profile?.is_admin && (
        <a
          href="/admin"
          className="mb-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-brand-lav-glass px-5 py-3 text-[12px] font-extrabold text-brand-white"
        >
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4" aria-hidden /> Panel de administrador
          </span>
          <span className="text-brand-muted">›</span>
        </a>
      )}

      {portalLinks.map((p) => (
        <a
          key={p.href}
          href={p.href}
          className="mb-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-brand-lav-glass px-5 py-3 text-[12px] font-extrabold text-brand-white"
        >
          <span className="flex items-center gap-2">
            <p.icon className="h-4 w-4" aria-hidden /> {p.label}
          </span>
          <span className="text-brand-muted">›</span>
        </a>
      ))}

      <ProfileForm
        email={a.user.email}
        initial={{
          full_name: profile?.full_name ?? "",
          country: profile?.country ?? "",
          role: profile?.role ?? "",
          bio: profile?.bio ?? "",
          ticket_email: profile?.ticket_email ?? a.user.email,
          whatsapp: profile?.whatsapp ?? "",
          instagram: profile?.instagram ?? "",
          linkedin: profile?.linkedin ?? "",
          share_whatsapp: profile?.share_whatsapp ?? true,
          share_instagram: profile?.share_instagram ?? true,
          share_linkedin: profile?.share_linkedin ?? true,
          optout_marketing_push: profile?.optout_marketing_push ?? false,
        }}
      />

      {/* Franja de patrocinadores (Fase 24) */}
      <BannerSlot
        placement="footer_strip"
        edition={currentEdition}
        className="mt-8"
      />
    </div>
  );
}
