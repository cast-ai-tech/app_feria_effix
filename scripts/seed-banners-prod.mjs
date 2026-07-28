/**
 * Siembra los banners reales (sponsors + recaps) en PRODUCCIÓN.
 *
 * Misma data/assets que scripts/seed-banners.mjs (pensado para Supabase
 * local), pero apuntado a producción — se usó una sola vez para restaurar
 * el contenido que se había cargado en el Supabase local de otra máquina
 * y nunca llegó a la nube. Idempotente: borra por título exacto y
 * re-inserta, no toca banners creados a mano en /admin/banners.
 *
 * Uso:  node scripts/seed-banners-prod.mjs
 * Requiere: .env.local apuntando a producción + CONFIRM_PROD=yes.
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
if (BASE?.includes("127.0.0.1") || BASE?.includes("localhost")) {
  console.error("⛔ .env.local apunta a Supabase LOCAL. Usa scripts/seed-banners.mjs para eso.");
  process.exit(1);
}
if (process.env.CONFIRM_PROD !== "yes") {
  console.error(`⛔ Esto va a escribir en producción (${BASE}). Corre con CONFIRM_PROD=yes para confirmar.`);
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

const BANNERS = [
  { placement: "home_hero", title: "Asi se vivio la Feria Effix 2025 (recap oficial)", image_url: url("demo/recap-2025.mp4"), link_url: null, sort_order: 5, active: true },
  { placement: "home_hero", title: "Los protagonistas de Feria Effix 2025", image_url: url("demo/protagonistas-2025.mp4?v=2"), link_url: null, sort_order: 8, active: true },
  { placement: "home_hero", title: "Patrocinador demo 1", image_url: url("demo/hero1.png"), link_url: "https://feriaeffix.com", sort_order: 10, active: true },
  { placement: "home_hero", title: "Patrocinador demo 2", image_url: url("demo/hero2.png"), link_url: "https://feriaeffix.com", sort_order: 20, active: true },
  { placement: "home_inline", title: "Patrocinador demo inline", image_url: url("demo/hero2.png"), link_url: "https://feriaeffix.com", sort_order: 10, active: true },
  { placement: "module_top", module_key: "agenda", title: "Apertura Feria Effix 2024", image_url: url("demo/apertura-2024.mp4"), link_url: null, sort_order: 5, active: true },
  { placement: "module_top", module_key: "agenda", title: "Patrocinador demo agenda", image_url: url("demo/hero1.png"), link_url: null, sort_order: 10, active: true },
  { placement: "footer_strip", title: "Prendas Control", image_url: url("brand/logo-prendas-control.webp"), link_url: null, sort_order: 10, active: true },
  { placement: "footer_strip", title: "Unmerco", image_url: url("brand/logo-unmerco.webp"), link_url: null, sort_order: 20, active: true },
  { placement: "footer_strip", title: "Vitalcom", image_url: url("brand/logo-vitalcom.webp"), link_url: null, sort_order: 30, active: true },
  { placement: "footer_strip", title: "Pancake", image_url: url("brand/logo-pancake.webp"), link_url: null, sort_order: 40, active: true },
  { placement: "footer_strip", title: "Convertmate", image_url: url("brand/logo-convertmate.webp"), link_url: null, sort_order: 50, active: true },
  { placement: "footer_strip", title: "Tu Imperio YouTube", image_url: url("brand/logo-tu-imperio-youtube.webp"), link_url: null, sort_order: 60, active: true },
  { placement: "footer_strip", title: "Aliado demo A", image_url: url("demo/logo1.jpg"), link_url: null, sort_order: 10, active: false },
  { placement: "footer_strip", title: "Aliado demo B", image_url: url("demo/logo2.jpg"), link_url: null, sort_order: 20, active: false },
  { placement: "splash_sponsor", title: "Grupo Effi", image_url: url("brand/logo-grupo-effi.webp"), link_url: "https://grupoeffi.com", sort_order: 10, active: true },
  { placement: "splash_sponsor", title: "Con el apoyo demo", image_url: url("demo/logo1.jpg"), link_url: null, sort_order: 10, active: false },
];

async function main() {
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
  console.log(`✓ tabla   ${BANNERS.length} banners sembrados en producción`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
