/**
 * Simulacro de carga básico (Fase 21) sobre las RPCs de escaneo.
 * Objetivo: validar que connect_by_code / stand_scan_credencial aguantan
 * ráfagas del día del evento (50.000 asistentes potenciales).
 *
 * Requisitos:
 *   1. Instalar k6: https://k6.io/docs/get-started/installation/
 *   2. Un usuario de prueba con sesión: exporta su access_token JWT.
 *   3. Variables: BASE_URL (API de Supabase), ANON_KEY, USER_JWT, TARGET_CODE.
 *
 * Uso (local):
 *   k6 run -e BASE_URL=http://127.0.0.1:54321 -e ANON_KEY=... \
 *          -e USER_JWT=... -e TARGET_CODE=ABCD2345 scripts/k6-scan.js
 *
 * Nota: el rate limit de la Fase 21 (30 connect/min por usuario) hará que
 * la mayoría de requests de un MISMO usuario devuelvan error pasado el
 * umbral — eso es lo esperado; para carga real se necesitan muchos JWTs.
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // calentamiento
    { duration: "1m", target: 100 }, // pico de puertas abiertas
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // p95 bajo 800ms
    http_req_failed: ["rate<0.05"],
  },
};

const BASE = __ENV.BASE_URL || "http://127.0.0.1:54321";
const ANON = __ENV.ANON_KEY || "";
const JWT = __ENV.USER_JWT || "";
const CODE = __ENV.TARGET_CODE || "ABCD2345";

export default function scanBurst() {
  const res = http.post(
    `${BASE}/rest/v1/rpc/connect_by_code`,
    JSON.stringify({ p_code: CODE }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${JWT}`,
      },
    },
  );

  check(res, {
    "status 200 o rate-limited": (r) => r.status === 200 || r.status === 400,
  });
  sleep(0.5);
}
