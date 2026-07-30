import { describe, expect, it } from "vitest";
import {
  canAccessRing,
  EMPTY_ROLES,
  resolveRoles,
  resolveTicketAccess,
  resolveTicketTier,
  type TicketLike,
  type TypedTicketLike,
} from "@/lib/accessRules";

const EDITION = 2026;

describe("resolveTicketAccess", () => {
  it("sin boletas → sin anillo alumni ni boleta vigente", () => {
    expect(resolveTicketAccess([], EDITION)).toEqual({
      hasCurrentTicket: false,
      isAlumni: false,
    });
  });

  it("boleta activa de la edición en curso → ambos anillos", () => {
    const tickets: TicketLike[] = [{ edition: 2026, status: "active" }];
    expect(resolveTicketAccess(tickets, EDITION)).toEqual({
      hasCurrentTicket: true,
      isAlumni: true,
    });
  });

  it("boleta usada de una edición pasada → alumni de por vida, sin acceso vigente", () => {
    const tickets: TicketLike[] = [{ edition: 2024, status: "used" }];
    expect(resolveTicketAccess(tickets, EDITION)).toEqual({
      hasCurrentTicket: false,
      isAlumni: true,
    });
  });

  it("boleta activa de OTRA edición no cuenta como vigente", () => {
    const tickets: TicketLike[] = [{ edition: 2025, status: "active" }];
    expect(resolveTicketAccess(tickets, EDITION)).toEqual({
      hasCurrentTicket: false,
      isAlumni: true,
    });
  });

  it("boleta cancelada/reembolsada no da ningún anillo", () => {
    const tickets: TicketLike[] = [{ edition: 2026, status: "cancelled" }];
    expect(resolveTicketAccess(tickets, EDITION)).toEqual({
      hasCurrentTicket: false,
      isAlumni: false,
    });
  });

  it("mezcla: cancelada 2026 + usada 2024 → alumni sí, vigente no", () => {
    const tickets: TicketLike[] = [
      { edition: 2026, status: "cancelled" },
      { edition: 2024, status: "used" },
    ];
    expect(resolveTicketAccess(tickets, EDITION)).toEqual({
      hasCurrentTicket: false,
      isAlumni: true,
    });
  });
});

describe("canAccessRing — matriz por anillo", () => {
  const nadie = { isAdmin: false, isAlumni: false, hasCurrentTicket: false };
  const alumni = { isAdmin: false, isAlumni: true, hasCurrentTicket: false };
  const conBoleta = { isAdmin: false, isAlumni: true, hasCurrentTicket: true };
  const admin = { isAdmin: true, isAlumni: false, hasCurrentTicket: false };

  it("anillo open: cualquier registrado entra", () => {
    expect(canAccessRing("open", nadie)).toBe(true);
    expect(canAccessRing("open", alumni)).toBe(true);
    expect(canAccessRing("open", conBoleta)).toBe(true);
  });

  it("anillo alumni: solo alumni (o admin)", () => {
    expect(canAccessRing("alumni", nadie)).toBe(false);
    expect(canAccessRing("alumni", alumni)).toBe(true);
    expect(canAccessRing("alumni", conBoleta)).toBe(true);
    expect(canAccessRing("alumni", admin)).toBe(true);
  });

  it("anillo ticket: solo boleta vigente (o admin)", () => {
    expect(canAccessRing("ticket", nadie)).toBe(false);
    expect(canAccessRing("ticket", alumni)).toBe(false);
    expect(canAccessRing("ticket", conBoleta)).toBe(true);
    expect(canAccessRing("ticket", admin)).toBe(true);
  });
});

describe("resolveTicketTier — Fase 28", () => {
  const t = (
    ticket_type: string | null,
    edition = EDITION,
    status = "active",
  ): TypedTicketLike => ({ edition, status, ticket_type });

  it("sin boletas → sin tier", () => {
    expect(resolveTicketTier([], EDITION)).toBeNull();
  });

  it("una boleta activa de la edición → su tier", () => {
    expect(resolveTicketTier([t("general")], EDITION)).toBe("general");
    expect(resolveTicketTier([t("vip")], EDITION)).toBe("vip");
    expect(resolveTicketTier([t("black")], EDITION)).toBe("black");
    expect(resolveTicketTier([t("corporativa")], EDITION)).toBe("corporativa");
    expect(resolveTicketTier([t("diaria")], EDITION)).toBe("diaria");
  });

  it("varias boletas → gana la de mayor privilegio (black > vip > corporativa > general > diaria)", () => {
    expect(resolveTicketTier([t("general"), t("vip")], EDITION)).toBe("vip");
    expect(
      resolveTicketTier([t("vip"), t("black"), t("diaria")], EDITION),
    ).toBe("black");
    expect(resolveTicketTier([t("diaria"), t("corporativa")], EDITION)).toBe(
      "corporativa",
    );
  });

  it("ignora canceladas y otras ediciones", () => {
    expect(
      resolveTicketTier([t("black", EDITION, "cancelled")], EDITION),
    ).toBeNull();
    expect(resolveTicketTier([t("black", 2024)], EDITION)).toBeNull();
    expect(
      resolveTicketTier([t("black", EDITION, "used")], EDITION),
    ).toBeNull();
  });

  it("slug desconocido → tier null, pero el anillo ticket se conserva", () => {
    const tickets = [t("cortesia_prensa")];
    expect(resolveTicketTier(tickets, EDITION)).toBeNull();
    expect(resolveTicketAccess(tickets, EDITION).hasCurrentTicket).toBe(true);
  });

  it("es case-insensitive y tolera ticket_type null", () => {
    expect(resolveTicketTier([t("VIP")], EDITION)).toBe("vip");
    expect(resolveTicketTier([t(null)], EDITION)).toBeNull();
  });
});

describe("resolveRoles — Fase 28", () => {
  it("sin membresías → EMPTY_ROLES", () => {
    expect(
      resolveRoles({
        standIds: [],
        speakerIds: [],
        sponsorIds: [],
        staffRole: null,
      }),
    ).toEqual(EMPTY_ROLES);
  });

  it("cada membresía enciende su flag", () => {
    const r = resolveRoles({
      standIds: ["s1"],
      speakerIds: ["p1", "p2"],
      sponsorIds: ["sp1"],
      staffRole: "logistica",
    });
    expect(r.isExhibitor).toBe(true);
    expect(r.isSpeaker).toBe(true);
    expect(r.isSponsor).toBe(true);
    expect(r.isStaff).toBe(true);
    expect(r.speakerIds).toEqual(["p1", "p2"]);
    expect(r.staffRole).toBe("logistica");
  });

  it("multi-rol parcial: expositor sin ser ponente ni equipo", () => {
    const r = resolveRoles({
      standIds: ["s1"],
      speakerIds: [],
      sponsorIds: [],
      staffRole: null,
    });
    expect(r.isExhibitor).toBe(true);
    expect(r.isSpeaker).toBe(false);
    expect(r.isSponsor).toBe(false);
    expect(r.isStaff).toBe(false);
  });
});
