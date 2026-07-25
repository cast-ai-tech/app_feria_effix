/**
 * Credencial Effix (Fase 14) — helpers PUROS del scan-to-connect.
 *
 * El QR de la credencial es ESTÁTICO y codifica effix://connect/{code}.
 * (A diferencia del QR TOTP de la boleta, aquí no hay secreto: el código
 * solo identifica el perfil para conectar.)
 */

export const CONNECT_SCHEME = "effix://connect/";

/** Payload que codifica el QR de la credencial. */
export function connectPayload(connectCode: string): string {
  return `${CONNECT_SCHEME}${connectCode.toUpperCase()}`;
}

/**
 * Extrae el connect_code de un texto escaneado. Acepta:
 *   - effix://connect/ABCD2345 (el QR propio de la app)
 *   - https://app.feriaeffix.com/credencial/conectar/ABCD2345 (deep link futuro)
 *   - el código pelado "ABCD2345" (ingreso manual)
 * Devuelve null si no parece un código válido.
 */
export function parseConnectPayload(raw: string): string | null {
  const text = (raw || "").trim();
  if (!text) return null;

  let candidate = text;
  const lower = text.toLowerCase();

  if (lower.startsWith(CONNECT_SCHEME)) {
    candidate = text.slice(CONNECT_SCHEME.length);
  } else if (lower.includes("/conectar/")) {
    candidate = text.slice(lower.lastIndexOf("/conectar/") + "/conectar/".length);
  }

  candidate = candidate.split(/[/?#]/)[0].trim().toUpperCase();

  // 8 chars del alfabeto sin ambiguos (ver generate_connect_code en SQL).
  return /^[A-HJ-NP-Z2-9]{8}$/.test(candidate) ? candidate : null;
}
