/**
 * Fase del countdown del Home (Fase 23) — lógica PURA, testeable.
 * Fechas SIEMPRE desde la tabla `editions` (vía EditionInfo).
 */

import type { EditionInfo } from "@/lib/editions";

const TZ_OFFSET = "-05:00"; // Medellín

export type CountdownPhase =
  | { kind: "countdown"; days: number; hours: number; minutes: number }
  | { kind: "live"; dayNumber: number; totalDays: number }
  | { kind: "over" };

export function computeCountdownPhase(
  edition: EditionInfo,
  nowMs: number,
): CountdownPhase {
  const start = new Date(`${edition.startsOn}T00:00:00${TZ_OFFSET}`).getTime();
  const end = new Date(`${edition.endsOn}T23:59:59${TZ_OFFSET}`).getTime();

  if (nowMs > end) return { kind: "over" };

  if (nowMs >= start) {
    const dayNumber = Math.min(
      edition.days,
      Math.floor((nowMs - start) / 86_400_000) + 1,
    );
    return { kind: "live", dayNumber, totalDays: edition.days };
  }

  const diff = start - nowMs;
  return {
    kind: "countdown",
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}
