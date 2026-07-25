import { describe, expect, it } from "vitest";
import { computePassportProgress } from "@/lib/passport";

const stamp = (standId: string, zone: string | null) => ({ standId, zone });

describe("computePassportProgress", () => {
  it("meta total: cuenta stands ÚNICOS (el doble sello no suma)", () => {
    const r = computePassportProgress(
      [stamp("a", "Norte"), stamp("a", "Norte"), stamp("b", "Sur")],
      { goalType: "total", goalValue: 3 },
      ["Norte", "Sur"],
    );
    expect(r.progress).toBe(2);
    expect(r.goalMet).toBe(false);
  });

  it("meta total alcanzada", () => {
    const r = computePassportProgress(
      [stamp("a", null), stamp("b", null), stamp("c", null)],
      { goalType: "total", goalValue: 3 },
      [],
    );
    expect(r.progress).toBe(3);
    expect(r.goalMet).toBe(true);
  });

  it("meta por_zona: cuenta zonas únicas e ignora sellos sin zona", () => {
    const r = computePassportProgress(
      [stamp("a", "Norte"), stamp("b", "Norte"), stamp("c", null), stamp("d", "Sur")],
      { goalType: "por_zona", goalValue: 3 },
      ["Norte", "Sur", "Centro"],
    );
    expect(r.progress).toBe(2);
    expect(r.goalMet).toBe(false);
    expect(r.zonesStamped.sort()).toEqual(["Norte", "Sur"]);
    expect(r.zonesMissing).toEqual(["Centro"]);
  });

  it("sin campaña activa: progreso informativo, nunca goalMet", () => {
    const r = computePassportProgress([stamp("a", "Norte")], null, ["Norte"]);
    expect(r.progress).toBe(1);
    expect(r.goalMet).toBe(false);
  });

  it("sin sellos: todas las zonas faltan", () => {
    const r = computePassportProgress(
      [],
      { goalType: "por_zona", goalValue: 2 },
      ["Norte", "Sur"],
    );
    expect(r.progress).toBe(0);
    expect(r.zonesMissing).toEqual(["Norte", "Sur"]);
  });
});
