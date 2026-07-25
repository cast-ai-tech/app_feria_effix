"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField } from "@/components/Field";
import { createCampaign, toggleCampaign, markRedeemed } from "./actions";

export type AdminCampaign = {
  id: string;
  name: string;
  goal_type: string;
  goal_value: number;
  prize_description: string | null;
  active: boolean;
  edition: number;
};

export type AdminCompletion = {
  id: string;
  campaign_name: string;
  full_name: string | null;
  completed_at: string;
  redeemed_at: string | null;
};

export default function AdminPasaporteClient({
  campaigns,
  completions,
  currentEdition,
  leadsPerStand,
}: {
  campaigns: AdminCampaign[];
  completions: AdminCompletion[];
  currentEdition: number;
  leadsPerStand: Array<{ name: string; count: number }>;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [goalType, setGoalType] = useState("total");

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  }

  function exportCompletionsCsv() {
    const header = "campaña,asistente,completado_el,canjeado_el";
    const lines = completions.map((c) =>
      [
        c.campaign_name,
        c.full_name ?? "",
        c.completed_at.slice(0, 16).replace("T", " "),
        c.redeemed_at ? c.redeemed_at.slice(0, 16).replace("T", " ") : "",
      ]
        .map((v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(","),
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pasaportes-completados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva campaña</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createCampaign, new FormData(form), () => form.reset());
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Nombre" name="name" placeholder="Pasaporte Effix 2026" required />
          <SelectField
            label="Tipo de meta"
            name="goal_type"
            value={goalType}
            onChange={setGoalType}
            options={[
              { value: "total", label: "Total de stands sellados" },
              { value: "por_zona", label: "Zonas del mapa visitadas" },
            ]}
          />
          <Field
            label={goalType === "total" ? "Cuántos stands" : "Cuántas zonas"}
            name="goal_value"
            placeholder="Ej. 10"
            required
          />
          <Field
            label="Premio"
            name="prize_description"
            placeholder="Ej. Camiseta oficial + sorteo de boleta 2027"
          />
          <input type="hidden" name="edition" value={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear campaña"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Campañas ({campaigns.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {campaigns.map((c) => (
          <GlassCard key={c.id} className="flex items-center justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-brand-white">
                {c.name}
              </p>
              <p className="truncate text-[10px] text-brand-muted">
                {c.goal_type === "total" ? "stands" : "zonas"}: {c.goal_value} ·
                Ed. {c.edition}
                {c.prize_description ? ` · Premio: ${c.prize_description}` : ""}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Badge dot={c.active}>{c.active ? "Activa" : "Inactiva"}</Badge>
              <form action={(fd) => run(toggleCampaign, fd)}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="activate" value={c.active ? "false" : "true"} />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  {c.active ? "Desactivar" : "Activar"}
                </button>
              </form>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <SectionTitle>Completados ({completions.length})</SectionTitle>
        {completions.length > 0 && (
          <button
            onClick={exportCompletionsCsv}
            className="inline-flex items-center gap-1 rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
          >
            <Download className="h-3 w-3" aria-hidden /> CSV
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {completions.length === 0 ? (
          <p className="text-[11px] text-brand-muted">
            Nadie ha completado el pasaporte todavía.
          </p>
        ) : (
          completions.map((c) => (
            <GlassCard key={c.id} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {c.full_name ?? "Asistente"}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {c.campaign_name} · {c.completed_at.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              {c.redeemed_at ? (
                <Badge>Canjeado</Badge>
              ) : (
                <form action={(fd) => run(markRedeemed, fd)}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300">
                    Marcar canjeado
                  </button>
                </form>
              )}
            </GlassCard>
          ))
        )}
      </div>

      <SectionTitle>Sellos por stand (leads)</SectionTitle>
      <div className="flex flex-col gap-1.5">
        {leadsPerStand.length === 0 ? (
          <p className="text-[11px] text-brand-muted">Sin escaneos todavía.</p>
        ) : (
          leadsPerStand.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-2"
            >
              <span className="truncate text-[11px] font-bold text-brand-white">
                {s.name}
              </span>
              <span className="text-[11px] font-extrabold text-brand-lav">
                {s.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
