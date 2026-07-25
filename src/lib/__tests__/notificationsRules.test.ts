import { describe, expect, it } from "vitest";
import {
  canPushUser,
  canSendCampaign,
  marketingRemainingToday,
  matchesAudience,
  type UserSegment,
} from "@/lib/notificationsRules";

const user = (over: Partial<UserSegment> = {}): UserSegment => ({
  role: "marca",
  activeTiers: ["general"],
  optoutMarketing: false,
  ...over,
});

describe("matchesAudience — segmentación", () => {
  it("'all' targetea a todos", () => {
    expect(matchesAudience({ type: "all", value: null }, user())).toBe(true);
    expect(
      matchesAudience({ type: "all", value: null }, user({ role: null, activeTiers: [] })),
    ).toBe(true);
  });

  it("'rol' targetea solo el rol exacto", () => {
    expect(matchesAudience({ type: "rol", value: "marca" }, user())).toBe(true);
    expect(matchesAudience({ type: "rol", value: "agencia" }, user())).toBe(false);
    expect(matchesAudience({ type: "rol", value: null }, user())).toBe(false);
  });

  it("'tier' targetea por boleta activa", () => {
    expect(matchesAudience({ type: "tier", value: "general" }, user())).toBe(true);
    expect(matchesAudience({ type: "tier", value: "black" }, user())).toBe(false);
    expect(
      matchesAudience(
        { type: "tier", value: "black" },
        user({ activeTiers: ["black", "general"] }),
      ),
    ).toBe(true);
  });
});

describe("canPushUser — opt-out", () => {
  it("marketing respeta el opt-out", () => {
    expect(canPushUser("marketing", user({ optoutMarketing: true }))).toBe(false);
    expect(canPushUser("marketing", user())).toBe(true);
  });

  it("operativa SIEMPRE llega, incluso con opt-out", () => {
    expect(canPushUser("operativa", user({ optoutMarketing: true }))).toBe(true);
  });
});

describe("límite anti-spam de marketing", () => {
  it("descuenta lo enviado hoy", () => {
    expect(marketingRemainingToday(0, 2)).toBe(2);
    expect(marketingRemainingToday(1, 2)).toBe(1);
    expect(marketingRemainingToday(2, 2)).toBe(0);
    expect(marketingRemainingToday(5, 2)).toBe(0);
  });

  it("bloquea la campaña de marketing al llegar al límite", () => {
    expect(canSendCampaign("marketing", 1, 2)).toBe(true);
    expect(canSendCampaign("marketing", 2, 2)).toBe(false);
  });

  it("las operativas nunca se bloquean", () => {
    expect(canSendCampaign("operativa", 99, 2)).toBe(true);
  });
});
