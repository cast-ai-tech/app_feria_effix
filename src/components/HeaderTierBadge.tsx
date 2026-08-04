"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { resolveTicketTier, type TicketTier } from "@/lib/accessRules";

/**
 * Insignia del tipo de acceso en el header (Fase 30) — al lado del logo,
 * antes de la campana: el tier de la boleta activa (General/VIP/Black…)
 * siempre visible, con el mismo código de color metálico de la Credencial
 * y Beneficios. Sin sesión o sin boleta vigente no renderiza nada.
 */

const TIER_LABEL: Record<TicketTier, string> = {
  general: "General",
  vip: "VIP",
  black: "Black",
  diaria: "Diaria",
  corporativa: "Corporativa",
};

const TIER_CLASS: Record<TicketTier, string> = {
  general: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  corporativa: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  diaria: "border-brand-lav/50 bg-brand-lav-glass text-brand-dim",
  vip: "tier-vip-bg border-transparent text-black",
  black: "tier-black-bg border-transparent text-black",
};

export default function HeaderTierBadge() {
  const pathname = usePathname();
  const [tier, setTier] = useState<TicketTier | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ed } = await supabase
        .from("editions")
        .select("year")
        .eq("is_active", true)
        .maybeSingle();
      if (!ed || cancelled) return;

      const { data: tickets } = await supabase
        .from("tickets")
        .select("edition,status,ticket_type")
        .eq("user_id", user.id);
      if (cancelled) return;
      setTier(resolveTicketTier(tickets ?? [], ed.year));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (
    !tier ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/proyector")
  ) {
    return null;
  }

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide",
        TIER_CLASS[tier],
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
