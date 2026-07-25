"use client";

import { CircleCheck, Gift, Stamp, Trophy } from "lucide-react";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { computePassportProgress } from "@/lib/passport";
import { hapticSuccess } from "@/lib/platform/haptics";

export type Stamp = {
  standId: string;
  standName: string;
  zone: string | null;
  scannedAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  goalType: "total" | "por_zona";
  goalValue: number;
  prize: string | null;
};

export type PasaporteData = {
  stamps: Stamp[];
  campaign: Campaign | null;
  /** Zonas de la edición (para mostrar faltantes en modo por_zona). */
  allZones: string[];
  alreadyCompleted: boolean;
};

export default function PasaporteClient({ data }: { data: PasaporteData }) {
  const [celebrating, setCelebrating] = useState(false);
  const [completed, setCompleted] = useState(data.alreadyCompleted);
  const [claiming, setClaiming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const { stamps, campaign, allZones } = data;
  const { progress, goalMet, zonesMissing } = computePassportProgress(
    stamps,
    campaign,
    allZones,
  );
  const goal = campaign?.goalValue ?? null;

  async function claim() {
    if (!campaign) return;
    setClaiming(true);
    setNote(null);
    const supabase = createClient();
    const { data: res, error } = await supabase.rpc(
      "claim_passport_completion",
      { p_campaign: campaign.id },
    );
    setClaiming(false);
    if (error) {
      setNote(`Error: ${error.message}`);
      return;
    }
    const r = res as { status: string };
    if (r.status === "completed") {
      setCompleted(true);
      setCelebrating(true);
      hapticSuccess();
    } else if (r.status === "already") {
      setCompleted(true);
      setNote("Ya habías completado este pasaporte.");
    } else if (r.status === "not_met") {
      setNote("Aún te faltan sellos — ¡sigue recorriendo la feria!");
    } else {
      setNote("La campaña ya no está activa.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Meta de la campaña */}
      {campaign ? (
        <GlassCard sheen className="flex flex-col gap-2 p-5 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-brand-dim">
            {campaign.name}
          </p>
          <p className="text-[26px] font-black text-brand-white">
            {progress}
            <span className="text-brand-muted"> / {goal}</span>
          </p>
          <p className="text-[10.5px] text-brand-muted">
            {campaign.goalType === "total"
              ? "stands sellados"
              : "zonas visitadas"}
          </p>
          <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-white transition-[width]"
              style={{
                width: `${Math.min(100, (progress / (goal || 1)) * 100)}%`,
              }}
            />
          </div>
          {campaign.prize && (
            <p className="mt-1 text-[11px] font-bold text-brand-white">
              <Gift className="mr-1 inline h-3.5 w-3.5" aria-hidden />Premio: {campaign.prize}
            </p>
          )}

          {completed ? (
            <Badge dot>Pasaporte completado — reclama tu premio con el equipo Effix</Badge>
          ) : goalMet ? (
            <Button fullWidth variant="glow" onClick={claim} disabled={claiming}>
              {claiming ? "Validando…" : "¡Completé mi pasaporte!"}
            </Button>
          ) : null}
          {note && (
            <p className="text-[10.5px] font-semibold text-brand-white">{note}</p>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-5 text-center">
          <p className="text-[12px] font-extrabold text-brand-white">
            Sin campaña activa
          </p>
          <p className="mt-1 text-[10.5px] text-brand-muted">
            Tus sellos quedan guardados: cuando el equipo Effix active la
            campaña de premios, contarán todos.
          </p>
        </GlassCard>
      )}

      {/* Zonas faltantes */}
      {campaign?.goalType === "por_zona" && zonesMissing.length > 0 && (
        <GlassCard className="flex flex-col gap-2 p-4">
          <p className="text-[11px] font-extrabold text-brand-white">
            Zonas que te faltan
          </p>
          <div className="flex flex-wrap gap-2">
            {zonesMissing.map((z) => (
              <Badge key={z}>{z}</Badge>
            ))}
          </div>
          <Link
            href="/mapa"
            className="text-[10.5px] font-bold text-brand-lav underline"
          >
            Ver en el mapa →
          </Link>
        </GlassCard>
      )}

      {/* Sellos */}
      <div>
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-brand-dim">
          Mis sellos ({stamps.length})
        </p>
        {stamps.length === 0 ? (
          <GlassCard className="p-5 text-center">
            <Stamp className="mx-auto h-8 w-8 text-brand-lav" aria-hidden />
            <p className="mt-1 text-[11px] text-brand-muted">
              Visita un stand y pide que escaneen tu Credencial Effix: cada
              escaneo es un sello.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {stamps.map((s) => (
              <Link key={s.standId} href={`/stands`}>
                <GlassCard
                  className={cn(
                    "flex h-full flex-col items-center gap-1 p-3 text-center",
                  )}
                >
                  <CircleCheck className="h-5 w-5 text-emerald-300" aria-hidden />
                  <span className="text-[11px] font-extrabold leading-tight text-brand-white">
                    {s.standName}
                  </span>
                  <span className="text-[9px] text-brand-muted">
                    {[s.zone, s.scannedAt.slice(0, 10)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Celebración */}
      {celebrating && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-8 text-center"
          onClick={() => setCelebrating(false)}
        >
          <Trophy className="mx-auto h-16 w-16 text-brand-white" aria-hidden />
          <p className="mt-2 text-[20px] font-black text-brand-white">
            ¡Pasaporte completado!
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-brand-muted">
            Acércate al punto Effix para reclamar tu premio.
            <br />
            El equipo ya puede ver tu pasaporte completado.
          </p>
          <Button className="mt-6" onClick={() => setCelebrating(false)}>
            ¡Genial!
          </Button>
        </div>
      )}
    </div>
  );
}
