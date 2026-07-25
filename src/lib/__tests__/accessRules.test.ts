import { describe, expect, it } from "vitest";
import {
  canAccessRing,
  resolveTicketAccess,
  type TicketLike,
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
