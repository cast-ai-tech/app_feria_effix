import { afterEach, describe, expect, it, vi } from "vitest";
import { mapLocationToTicketType, signTiquetera } from "@/lib/tiquetera";

/** Ejemplo oficial de la doc: https://latiquetera.com/pages/docs/api_company_sales */
const DOC_SECRET =
  "YQ-Rkw6TtZIbcRDiuyl85uSMfNZPHdbXGDzmTPwletV1AQRZCiE_gPeLwk1Gntc_dL-fE4-FDROVBpRtS2efhAiEqVQp7d6XX8bE";
const DOC_EXPECTED_SIGNATURE =
  "dd11a261cae0a23b3b63372142d71d5df0413cd51a5691f690880dbea1cf1d07";

describe("signTiquetera", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reproduce el vector de ejemplo de la documentación", () => {
    vi.stubEnv("TIQUETERA_API_SECRET", DOC_SECRET);
    expect(signTiquetera("2024-03-12")).toBe(DOC_EXPECTED_SIGNATURE);
  });
});

describe("mapLocationToTicketType", () => {
  it("reconoce black, vip y corporativa por substring", () => {
    expect(mapLocationToTicketType("Black")).toBe("black");
    expect(mapLocationToTicketType("VIP")).toBe("vip");
    expect(mapLocationToTicketType("Platino")).toBe("vip");
    expect(mapLocationToTicketType("BOX 1")).toBe("vip");
    expect(mapLocationToTicketType("Corporativa")).toBe("corporativa");
    expect(mapLocationToTicketType("Equipo 10+")).toBe("corporativa");
  });

  it("cae en general por defecto", () => {
    expect(mapLocationToTicketType("General")).toBe("general");
    expect(mapLocationToTicketType("Testing")).toBe("general");
  });
});
