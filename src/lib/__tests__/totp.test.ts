import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  computeTotp,
  generateSecret,
  qrPayload,
  verifyTotp,
} from "@/lib/totp";

/**
 * Vectores oficiales del RFC 6238 (Apéndice B) para HMAC-SHA1, 8 dígitos,
 * step 30. El secret es el ASCII "12345678901234567890" en base32.
 */
const RFC_SECRET_B32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

const RFC_VECTORS: Array<{ timeSec: number; code: string }> = [
  { timeSec: 59, code: "94287082" },
  { timeSec: 1111111109, code: "07081804" },
  { timeSec: 1111111111, code: "14050471" },
  { timeSec: 1234567890, code: "89005924" },
  { timeSec: 2000000000, code: "69279037" },
];

describe("computeTotp — vectores RFC 6238", () => {
  for (const v of RFC_VECTORS) {
    it(`t=${v.timeSec}s → ${v.code}`, async () => {
      const { code } = await computeTotp(RFC_SECRET_B32, {
        step: 30,
        digits: 8,
        nowMs: v.timeSec * 1000,
      });
      expect(code).toBe(v.code);
    });
  }

  it("reporta los segundos restantes de la ventana", async () => {
    const { secondsRemaining, step } = await computeTotp(RFC_SECRET_B32, {
      step: 30,
      digits: 8,
      nowMs: 59_000, // segundo 59 → quedan 1s de la ventana [30,60)
    });
    expect(step).toBe(30);
    expect(secondsRemaining).toBe(1);
  });
});

describe("verifyTotp", () => {
  it("acepta el código de la ventana actual", async () => {
    const ok = await verifyTotp(RFC_SECRET_B32, "94287082", {
      step: 30,
      digits: 8,
      nowMs: 59_000,
    });
    expect(ok).toBe(true);
  });

  it("acepta un código de la ventana anterior (tolerancia ±1)", async () => {
    // Código de t=59 verificado en t=61 (ventana siguiente).
    const ok = await verifyTotp(RFC_SECRET_B32, "94287082", {
      step: 30,
      digits: 8,
      nowMs: 61_000,
    });
    expect(ok).toBe(true);
  });

  it("rechaza un código fuera de la tolerancia", async () => {
    const ok = await verifyTotp(RFC_SECRET_B32, "94287082", {
      step: 30,
      digits: 8,
      nowMs: 1_234_567_890_000,
    });
    expect(ok).toBe(false);
  });

  it("rechaza códigos malformados", async () => {
    const ok = await verifyTotp(RFC_SECRET_B32, "no-es-un-codigo", {
      step: 30,
      digits: 8,
      nowMs: 59_000,
    });
    expect(ok).toBe(false);
  });
});

describe("base32", () => {
  it("codifica y decodifica ida y vuelta", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it("decodifica el secret RFC al ASCII esperado", () => {
    const decoded = base32Decode(RFC_SECRET_B32);
    expect(new TextDecoder().decode(decoded)).toBe("12345678901234567890");
  });

  it("ignora padding y espacios", () => {
    expect(base32Decode("GEZD GNBV ==")).toEqual(base32Decode("GEZDGNBV"));
  });
});

describe("generateSecret / qrPayload", () => {
  it("genera secrets base32 válidos y distintos", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(base32Decode(a).length).toBe(20);
    expect(a).not.toBe(b);
  });

  it("arma el payload del QR con el formato del escáner", () => {
    expect(qrPayload("abc-123", "94287082")).toBe("EFX1|abc-123|94287082");
  });
});
