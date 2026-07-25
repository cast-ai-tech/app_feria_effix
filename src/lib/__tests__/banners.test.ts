import { describe, expect, it } from "vitest";
import {
  ctr,
  filterLiveBanners,
  shouldRecordImpression,
  type BannerRow,
} from "@/lib/banners";

const base = (over: Partial<BannerRow> = {}): BannerRow => ({
  id: over.id ?? "b1",
  placement: "home_hero",
  module_key: null,
  title: "Sponsor",
  image_url: "https://x/img.png",
  link_url: null,
  sort_order: 100,
  starts_at: null,
  ends_at: null,
  active: true,
  ...over,
});

const NOW = new Date("2026-10-01T12:00:00-05:00").getTime();

describe("filterLiveBanners — el slot colapsa cuando no hay nada vivo", () => {
  it("sin banners → lista vacía (BannerSlot renderiza null)", () => {
    expect(filterLiveBanners([], NOW)).toEqual([]);
  });

  it("inactivos no se muestran", () => {
    expect(filterLiveBanners([base({ active: false })], NOW)).toEqual([]);
  });

  it("fuera de ventana no se muestran (antes de starts_at o después de ends_at)", () => {
    const early = base({ id: "e", starts_at: "2026-10-02T00:00:00-05:00" });
    const late = base({ id: "l", ends_at: "2026-09-30T00:00:00-05:00" });
    expect(filterLiveBanners([early, late], NOW)).toEqual([]);
  });

  it("dentro de ventana sí, ordenados por sort_order", () => {
    const a = base({ id: "a", sort_order: 200 });
    const b = base({
      id: "b",
      sort_order: 50,
      starts_at: "2026-09-01T00:00:00-05:00",
      ends_at: "2026-10-31T00:00:00-05:00",
    });
    expect(filterLiveBanners([a, b], NOW).map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("shouldRecordImpression — 1 por banner por sesión", () => {
  it("registra la primera vez y nunca más en la misma sesión", () => {
    const seen = new Set<string>();
    expect(shouldRecordImpression(seen, "b1")).toBe(true);
    expect(shouldRecordImpression(seen, "b1")).toBe(false);
    expect(shouldRecordImpression(seen, "b2")).toBe(true);
    expect(seen.size).toBe(2);
  });
});

describe("ctr", () => {
  it("clics / impresiones en %", () => {
    expect(ctr(200, 10)).toBe(5);
  });
  it("sin impresiones → 0 (sin división por cero)", () => {
    expect(ctr(0, 5)).toBe(0);
  });
});
