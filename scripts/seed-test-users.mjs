/**
 * Crea cuentas de PRUEBA con roles variados (Fase 28) para QA del equipo.
 *
 * Idempotente: si la cuenta ya existe actualiza contraseña/rol; si la
 * membresía/boleta ya existe no la duplica. No borra nada.
 *
 * Uso:  CONFIRM_PROD=yes node scripts/seed-test-users.mjs
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim(),
    ]),
);

const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const isLocal = BASE?.includes("127.0.0.1") || BASE?.includes("localhost");
if (!BASE || !SVC) {
  console.error("⛔ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!isLocal && process.env.CONFIRM_PROD !== "yes") {
  console.error(`⛔ Esto escribe en producción (${BASE}). Corre con CONFIRM_PROD=yes.`);
  process.exit(1);
}

const admin = createClient(BASE, SVC, { auth: { persistSession: false } });

const PASSWORD = "Effix2026+";

// --- TOTP secret (mismo formato que src/lib/totp.ts) ---------------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function generateSecret(bytes = 20) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

// --- Usuarios de prueba y sus roles --------------------------------------
// ticket: tier de boleta | team: rol en team_members | speaker: crea ficha
// sponsor: staff del patrocinador | stand: staff de stand demo
// Un usuario por rol (QA Fase 28). Niveles de patrocinio del sistema
// desde la Fase 29: basico | plata | oro | diamante | black.
const USERS = [
  { name: "Frijolito", email: "juanesteban.raigoza@gmail.com", ticket: "general" },
  { name: "Sebas Castro EFFIX", email: "sebascastro@outlook.com", sponsor: { name: "Patrocinio Black (demo)", tier: "black" } },
  { name: "Emmanuel Páginas Effi", email: "desarrollo1.effisystems@gmail.com", sponsor: { name: "Grupo Effi", tier: "diamante" } },
  { name: "Joaquin Rojas Peña", email: "contacto@joakoestratega.com", speaker: true },
  { name: "Susana R Montoya", email: "susanarmontoya@gmail.com", ticket: "vip" },
  { name: "Ale Tomate Closer", email: "estoeskatapis@gmail.com", stand: true },
  { name: "Estefa El M", email: "effix.sac@gmail.com", sponsor: { name: "Patrocinio Oro (demo)", tier: "oro" } },
  { name: "Melissa Effi", email: "comunicaciones.efficommerce@gmail.com", team: "staff" },
  { name: "Juan Carmona", email: "juandavidcarmonagomez@gmail.com", ticket: "black" },
];

async function findUserByEmail(email) {
  // listUsers no filtra por email en todas las versiones: paginamos corto.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser({ name, email }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    console.log(`  ↻ ${email} ya existía — contraseña actualizada`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  console.log(`  ✓ ${email} creado`);
  return data.user.id;
}

async function main() {
  console.log(`Sembrando cuentas de prueba en ${BASE}\n`);

  // Edición activa (regla del repo: nada hardcodeado).
  const { data: ed, error: edErr } = await admin
    .from("editions").select("year").eq("is_active", true).maybeSingle();
  if (edErr || !ed) throw new Error("No hay edición activa en `editions`.");
  const EDITION = ed.year;

  // Soporte: sponsors por nombre/nivel (cache) y stand demo.
  const sponsorCache = new Map();
  async function ensureSponsor({ name, tier }) {
    if (sponsorCache.has(name)) return sponsorCache.get(name);
    const { data } = await admin
      .from("sponsors").select("id").eq("name", name).eq("edition", EDITION).maybeSingle();
    let id = data?.id ?? null;
    if (!id) {
      const website = name === "Grupo Effi" ? "https://grupoeffi.com" : null;
      const { data: ins, error } = await admin
        .from("sponsors")
        .insert({ name, website, tier, edition: EDITION, active: true })
        .select("id").single();
      if (error) throw new Error(`sponsor ${name}: ${error.message}`);
      id = ins.id;
      console.log(`  ✓ Sponsor '${name}' creado (${tier})`);
    }
    // Vincula banners existentes cuyo título coincida, para que vean métricas.
    await admin.from("banners")
      .update({ sponsor_id: id })
      .ilike("title", `%${name.replace(/ \(demo\)$/, "")}%`)
      .is("sponsor_id", null);
    sponsorCache.set(name, id);
    return id;
  }

  let standId = null;
  {
    const { data } = await admin
      .from("stands").select("id").eq("edition", EDITION).order("created_at").limit(1);
    if (data?.length) standId = data[0].id;
    else {
      const { data: ins, error } = await admin
        .from("stands")
        .insert({ name: "Stand Demo Effix", category: "Demo", stand_number: "D-01", edition: EDITION, tier: "oro" })
        .select("id").single();
      if (error) throw new Error(`stand: ${error.message}`);
      standId = ins.id;
      console.log("  ✓ Stand 'Stand Demo Effix' creado (oro)");
    }
  }

  for (const u of USERS) {
    console.log(`\n${u.name}`);
    const userId = await ensureUser(u);

    // Perfil: nombre + ticket_email (así el admin puede buscarlo por correo).
    await admin.from("profiles")
      .update({ full_name: u.name, ticket_email: u.email })
      .eq("id", userId);

    if (u.ticket) {
      const { data: has } = await admin.from("tickets")
        .select("id").eq("user_id", userId).eq("edition", EDITION).eq("status", "active").limit(1);
      if (has?.length) console.log(`  ↻ boleta ${u.ticket} ya existía`);
      else {
        const { error } = await admin.from("tickets").insert({
          user_id: userId,
          ticket_email: u.email,
          holder_name: u.name,
          ticket_type: u.ticket,
          edition: EDITION,
          status: "active",
          secret: generateSecret(),
          source: u.ticket === "black" ? "manual_black" : "api",
        });
        if (error) console.error(`  ⛔ boleta: ${error.message}`);
        else console.log(`  ✓ boleta ${u.ticket} (${EDITION})`);
      }
    }

    if (u.team) {
      const { error } = await admin.from("team_members")
        .upsert({ user_id: userId, role: u.team }, { onConflict: "user_id" });
      if (error) console.error(`  ⛔ equipo: ${error.message}`);
      else console.log(`  ✓ equipo: ${u.team}`);
    }

    if (u.sponsor) {
      const sponsorId = await ensureSponsor(u.sponsor);
      const { error } = await admin.from("sponsor_staff")
        .upsert({ sponsor_id: sponsorId, user_id: userId }, { onConflict: "sponsor_id,user_id" });
      if (error) console.error(`  ⛔ sponsor_staff: ${error.message}`);
      else console.log(`  ✓ staff de patrocinador: ${u.sponsor.name} (${u.sponsor.tier})`);
    }

    if (u.stand && standId) {
      const { error } = await admin.from("stand_staff")
        .upsert({ stand_id: standId, user_id: userId }, { onConflict: "stand_id,user_id" });
      if (error) console.error(`  ⛔ stand_staff: ${error.message}`);
      else console.log("  ✓ staff de stand (expositor)");
    }

    if (u.speaker) {
      const { data: sp } = await admin.from("speakers")
        .select("id").eq("user_id", userId).eq("edition", EDITION).maybeSingle();
      if (sp) console.log("  ↻ ficha de ponente ya existía");
      else {
        const { error } = await admin.from("speakers").insert({
          full_name: u.name,
          role: "Marketing estratégico",
          talk_title: "Charla de prueba — Estrategia de marketing",
          bio: "Ficha de prueba creada para QA de la Fase 28.",
          edition: EDITION,
          user_id: userId,
        });
        if (error) console.error(`  ⛔ ponente: ${error.message}`);
        else console.log("  ✓ ficha de ponente vinculada");
      }
    }
  }

  console.log("\nListo. Contraseña de todas las cuentas: " + PASSWORD);
}

main().catch((e) => {
  console.error("⛔", e.message);
  process.exit(1);
});
