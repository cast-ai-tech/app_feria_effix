import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enqueueStandScan,
  flushStandScans,
  pendingStandScans,
} from "@/lib/standScanQueue";

function stubLocalStorage() {
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cola offline del modo stand", () => {
  it("no duplica el mismo par stand+código, pero sí el mismo código en otro stand", async () => {
    stubLocalStorage();
    await enqueueStandScan("stand-1", "ABCD2345");
    await enqueueStandScan("stand-1", "ABCD2345");
    await enqueueStandScan("stand-2", "ABCD2345");
    expect(await pendingStandScans()).toBe(2);
  });

  it("flush envía en orden y vacía; corte a mitad conserva pendientes", async () => {
    stubLocalStorage();
    await enqueueStandScan("s1", "AAAA2345");
    await enqueueStandScan("s1", "BBBB2345");

    let calls = 0;
    const n = await flushStandScans(async () => {
      calls++;
      if (calls === 2) throw new Error("offline");
      return { status: "sealed" };
    });
    expect(n).toBe(1);
    expect(await pendingStandScans()).toBe(1);

    const n2 = await flushStandScans(async () => ({ status: "already" }));
    expect(n2).toBe(1);
    expect(await pendingStandScans()).toBe(0);
  });
});
