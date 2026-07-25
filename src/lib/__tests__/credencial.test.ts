import { describe, expect, it } from "vitest";
import { connectPayload, parseConnectPayload } from "@/lib/credencial";

describe("connectPayload / parseConnectPayload", () => {
  it("arma el payload del QR y lo vuelve a parsear", () => {
    const payload = connectPayload("abcd2345".toUpperCase());
    expect(payload).toBe("effix://connect/ABCD2345");
    expect(parseConnectPayload(payload)).toBe("ABCD2345");
  });

  it("acepta el código pelado (ingreso manual), normalizando mayúsculas", () => {
    expect(parseConnectPayload(" abcd2345 ")).toBe("ABCD2345");
  });

  it("acepta el deep link https con /conectar/", () => {
    expect(
      parseConnectPayload(
        "https://app.feriaeffix.com/credencial/conectar/ABCD2345",
      ),
    ).toBe("ABCD2345");
  });

  it("rechaza QRs ajenos (URLs, texto, boleta TOTP)", () => {
    expect(parseConnectPayload("https://example.com")).toBeNull();
    expect(parseConnectPayload("EFX1|abc-123|94287082")).toBeNull();
    expect(parseConnectPayload("hola mundo")).toBeNull();
    expect(parseConnectPayload("")).toBeNull();
  });

  it("rechaza códigos con caracteres ambiguos o largo incorrecto", () => {
    expect(parseConnectPayload("ABCD234")).toBeNull(); // 7 chars
    expect(parseConnectPayload("ABCD23450")).toBeNull(); // 9 chars
    expect(parseConnectPayload("ABCD234O")).toBeNull(); // 'O' no está en el alfabeto
    expect(parseConnectPayload("ABCD2341")).toBeNull(); // '1' no está en el alfabeto
  });

  it("ignora query strings y fragmentos pegados al código", () => {
    expect(parseConnectPayload("effix://connect/ABCD2345?x=1")).toBe("ABCD2345");
  });
});
