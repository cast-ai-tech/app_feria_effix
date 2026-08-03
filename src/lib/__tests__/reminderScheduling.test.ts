import { describe, expect, it } from "vitest";
import {
  computeReminderFireTime,
  talkReminderId,
} from "@/lib/reminderScheduling";

describe("computeReminderFireTime", () => {
  it("dispara leadMinutes antes del inicio cuando cae en el futuro", () => {
    const startsAt = new Date(Date.now() + 60 * 60_000).toISOString(); // +1h
    const fireAt = computeReminderFireTime(startsAt, 15);
    expect(fireAt).not.toBeNull();
    expect(fireAt).toBe(new Date(startsAt).getTime() - 15 * 60_000);
  });

  it("devuelve null si el disparo ya pasó (charla muy próxima o ya iniciada)", () => {
    const startsAt = new Date(Date.now() + 5 * 60_000).toISOString(); // +5min
    expect(computeReminderFireTime(startsAt, 15)).toBeNull();
  });

  it("devuelve null si la charla ya empezó", () => {
    const startsAt = new Date(Date.now() - 10 * 60_000).toISOString(); // -10min
    expect(computeReminderFireTime(startsAt, 15)).toBeNull();
  });
});

describe("talkReminderId", () => {
  it("es determinista para el mismo talkId", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(talkReminderId(id)).toBe(talkReminderId(id));
  });

  it("produce IDs distintos para talkIds distintos (sin colisión en el set de prueba)", () => {
    const ids = [
      "talk-1",
      "talk-2",
      "talk-3",
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "f0e1d2c3-b4a5-6789-0123-456789abcdef",
    ].map(talkReminderId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("siempre devuelve un entero positivo de 31 bits", () => {
    const id = talkReminderId("cualquier-uuid-de-charla");
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThanOrEqual(0x7fffffff);
  });
});
