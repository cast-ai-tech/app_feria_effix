"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  filterLiveBanners,
  shouldShowSplash,
  markSplashShown,
  type BannerRow,
} from "@/lib/banners";

/**
 * SPLASH DE PATROCINIO (Fase 24): al abrir la app, UNA vez por sesión,
 * pantalla "Con el apoyo de" con el logo del patrocinador durante 2.5s
 * (skippable con tap). Solo aparece si hay un banner splash_sponsor
 * activo de la edición vigente — si no, no existe.
 */
export default function SplashSponsor() {
  const [banner, setBanner] = useState<BannerRow | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowSplash()) return;
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      // Edición activa (nunca hardcodeada).
      const { data: ed } = await supabase
        .from("editions")
        .select("year")
        .eq("is_active", true)
        .maybeSingle();
      if (!ed || cancelled) return;

      const { data } = await supabase
        .from("banners")
        .select(
          "id,placement,module_key,title,image_url,link_url,sort_order,starts_at,ends_at,active",
        )
        .eq("edition", ed.year)
        .eq("placement", "splash_sponsor")
        .eq("active", true)
        .order("sort_order")
        .limit(5);
      if (cancelled) return;

      const live = filterLiveBanners((data ?? []) as BannerRow[], Date.now());
      const first = live[0];
      if (!first) return;

      markSplashShown();
      setBanner(first);
      setVisible(true);

      // Impresión del splash.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      void supabase.from("banner_events").insert({
        banner_id: first.id,
        event_type: "impression",
        user_id: user?.id ?? null,
      });

      window.setTimeout(() => setVisible(false), 2500);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !banner) return null;

  return (
    <button
      aria-label="Continuar"
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[60] flex w-full flex-col items-center justify-center gap-5 bg-black"
    >
      <p className="text-caption text-brand-muted">Con el apoyo de</p>
      <div className="relative h-32 w-56">
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          sizes="224px"
          className="object-contain"
          priority
        />
      </div>
      <p className="text-[11px] font-bold text-brand-dim">{banner.title}</p>
      <p className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] text-[10px] text-brand-muted">
        Toca para continuar
      </p>
    </button>
  );
}
