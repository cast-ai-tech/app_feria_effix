import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueScan, flushScans, pendingScans } from "@/lib/connectQueue";

/** localStorage falso para que el adaptador de storage funcione en node. */
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

describe("cola offline de escaneos", () => {
  it("encola sin duplicados", async () => {
    stubLocalStorage();
    await enqueueScan("ABCD2345");
    await enqueueScan("ABCD2345");
    await enqueueScan("WXYZ7899");
    expect(await pendingScans()).toBe(2);
  });

  it("flush exitoso vacía la cola y reporta cuántos sincronizó", async () => {
    stubLocalStorage();
    await enqueueScan("ABCD2345");
    await enqueueScan("WXYZ7899");

    const sent: string[] = [];
    const n = await flushScans(async (code) => {
      sent.push(code);
      return { status: "connected" };
    });

    expect(n).toBe(2);
    expect(sent).toEqual(["ABCD2345", "WXYZ7899"]);
    expect(await pendingScans()).toBe(0);
  });

  it("si el envío falla a mitad (sin red), conserva lo pendiente", async () => {
    stubLocalStorage();
    await enqueueScan("AAAA2345");
    await enqueueScan("BBBB2345");
    await enqueueScan("CCCC2345");

    let calls = 0;
    const n = await flushScans(async () => {
      calls++;
      if (calls === 2) throw new Error("network down");
      return { status: "connected" };
    });

    expect(n).toBe(1); // solo el primero salió
    expect(await pendingScans()).toBe(2); // los otros dos siguen en cola
  });

  it("un resultado 'not_found' igual saca el ítem de la cola (ya llegó al servidor)", async () => {
    stubLocalStorage();
    await enqueueScan("DDDD2345");
    const n = await flushScans(async () => ({ status: "not_found" }));
    expect(n).toBe(1);
    expect(await pendingScans()).toBe(0);
  });
});
