import { describe, expect, it } from "vitest";
import { computeCountdownPhase } from "@/lib/countdown";
import { FALLBACK_EDITION } from "@/lib/editions";

// Edición 2026: 15–19 de octubre, 5 días (hora Medellín -05).
const ED = FALLBACK_EDITION;
const ms = (iso: string) => new Date(iso).getTime();

describe("computeCountdownPhase", () => {
  it("antes del evento → cuenta regresiva con días/horas/minutos", () => {
    const p = computeCountdownPhase(ED, ms("2026-10-13T00:00:00-05:00"));
    expect(p).toEqual({ kind: "countdown", days: 2, hours: 0, minutes: 0 });
  });

  it("faltando 90 minutos → 0 días, 1 hora, 30 min", () => {
    const p = computeCountdownPhase(ED, ms("2026-10-14T22:30:00-05:00"));
    expect(p).toEqual({ kind: "countdown", days: 0, hours: 1, minutes: 30 });
  });

  it("durante el evento → Día X de 5", () => {
    expect(
      computeCountdownPhase(ED, ms("2026-10-15T08:00:00-05:00")),
    ).toEqual({ kind: "live", dayNumber: 1, totalDays: 5 });
    expect(
      computeCountdownPhase(ED, ms("2026-10-17T12:00:00-05:00")),
    ).toEqual({ kind: "live", dayNumber: 3, totalDays: 5 });
    expect(
      computeCountdownPhase(ED, ms("2026-10-19T23:00:00-05:00")),
    ).toEqual({ kind: "live", dayNumber: 5, totalDays: 5 });
  });

  it("después del evento → over (el widget se oculta)", () => {
    expect(
      computeCountdownPhase(ED, ms("2026-10-20T00:30:00-05:00")),
    ).toEqual({ kind: "over" });
  });
});
