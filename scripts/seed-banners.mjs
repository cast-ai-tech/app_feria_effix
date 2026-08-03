/**
 * Seed de BANNERS para el Supabase LOCAL (no usar contra producción).
 *
 * Los banners son DATOS (filas en `banners` + archivos en el bucket
 * Storage), así que NO viajan con git: cada máquina debe sembrarlos.
 * Este script deja el mismo estado demo en cualquier PC:
 *   1. Sube los assets de supabase/seed-assets/banners/ al bucket `banners`
 *      (videos hero, imágenes demo Magnific y logos de sponsors reales).
 *   2. Reemplaza las filas de banners sembradas (borra por título exacto y
 *      re-inserta) — idempotente, no toca banners creados a mano en admin.
 *
 * Uso:  node scripts/seed-banners.mjs
 * Requiere: `npx supabase start` corriendo y .env.local apuntando al local.
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

const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const JSON_H = { ...H, "Content-Type": "application/json" };

const MIME = {
  mp4: "video/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Archivos del repo → ruta en el bucket `banners`. */
const ASSETS = [
  "demo/recap-2025.mp4",
  "demo/protagonistas-2025.mp4",
  "demo/apertura-2024.mp4",
  "demo/hero1.png",
  "demo/hero2.png",
  "demo/logo1.jpg",
  "demo/logo2.jpg",
  "brand/logo-prendas-control.webp",
  "brand/logo-unmerco.webp",
  "brand/logo-vitalcom.webp",
  "brand/logo-pancake.webp",
  "brand/logo-convertmate.webp",
  "brand/logo-tu-imperio-youtube.webp",
  "brand/logo-grupo-effi.webp",
];

const url = (path) => `${BASE}/storage/v1/object/public/banners/${path}`;

/** Estado demo completo (mismo de la máquina original, Fases 24–26). */
const BANNERS = [
  // ── home_hero: videos nativos primero, imágenes Magnific después ──
  { placement: "home_hero", title: "Asi se vivio la Feria Effix 2025 (recap oficial)", image_url: url("demo/recap-2025.mp4"), link_url: null, sort_order: 5, active: true },
  { placement: "home_hero", title: "Los protagonistas de Feria Effix 2025", image_url: url("demo/protagonistas-2025.mp4?v=2"), link_url: null, sort_order: 8, active: true },
  { placement: "home_hero", title: "Patrocinador demo 1", image_url: url("demo/hero1.png"), link_url: "https://feriaeffix.com", sort_order: 10, active: true },
  { placement: "home_hero", title: "Patrocinador demo 2", image_url: url("demo/hero2.png"), link_url: "https://feriaeffix.com", sort_order: 20, active: true },
  // ── home_inline ──
  { placement: "home_inline", title: "Patrocinador demo inline", image_url: url("demo/hero2.png"), link_url: "https://feriaeffix.com", sort_order: 10, active: true },
  // ── module_top (agenda) ──
  { placement: "module_top", module_key: "agenda", title: "Apertura Feria Effix 2024", image_url: url("demo/apertura-2024.mp4"), link_url: null, sort_order: 5, active: true },
  { placement: "module_top", module_key: "agenda", title: "Patrocinador demo agenda", image_url: url("demo/hero1.png"), link_url: null, sort_order: 10, active: true },
  // ── footer_strip: sponsors REALES del sitio; demos quedan apagados ──
  { placement: "footer_strip", title: "Prendas Control", image_url: url("brand/logo-prendas-control.webp"), link_url: null, sort_order: 10, active: true },
  { placement: "footer_strip", title: "Unmerco", image_url: url("brand/logo-unmerco.webp"), link_url: null, sort_order: 20, active: true },
  { placement: "footer_strip", title: "Vitalcom", image_url: url("brand/logo-vitalcom.webp"), link_url: null, sort_order: 30, active: true },
  { placement: "footer_strip", title: "Pancake", image_url: url("brand/logo-pancake.webp"), link_url: null, sort_order: 40, active: true },
  { placement: "footer_strip", title: "Convertmate", image_url: url("brand/logo-convertmate.webp"), link_url: null, sort_order: 50, active: true },
  { placement: "footer_strip", title: "Tu Imperio YouTube", image_url: url("brand/logo-tu-imperio-youtube.webp"), link_url: null, sort_order: 60, active: true },
  { placement: "footer_strip", title: "Aliado demo A", image_url: url("demo/logo1.jpg"), link_url: null, sort_order: 10, active: false },
  { placement: "footer_strip", title: "Aliado demo B", image_url: url("demo/logo2.jpg"), link_url: null, sort_order: 20, active: false },
  // ── splash_sponsor: Grupo Effi (organizador) ──
  { placement: "splash_sponsor", title: "Grupo Effi", image_url: url("brand/logo-grupo-effi.webp"), link_url: "https://grupoeffi.com", sort_order: 10, active: false },
  { placement: "splash_sponsor", title: "Con el apoyo demo", image_url: url("demo/logo1.jpg"), link_url: null, sort_order: 10, active: false },
];

async function main() {
  // 1) Subir assets al bucket (x-upsert: re-correr es seguro).
  for (const path of ASSETS) {
    const file = readFileSync(new URL(`../supabase/seed-assets/banners/${path}`, import.meta.url));
    const ext = path.split(".").pop();
    const res = await fetch(`${BASE}/storage/v1/object/banners/${path}`, {
      method: "POST",
      headers: { ...H, "Content-Type": MIME[ext], "x-upsert": "true" },
      body: file,
    });
    if (!res.ok) throw new Error(`Storage ${path}: ${res.status} ${await res.text()}`);
    console.log(`✓ bucket  ${path}`);
  }

  // 2) Reemplazar filas sembradas (por título exacto — no toca las del admin).
  const titles = BANNERS.map((b) => b.title);
  const del = await fetch(
    `${BASE}/rest/v1/banners?title=in.(${titles.map((t) => `"${t}"`).join(",")})`,
    { method: "DELETE", headers: JSON_H },
  );
  if (!del.ok) throw new Error(`DELETE banners: ${del.status} ${await del.text()}`);

  const ins = await fetch(`${BASE}/rest/v1/banners`, {
    method: "POST",
    headers: { ...JSON_H, Prefer: "return=minimal" },
    body: JSON.stringify(
      BANNERS.map((b) => ({ edition: 2026, module_key: null, ...b })),
    ),
  });
  if (!ins.ok) throw new Error(`INSERT banners: ${ins.status} ${await ins.text()}`);
  console.log(`✓ tabla   ${BANNERS.length} banners sembrados`);
  console.log("Listo. Recarga la app: hero con videos, sponsors y splash activos.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
