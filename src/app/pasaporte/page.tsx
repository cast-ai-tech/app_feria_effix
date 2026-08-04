import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import PasaporteClient, {
  type PasaporteData,
} from "@/components/pasaporte/PasaporteClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * PASAPORTE DE STANDS (Fase 15) — anillo BOLETA VIGENTE.
 * Cada escaneo de tu credencial en un stand es un sello; completa la meta
 * de la campaña activa y reclama el premio.
 */
export default async function PasaportePage() {
  const a = await getAccess();

  if (!a.configured)
    return (
      <LockedModule title="Pasaporte" reason="ticket" configured={false} />
    );
  if (!a.user) return <LockedModule title="Pasaporte" reason="login" />;
  if (!a.hasCurrentTicket && !a.isAdmin)
    return <LockedModule title="Pasaporte" reason="ticket" />;

  const supabase = await createClient();

  const [{ data: scans }, { data: campaigns }, { data: zoneRows }] =
    await Promise.all([
      supabase
        .from("stand_scans")
        .select("stand_id,created_at,stands(name,zone,edition)")
        .eq("profile_id", a.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("passport_campaigns")
        .select("id,name,goal_type,goal_value,prize_description")
        .eq("edition", a.currentEdition)
        .eq("active", true)
        .limit(1),
      supabase
        .from("stands")
        .select("zone")
        .eq("edition", a.currentEdition)
        .not("zone", "is", null),
    ]);

  const campaign = campaigns?.[0] ?? null;

  let alreadyCompleted = false;
  if (campaign) {
    const { data: done } = await supabase
      .from("passport_completions")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("user_id", a.user.id)
      .maybeSingle();
    alreadyCompleted = !!done;
  }

  const data: PasaporteData = {
    stamps: (scans ?? [])
      .filter((s) => {
        const st = s.stands as unknown as { edition: number } | null;
        return st?.edition === a.currentEdition;
      })
      .map((s) => {
        const st = s.stands as unknown as {
          name: string;
          zone: string | null;
        } | null;
        return {
          standId: s.stand_id,
          standName: st?.name ?? "Stand",
          zone: st?.zone ?? null,
          scannedAt: s.created_at,
        };
      }),
    campaign: campaign
      ? {
          id: campaign.id,
          name: campaign.name,
          goalType: campaign.goal_type as "total" | "por_zona",
          goalValue: campaign.goal_value,
          prize: campaign.prize_description,
        }
      : null,
    allZones: [
      ...new Set((zoneRows ?? []).map((z) => z.zone).filter(Boolean)),
    ] as string[],
    alreadyCompleted,
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Pasaporte de stands"
        subtitle="Colecciona sellos visitando stands · gana premios"
        backHref="/"
      />
      <PasaporteClient data={data} />
      <BannerSlot
        placement="module_top"
        moduleKey="pasaporte"
        edition={a.currentEdition}
        className="mt-6"
      />
    </div>
  );
}
