import { redirect } from "next/navigation";
import { Check, Crown, MessageCircle } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canAccessRing, type TicketTier } from "@/lib/accessRules";

/**
 * Estilo por tier — el mismo código oficial usado en la Credencial (Fase 23):
 * General/Corporativa/Diaria = lavanda · VIP = oro · Black = plata/cromo.
 */
const TIER_STYLES: Record<
  TicketTier,
  { card: string; dark: boolean; label: string }
> = {
  general: {
    card: "border-brand-lav/60 bg-brand-lav/20",
    dark: false,
    label: "General",
  },
  corporativa: {
    card: "border-brand-lav/60 bg-brand-lav/20",
    dark: false,
    label: "Corporativa",
  },
  diaria: {
    card: "border-brand-lav/60 bg-brand-lav/20",
    dark: false,
    label: "Diaria",
  },
  vip: {
    card: "tier-vip-bg tier-shine border-transparent",
    dark: true,
    label: "VIP",
  },
  black: {
    card: "tier-black-bg tier-shine border-transparent",
    dark: true,
    label: "Black",
  },
};

/** corporativa/diaria no tienen lista propia: heredan la de general. */
function benefitsKeyFor(tier: TicketTier | null): string | null {
  if (!tier) return null;
  if (tier === "corporativa" || tier === "diaria") return "benefits_general";
  return `benefits_${tier}`;
}

function parseBenefits(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * BENEFICIOS (Fase 28) — anillo BOLETA VIGENTE. La lista viene de
 * `app_config` (benefits_general|vip|black); nada hardcodeado.
 */
export default async function BeneficiosPage() {
  const a = await getAccess();

  if (!a.configured)
    return (
      <LockedModule title="Beneficios" reason="ticket" configured={false} />
    );
  if (!a.user) redirect("/ingresar");
  if (!canAccessRing("ticket", a))
    return (
      <LockedModule
        title="Beneficios"
        subtitle="Ventajas incluidas en tu boleta"
        reason="ticket"
      />
    );

  const supabase = await createClient();
  const { data: cfg } = await supabase
    .from("app_config")
    .select("key,value")
    .in("key", [
      "benefits_general",
      "benefits_vip",
      "benefits_black",
      "black_whatsapp_url",
    ]);

  const byKey = new Map((cfg ?? []).map((c) => [c.key, c.value as string]));
  const key = benefitsKeyFor(a.ticketTier);
  const benefits = parseBenefits(key ? byKey.get(key) : null);
  const style = a.ticketTier ? TIER_STYLES[a.ticketTier] : null;
  const blackWhatsappUrl = byKey.get("black_whatsapp_url");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Beneficios"
        subtitle="Lo que incluye tu boleta en esta edición"
        backHref="/"
      />

      {!a.ticketTier || !style ? (
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Sin tier de boleta reconocido
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            No encontramos un tipo de boleta válido para mostrar tus beneficios.
            Si crees que es un error, contacta al equipo Effix.
          </p>
        </GlassCard>
      ) : (
        <>
          <GlassCard className={`flex flex-col gap-1 p-5 ${style.card}`}>
            <span
              className={`flex items-center gap-2 text-[13px] font-black uppercase tracking-wide ${
                style.dark ? "text-black" : "text-brand-white"
              }`}
            >
              <Crown className="h-4 w-4" aria-hidden />
              Tier {style.label}
            </span>
            <span
              className={`text-[10.5px] font-semibold ${
                style.dark ? "text-black/70" : "text-brand-muted"
              }`}
            >
              Beneficios de tu boleta para {a.edition.name}
            </span>
          </GlassCard>

          {benefits.length === 0 ? (
            <p className="mt-4 text-[11px] text-brand-muted">
              Aún no hay beneficios publicados para este tier.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {benefits.map((b) => (
                <GlassCard key={b} className="flex items-center gap-3 p-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-brand-lav/50 bg-brand-lav/20">
                    <Check className="h-4 w-4 text-brand-white" aria-hidden />
                  </span>
                  <span className="text-[12px] font-semibold text-brand-white">
                    {b}
                  </span>
                </GlassCard>
              ))}
            </div>
          )}

          {a.ticketTier === "black" && blackWhatsappUrl && (
            <div className="mt-5">
              <Button
                href={blackWhatsappUrl}
                size="md"
                variant="solid"
                className="bg-black text-white"
              >
                <MessageCircle className="mr-2 inline h-4 w-4" aria-hidden />
                Soporte directo por WhatsApp
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
