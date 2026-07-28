import { describe, expect, it } from "vitest";
import {
  buildWatchProgressPayload,
  clampSeconds,
  formatTime,
  resolveCompleted,
  shouldPersistTick,
} from "@/lib/watchProgress";

describe("shouldPersistTick", () => {
  it("no persiste antes del intervalo mínimo", () => {
    expect(shouldPersistTick(1000, 1000 + 4999, 5000)).toBe(false);
  });

  it("persiste justo al cumplirse el intervalo", () => {
    expect(shouldPersistTick(1000, 1000 + 5000, 5000)).toBe(true);
  });

  it("persiste si ya pasó de sobra", () => {
    expect(shouldPersistTick(0, 60_000, 5000)).toBe(true);
  });
});

describe("resolveCompleted", () => {
  it("false con duración desconocida (0)", () => {
    expect(resolveCompleted(100, 0)).toBe(false);
  });

  it("frontera: 89% no completa, 90% sí", () => {
    expect(resolveCompleted(89, 100, 0.9)).toBe(false);
    expect(resolveCompleted(90, 100, 0.9)).toBe(true);
  });

  it("respeta un umbral distinto", () => {
    expect(resolveCompleted(50, 100, 0.5)).toBe(true);
    expect(resolveCompleted(49, 100, 0.5)).toBe(false);
  });
});

describe("clampSeconds", () => {
  it("recorta negativos a 0", () => {
    expect(clampSeconds(-5, 100)).toBe(0);
  });

  it("recorta overshoot a la duración conocida", () => {
    expect(clampSeconds(150, 100)).toBe(100);
  });

  it("no recorta si la duración es desconocida (0)", () => {
    expect(clampSeconds(150, 0)).toBe(150);
  });

  it("deja pasar valores dentro de rango", () => {
    expect(clampSeconds(42, 100)).toBe(42);
  });
});

describe("buildWatchProgressPayload", () => {
  it("arma la fila con completed calculado por defecto", () => {
    const payload = buildWatchProgressPayload({
      userId: "u1",
      recordingId: "r1",
      seconds: 95,
      durationSeconds: 100,
    });
    expect(payload).toEqual({
      user_id: "u1",
      recording_id: "r1",
      seconds: 95,
      duration_seconds: 100,
      completed: true,
    });
  });

  it("permite forzar completed (p.ej. al terminar el video)", () => {
    const payload = buildWatchProgressPayload({
      userId: "u1",
      recordingId: "r1",
      seconds: 10,
      durationSeconds: 100,
      completed: true,
    });
    expect(payload.completed).toBe(true);
  });

  it("trunca decimales y recorta overshoot", () => {
    const payload = buildWatchProgressPayload({
      userId: "u1",
      recordingId: "r1",
      seconds: 150.7,
      durationSeconds: 100.2,
    });
    expect(payload.seconds).toBe(100);
    expect(payload.duration_seconds).toBe(100);
  });
});

describe("formatTime", () => {
  it("formatea segundos bajo un minuto", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
  });

  it("formatea minutos:segundos", () => {
    expect(formatTime(65)).toBe("1:05");
  });

  it("formatea horas:minutos:segundos", () => {
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("ignora negativos", () => {
    expect(formatTime(-10)).toBe("0:00");
  });
});
