import { createClient } from "@/lib/supabase/server";

/**
 * Lógica de negocio del portal del patrocinador (Fase 28).
 * Lecturas con el cliente normal: la RLS de la Fase 28 permite al
 * sponsor_staff leer sus sponsors, sus banners y sus banner_events.
 */

export type SponsorInfo = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  tier: "basico" | "plata" | "oro" | "diamante";
  edition: number;
  active: boolean;
};

export type SponsorBannerMetrics = {
  bannerId: string;
  title: string | null;
  placement: string;
  moduleKey: string | null;
  active: boolean;
  impressions: number;
  clicks: number;
  /** Porcentaje 0-100 con 1 decimal (0 si no hay impresiones). */
  ctr: number;
};

/** Patrocinadores donde el usuario es staff (vía sponsor_staff). */
export async function getMySponsors(userId: string): Promise<SponsorInfo[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("sponsor_staff")
    .select("sponsor_id")
    .eq("user_id", userId);
  const ids = (memberships ?? []).map((m) => m.sponsor_id);
  if (ids.length === 0) return [];

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id,name,logo_url,website,tier,edition,active")
    .in("id", ids)
    .order("name");
  return (sponsors ?? []) as SponsorInfo[];
}

/** Métricas (impresiones/clics/CTR) de los banners de esos sponsors. */
export async function getSponsorBannerMetrics(
  sponsorIds: string[],
): Promise<SponsorBannerMetrics[]> {
  if (sponsorIds.length === 0) return [];
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from("banners")
    .select("id,title,placement,module_key,active,sponsor_id")
    .in("sponsor_id", sponsorIds)
    .order("placement");
  if (!banners || banners.length === 0) return [];

  const { data: events } = await supabase
    .from("banner_events")
    .select("banner_id,event_type")
    .in(
      "banner_id",
      banners.map((b) => b.id),
    );

  const counters = new Map<string, { impressions: number; clicks: number }>();
  for (const e of events ?? []) {
    const c = counters.get(e.banner_id) ?? { impressions: 0, clicks: 0 };
    if (e.event_type === "impression") c.impressions += 1;
    if (e.event_type === "click") c.clicks += 1;
    counters.set(e.banner_id, c);
  }

  return banners.map((b) => {
    const c = counters.get(b.id) ?? { impressions: 0, clicks: 0 };
    const ctr =
      c.impressions > 0
        ? Math.round((c.clicks / c.impressions) * 1000) / 10
        : 0;
    return {
      bannerId: b.id,
      title: b.title,
      placement: b.placement,
      moduleKey: b.module_key,
      active: b.active,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr,
    };
  });
}
