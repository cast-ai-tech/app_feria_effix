import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  escapeIcsText,
  formatIcsDate,
  type IcsEvent,
} from "@/lib/ics";

const talk: IcsEvent = {
  uid: "talk-123",
  title: "IA aplicada al e-commerce",
  startsAt: "2026-11-05T14:00:00-05:00",
  endsAt: "2026-11-05T15:00:00-05:00",
  location: "Auditorio EFFIX",
  description: "Con María Pérez",
};

describe("escapeIcsText", () => {
  it("escapa comas, puntos y comas y saltos de línea (RFC 5545)", () => {
    expect(escapeIcsText("a,b;c\nd")).toBe("a\\,b\\;c\\nd");
  });

  it("escapa la barra invertida primero (no doble-escapa)", () => {
    expect(escapeIcsText("a\\,b")).toBe("a\\\\\\,b");
  });
});

describe("formatIcsDate", () => {
  it("convierte a UTC en formato compacto ICS", () => {
    // 14:00 -05 = 19:00 UTC
    expect(formatIcsDate("2026-11-05T14:00:00-05:00")).toBe("20261105T190000Z");
  });
});

describe("buildCalendar", () => {
  const ics = buildCalendar(
    "Feria Effix — Mi Agenda",
    [talk],
    "2026-08-03T12:00:00Z",
  );

  it("estructura VCALENDAR válida con nombre del calendario", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:Feria Effix — Mi Agenda");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("evento con UID estable (para actualizar en vez de duplicar)", () => {
    expect(ics).toContain("UID:talk-123@feriaeffix.com");
    expect(ics).toContain("DTSTART:20261105T190000Z");
    expect(ics).toContain("DTEND:20261105T200000Z");
    expect(ics).toContain("SUMMARY:IA aplicada al e-commerce");
    expect(ics).toContain("LOCATION:Auditorio EFFIX");
  });

  it("sin endsAt: default de 1 hora", () => {
    const single = buildCalendar(
      "Test",
      [{ ...talk, endsAt: null }],
      "2026-08-03T12:00:00Z",
    );
    expect(single).toContain("DTEND:20261105T200000Z");
  });

  it("usa CRLF como separador de líneas (RFC 5545)", () => {
    expect(ics).toContain("\r\n");
    expect(ics.split("\r\n").some((l) => l.includes("\n"))).toBe(false);
  });
});
