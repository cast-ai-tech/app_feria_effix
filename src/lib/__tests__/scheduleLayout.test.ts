import { describe, expect, it } from "vitest";
import { layoutDay, timeBounds, type ScheduleItem } from "@/lib/scheduleLayout";

const H = 3_600_000;
const item = (id: string, startH: number, endH: number): ScheduleItem => ({
  id,
  startMs: startH * H,
  endMs: endH * H,
});

describe("timeBounds", () => {
  it("redondea a horas completas", () => {
    const b = timeBounds([
      { id: "a", startMs: 10.25 * H, endMs: 11.5 * H },
      { id: "b", startMs: 12 * H, endMs: 13.75 * H },
    ]);
    expect(b.startMs).toBe(10 * H);
    expect(b.endMs).toBe(14 * H);
  });

  it("vacío → rango nulo", () => {
    expect(timeBounds([])).toEqual({ startMs: 0, endMs: 0 });
  });
});

describe("layoutDay", () => {
  it("sin solapes: todas en carril 0 con ancho completo", () => {
    const layout = layoutDay([item("a", 10, 11), item("b", 11, 12)]);
    expect(layout.get("a")).toEqual({ lane: 0, laneCount: 1 });
    expect(layout.get("b")).toEqual({ lane: 0, laneCount: 1 });
  });

  it("dos simultáneas: lado a lado (2 carriles)", () => {
    const layout = layoutDay([item("a", 10, 11), item("b", 10.5, 11.5)]);
    expect(layout.get("a")).toEqual({ lane: 0, laneCount: 2 });
    expect(layout.get("b")).toEqual({ lane: 1, laneCount: 2 });
  });

  it("cadena de solapes comparte laneCount aunque el máximo simultáneo sea 2", () => {
    // a solapa con b, b solapa con c — grupo único de 2 carriles.
    const layout = layoutDay([
      item("a", 10, 11),
      item("b", 10.5, 12),
      item("c", 11, 12.5),
    ]);
    expect(layout.get("a")?.laneCount).toBe(2);
    expect(layout.get("b")?.laneCount).toBe(2);
    expect(layout.get("c")?.laneCount).toBe(2);
    // c reutiliza el carril de a (que ya terminó).
    expect(layout.get("c")?.lane).toBe(0);
  });

  it("grupos separados no comparten anchos", () => {
    const layout = layoutDay([
      item("a", 9, 10),
      item("b", 9, 10),
      item("c", 14, 15),
    ]);
    expect(layout.get("a")?.laneCount).toBe(2);
    expect(layout.get("c")).toEqual({ lane: 0, laneCount: 1 });
  });
});
