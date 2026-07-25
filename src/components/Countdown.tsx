"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import type { EditionInfo } from "@/lib/editions";
import { computeCountdownPhase, type CountdownPhase } from "@/lib/countdown";

type Phase = CountdownPhase;

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className="flip-digit font-black text-brand-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-caption text-brand-muted">{label}</span>
    </div>
  );
}

/**
 * Countdown del Home (Fase 23) — mismo concepto flip del sitio oficial.
 * La fecha SIEMPRE sale de la tabla `editions` (nunca hardcodeada).
 * Durante el evento muta a "Día X de N"; después se oculta solo.
 */
export default function Countdown({ edition }: { edition: EditionInfo }) {
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    const tick = () => setPhase(computeCountdownPhase(edition, Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [edition]);

  if (!phase || phase.kind === "over") return null;

  if (phase.kind === "live") {
    return (
      <GlassCard sheen className="mb-5 flex items-center justify-center gap-2 p-4">
        <span className="live-dot inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
        <p className="text-title text-brand-white">
          ¡Estamos en vivo! · Día {phase.dayNumber} de {phase.totalDays}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-5 flex flex-col items-center gap-3 p-4 md:p-5">
      <p className="text-caption text-brand-dim">
        {edition.name} · sólo faltan
      </p>
      <div className="mx-auto flex w-full max-w-[360px] items-stretch gap-2 md:max-w-[420px] md:gap-3">
        <Digit value={phase.days} label="días" />
        <Digit value={phase.hours} label="horas" />
        <Digit value={phase.minutes} label="min" />
      </div>
    </GlassCard>
  );
}
