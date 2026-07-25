/** Cálculo PURO del progreso del pasaporte (Fase 15) — testeable. */

export type PassportStamp = {
  standId: string;
  zone: string | null;
};

export type PassportCampaignRules = {
  goalType: "total" | "por_zona";
  goalValue: number;
};

export type PassportProgress = {
  /** Sellos que cuentan para la meta (stands únicos o zonas únicas). */
  progress: number;
  goalMet: boolean;
  /** Zonas ya selladas (únicas, sin null). */
  zonesStamped: string[];
  /** Zonas de la edición aún sin sello. */
  zonesMissing: string[];
};

export function computePassportProgress(
  stamps: PassportStamp[],
  campaign: PassportCampaignRules | null,
  allZones: string[],
): PassportProgress {
  const uniqueStands = new Set(stamps.map((s) => s.standId));
  const zonesStamped = [
    ...new Set(stamps.map((s) => s.zone).filter(Boolean)),
  ] as string[];
  const zonesMissing = allZones.filter((z) => !zonesStamped.includes(z));

  const progress = campaign
    ? campaign.goalType === "total"
      ? uniqueStands.size
      : zonesStamped.length
    : uniqueStands.size;

  return {
    progress,
    goalMet: campaign ? progress >= campaign.goalValue : false,
    zonesStamped,
    zonesMissing,
  };
}
