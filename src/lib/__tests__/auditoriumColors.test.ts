import { describe, expect, it } from "vitest";
import { auditoriumColor, FALLBACK_PALETTE } from "@/lib/auditoriumColors";

describe("auditoriumColor — colores del plano del recinto", () => {
  it("auditorios principales heredan el color de su pabellón", () => {
    expect(auditoriumColor("Auditorio Effix", [])).toBe("#22c55e");
    expect(auditoriumColor("Auditorio E-commerce", [])).toBe("#a855f7");
    expect(auditoriumColor("Auditorio Ecommerce", [])).toBe("#a855f7");
    expect(auditoriumColor("Auditorio Marketing", [])).toBe("#facc15");
    expect(auditoriumColor("Auditorio Creadores", [])).toBe("#ef4444");
  });

  it("auditorios pequeños patrocinados también tienen color propio", () => {
    expect(auditoriumColor("Auditorio Prendas Control", [])).toBe("#3b82f6");
    expect(auditoriumColor("Auditorio Unmerco", [])).toBe("#e8e8e8");
    expect(auditoriumColor("Auditorio Vitalcom", [])).toBe("#f59e0b");
    expect(auditoriumColor("Auditorio Convertmate", [])).toBe("#c084fc");
    expect(auditoriumColor("Sala Abierta 1", [])).toBe("#cbd5e1");
  });

  it("nombre desconocido cae a la paleta con índice estable", () => {
    const all = ["Tarima Central", "Otro Espacio"];
    expect(auditoriumColor("Tarima Central", all)).toBe(FALLBACK_PALETTE[0]);
    expect(auditoriumColor("Otro Espacio", all)).toBe(FALLBACK_PALETTE[1]);
  });

  it("null usa el último color del respaldo (sin crash)", () => {
    expect(auditoriumColor(null, [])).toBe(
      FALLBACK_PALETTE[FALLBACK_PALETTE.length - 1],
    );
  });
});
