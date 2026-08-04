"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/adminGuard";

type Result = { ok: boolean; error?: string };

const PLACEMENTS = [
  "splash_sponsor",
  "home_hero",
  "home_inline",
  "module_top",
  "footer_strip",
];
const MODULES = [
  "agenda",
  "stands",
  "ponentes",
  "academia",
  "alianzas",
  "mapa",
  "comunidad",
  "credencial",
  "pasaporte",
  "tickets",
  "notificaciones",
  "beneficios",
];
const SPONSOR_TIERS = ["basico", "plata", "oro", "diamante", "black"];

function readBanner(formData: FormData) {
  const placement = (formData.get("placement") as string) || "";
  const module_key = ((formData.get("module_key") as string) || "").trim();
  const sponsor_tier = ((formData.get("sponsor_tier") as string) || "").trim();
  const sponsor_id = ((formData.get("sponsor_id") as string) || "").trim();
  return {
    placement,
    module_key: placement === "module_top" ? module_key || null : null,
    sponsor_tier: SPONSOR_TIERS.includes(sponsor_tier) ? sponsor_tier : null,
    sponsor_id: sponsor_id || null,
    title: ((formData.get("title") as string) || "").trim(),
    image_url: ((formData.get("image_url") as string) || "").trim(),
    link_url: ((formData.get("link_url") as string) || "").trim() || null,
    sort_order:
      parseInt((formData.get("sort_order") as string) || "100", 10) || 100,
    starts_at: ((formData.get("starts_at") as string) || "").trim() || null,
    ends_at: ((formData.get("ends_at") as string) || "").trim() || null,
    edition: parseInt((formData.get("edition") as string) || "", 10),
  };
}

function revalidate() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBanner(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const b = readBanner(formData);

  if (!PLACEMENTS.includes(b.placement))
    return { ok: false, error: "Placement inválido." };
  if (b.placement === "module_top" && !MODULES.includes(b.module_key ?? ""))
    return { ok: false, error: "Para module_top elige el módulo." };
  if (!b.title)
    return { ok: false, error: "El título (patrocinador) es obligatorio." };
  if (!b.image_url)
    return { ok: false, error: "Sube la imagen del banner primero." };

  const { error } = await admin.from("banners").insert({ ...b, active: false });
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleBanner(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  const active = (formData.get("active") as string) === "true";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin
    .from("banners")
    .update({ active: !active })
    .eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteBanner(formData: FormData): Promise<Result> {
  const admin = await assertAdmin();
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin.from("banners").delete().eq("id", id);
  revalidate();
  return error ? { ok: false, error: error.message } : { ok: true };
}
