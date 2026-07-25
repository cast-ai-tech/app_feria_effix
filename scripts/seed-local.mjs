/**
 * Seed de PRUEBAS para el Supabase LOCAL (no usar contra producción).
 * Crea los usuarios de prueba + boleta que usan los E2E y el desarrollo:
 *   - asistente@test.local / prueba123 (boleta General activa, edición activa)
 *   - admin@test.local / admin123 (is_admin)
 *
 * Uso:  node scripts/seed-local.mjs
 * Lee las llaves de .env.local (Supabase local de `npx supabase start`).
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE?.includes("127.0.0.1") && !BASE?.includes("localhost")) {
  console.error("⛔ Este seed solo corre contra Supabase LOCAL. Abortado.");
  process.exit(1);
}

const H = {
  apikey: SVC,
  Authorization: `Bearer ${SVC}`,
  "Content-Type": "application/json",
};

async function createUser(email, password) {
  const res = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = await res.json();
  if (res.ok) return body.id;
  // Ya existe: buscarlo.
  const list = await fetch(
    `${BASE}/auth/v1/admin/users?per_page=100`,
    { headers: H },
  ).then((r) => r.json());
  const found = (list.users ?? []).find((u) => u.email === email);
  if (!found) throw new Error(`No se pudo crear ni encontrar ${email}: ${JSON.stringify(body)}`);
  return found.id;
}

async function rest(path, method, body) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  }
}

const adminId = await createUser("admin@test.local", "admin123");
const userId = await createUser("asistente@test.local", "prueba123");

await rest(`profiles?id=eq.${adminId}`, "PATCH", {
  is_admin: true,
  full_name: "Admin Prueba",
});
await rest(`profiles?id=eq.${userId}`, "PATCH", {
  full_name: "Asistente Prueba",
  country: "Colombia",
  role: "marca",
});

// Edición activa para la boleta.
const eds = await fetch(
  `${BASE}/rest/v1/editions?select=year&is_active=eq.true&limit=1`,
  { headers: H },
).then((r) => r.json());
const edition = eds[0]?.year ?? 2026;

// El índice único de order_number es PARCIAL (where not null) → no sirve
// para upsert vía on_conflict; se verifica a mano.
const existing = await fetch(
  `${BASE}/rest/v1/tickets?select=id&order_number=eq.TEST-001&limit=1`,
  { headers: H },
).then((r) => r.json());

if (existing.length === 0) {
  await rest("tickets", "POST", {
    user_id: userId,
    ticket_email: "asistente@test.local",
    holder_name: "Asistente Prueba",
    ticket_type: "general",
    order_number: "TEST-001",
    edition,
    status: "active",
    secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    source: "api",
  });
}

console.log("✅ Seed local listo:");
console.log("   admin@test.local / admin123 (admin)");
console.log(`   asistente@test.local / prueba123 (boleta General ${edition})`);
