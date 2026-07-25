/**
 * TOTP (RFC 6238) sobre Web Crypto — sin dependencias y sin red.
 *
 * Se usa para la "clave dinámica" de la boleta:
 *   - El servidor genera un `secret` (base32) único por boleta y lo guarda.
 *   - El dispositivo del dueño descarga ese secret una vez (con conexión) y
 *     lo guarda localmente (adaptador de storage, ver ticketStore.ts).
 *   - A partir de ahí el código rotativo se calcula EN EL DISPOSITIVO con la
 *     hora del sistema, sin necesitar internet. Una captura de pantalla
 *     caduca a los `step` segundos, así que no sirve para falsificar acceso.
 *
 * `crypto.subtle` existe tanto en el navegador como en Node 20+, así que este
 * módulo corre en ambos lados sin cambios.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Genera un secret aleatorio en base32 (por defecto 20 bytes = 160 bits). */
export function generateSecret(bytes = 20): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base32Encode(buf);
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue; // ignora caracteres inválidos
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

/** Contador de 8 bytes big-endian para HMAC (RFC 4226). */
function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  // JS no maneja bien >2^53 con bit-shift, pero para timestamps/step cabe
  // sobradamente en la parte baja; llenamos con aritmética segura.
  let c = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return buf;
}

type TotpOptions = {
  /** Segundos por ventana (rotación). Debe coincidir con totp_step de la boleta. */
  step?: number;
  /** Longitud del código. Debe coincidir con totp_digits de la boleta. */
  digits?: number;
  /** Momento a evaluar en ms (por defecto Date.now()). */
  nowMs?: number;
};

/**
 * Calcula el código TOTP para un secret base32.
 * Devuelve el código (string con ceros a la izquierda) y cuántos ms faltan
 * para que rote — útil para el temporizador visual.
 */
export async function computeTotp(
  secretBase32: string,
  { step = 30, digits = 8, nowMs = Date.now() }: TotpOptions = {},
): Promise<{ code: string; secondsRemaining: number; step: number }> {
  const nowSec = Math.floor(nowMs / 1000);
  const counter = Math.floor(nowSec / step);

  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secretBase32) as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counterBytes(counter) as BufferSource),
  );

  // Truncamiento dinámico (RFC 4226 §5.3)
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);

  const code = (binary % 10 ** digits).toString().padStart(digits, "0");
  const secondsRemaining = step - (nowSec % step);
  return { code, secondsRemaining, step };
}

/**
 * Verifica un código contra el secret, aceptando una ventana de tolerancia
 * (por defecto ±1 paso, para desfases de reloj). Uso en el lado del escáner
 * de acceso (server). No se usa en el cliente.
 */
export async function verifyTotp(
  secretBase32: string,
  code: string,
  { step = 30, digits = 8, window = 1, nowMs = Date.now() }: TotpOptions & { window?: number } = {},
): Promise<boolean> {
  for (let w = -window; w <= window; w++) {
    const { code: expected } = await computeTotp(secretBase32, {
      step,
      digits,
      nowMs: nowMs + w * step * 1000,
    });
    if (expected === code.trim()) return true;
  }
  return false;
}

/** Contenido que se codifica en el QR (lo lee el escáner de acceso). */
export function qrPayload(ticketId: string, code: string): string {
  return `EFX1|${ticketId}|${code}`;
}
