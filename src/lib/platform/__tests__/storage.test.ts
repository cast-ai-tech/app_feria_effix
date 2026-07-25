import { afterEach, describe, expect, it, vi } from "vitest";
import { storage } from "@/lib/platform/storage";

/** Stub mínimo de localStorage sobre un Map. */
function stubLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adaptador storage (web)", () => {
  it("sin window (SSR) no revienta: get devuelve null, set/remove no-op", async () => {
    await expect(storage.get("x")).resolves.toBeNull();
    await expect(storage.set("x", "1")).resolves.toBeUndefined();
    await expect(storage.remove("x")).resolves.toBeUndefined();
  });

  it("set → get → remove ida y vuelta", async () => {
    vi.stubGlobal("window", { localStorage: stubLocalStorage() });

    await storage.set("efx.test", JSON.stringify({ a: 1 }));
    await expect(storage.get("efx.test")).resolves.toBe('{"a":1}');

    await storage.remove("efx.test");
    await expect(storage.get("efx.test")).resolves.toBeNull();
  });

  it("localStorage que lanza (modo privado/cuota) no rompe la app", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });

    await expect(storage.get("x")).resolves.toBeNull();
    await expect(storage.set("x", "1")).resolves.toBeUndefined();
    await expect(storage.remove("x")).resolves.toBeUndefined();
  });
});
