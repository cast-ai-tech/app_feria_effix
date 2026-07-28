/**
 * Migra los banners (filas + archivos del bucket 'banners') desde el
 * Supabase LOCAL de esta máquina hacia el Supabase de PRODUCCIÓN.
 *
 * Requiere:
 *  1. Docker + `npx supabase start` corriendo en ESTA máquina (local).
 *  2. .env.local de esta máquina apuntando al Supabase local
 *     (NEXT_PUBLIC_SUPABASE_URL con 127.0.0.1/localhost).
 *  3. Dos variables de entorno con las credenciales de PRODUCCIÓN
 *     (cópialas del .env.local de la máquina donde está desplegado):
 *       PROD_SUPABASE_URL=https://nboixooylqxrlmtmtbgq.supabase.co
 *       PROD_SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Uso (PowerShell):
 *   $env:PROD_SUPABASE_URL="https://nboixooylqxrlmtmtbgq.supabase.co"
 *   $env:PROD_SUPABASE_SERVICE_ROLE_KEY="<pegar aquí>"
 *   node scripts/migrate-banners-from-local.mjs
 *
 * Es seguro re-correrlo: si un banner con el mismo título+placement+edición
 * ya existe en producción, lo salta (no duplica).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const local = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const LOCAL_URL = local.NEXT_PUBLIC_SUPABASE_URL;
const LOCAL_SVC = local.SUPABASE_SERVICE_ROLE_KEY;
if (!LOCAL_URL?.includes("127.0.0.1") && !LOCAL_URL?.includes("localhost")) {
  console.error("⛔ El .env.local de esta máquina no apunta a Supabase LOCAL. Abortado.");
  process.exit(1);
}

const PROD_URL = process.env.PROD_SUPABASE_URL;
const PROD_SVC = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (!PROD_URL || !PROD_SVC) {
  console.error("⛔ Faltan PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY. Abortado.");
  process.exit(1);
}

const localClient = createClient(LOCAL_URL, LOCAL_SVC, { auth: { persistSession: false } });
const prodClient = createClient(PROD_URL, PROD_SVC, { auth: { persistSession: false } });

const { data: banners, error } = await localClient.from("banners").select("*");
if (error) {
  console.error("⛔ No se pudo leer banners locales:", error.message);
  process.exit(1);
}
console.log(`Encontrados ${banners.length} banners en local.`);

let migrated = 0;
let skipped = 0;

for (const b of banners) {
  const { data: existing } = await prodClient
    .from("banners")
    .select("id")
    .eq("title", b.title)
    .eq("placement", b.placement)
    .eq("edition", b.edition)
    .maybeSingle();

  if (existing) {
    console.log(`↷ Ya existe en producción: "${b.title}" (${b.placement}/${b.edition})`);
    skipped++;
    continue;
  }

  // Descarga el archivo desde el Storage local y lo sube al de producción.
  let prodImageUrl = b.image_url;
  try {
    const res = await fetch(b.image_url);
    if (res.ok) {
      const blob = await res.arrayBuffer();
      const ext = b.image_url.split(".").pop()?.split("?")[0] || "jpg";
      const path = `${b.placement}/${b.id}.${ext}`;
      const contentType = res.headers.get("content-type") ?? undefined;
      const { error: upErr } = await prodClient.storage
        .from("banners")
        .upload(path, blob, { contentType, upsert: true });
      if (upErr) {
        console.warn(`  ⚠ No se pudo subir la imagen de "${b.title}": ${upErr.message}. Se usará el link original (no funcionará en producción).`);
      } else {
        const { data: pub } = prodClient.storage.from("banners").getPublicUrl(path);
        prodImageUrl = pub.publicUrl;
      }
    } else {
      console.warn(`  ⚠ No se pudo descargar la imagen de "${b.title}" (HTTP ${res.status}).`);
    }
  } catch (e) {
    console.warn(`  ⚠ Error descargando la imagen de "${b.title}": ${e.message}`);
  }

  const { error: insErr } = await prodClient.from("banners").insert({
    edition: b.edition,
    placement: b.placement,
    module_key: b.module_key,
    sponsor_tier: b.sponsor_tier,
    title: b.title,
    image_url: prodImageUrl,
    link_url: b.link_url,
    sort_order: b.sort_order,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    active: b.active,
  });

  if (insErr) {
    console.error(`  ⛔ No se pudo insertar "${b.title}" en producción: ${insErr.message}`);
    continue;
  }
  console.log(`✅ Migrado: "${b.title}" (${b.placement}/${b.edition})`);
  migrated++;
}

console.log(`\nListo: ${migrated} migrados, ${skipped} ya existían.`);
