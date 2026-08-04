import { describe, expect, it } from "vitest";
import {
  bogotaDateKey,
  dateChipLabel,
  defaultDateKey,
} from "@/lib/agendaDates";

describe("bogotaDateKey", () => {
  it("convierte a fecha local de Medellín (-05)", () => {
    // 03:00 UTC = 22:00 del día ANTERIOR en Medellín.
    expect(bogotaDateKey("2026-10-16T03:00:00Z")).toBe("2026-10-15");
    expect(bogotaDateKey("2026-10-15T15:00:00Z")).toBe("2026-10-15");
  });
});

describe("dateChipLabel", () => {
  it("etiqueta corta en español", () => {
    // 2026-10-15 es jueves.
    const label = dateChipLabel("2026-10-15");
    expect(label).toContain("15");
    expect(label).toContain("oct");
  });
});

describe("defaultDateKey", () => {
  const keys = ["2026-10-15", "2026-10-16", "2026-11-02"];

  it("hoy si tiene items", () => {
    expect(defaultDateKey(keys, "2026-10-16")).toBe("2026-10-16");
  });

  it("la próxima fecha futura si hoy no tiene", () => {
    expect(defaultDateKey(keys, "2026-10-20")).toBe("2026-11-02");
  });

  it("la última si todas ya pasaron", () => {
    expect(defaultDateKey(keys, "2027-01-01")).toBe("2026-11-02");
  });

  it("null sin items", () => {
    expect(defaultDateKey([], "2026-10-16")).toBeNull();
  });
});
