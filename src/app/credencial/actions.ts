"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push.server";

/**
 * Notificaciones OPERATIVAS automáticas (Fase 16) disparadas por eventos
 * de la Credencial/Pasaporte. Solo push directo al usuario afectado —
 * no ensucian el centro global.
 */

/** Avisa a B que A se conectó con él (tras un scan-to-connect exitoso). */
export async function notifyNewConnection(
  targetProfileId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === targetProfileId) return;

  const admin = createAdminClient();

  // Verifica que la conexión exista de verdad (anti-abuso del action).
  const { data: conn } = await admin
    .from("connections")
    .select("id")
    .eq("owner_id", targetProfileId)
    .eq("connected_profile_id", user.id)
    .maybeSingle();
  if (!conn) return;

  const { data: me } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  await sendPushToUsers([targetProfileId], {
    title: "🤝 Nueva conexión Effix",
    body: `${me?.full_name ?? "Alguien"} se conectó contigo. Revisa sus datos en tus contactos.`,
    url: "/credencial/contactos",
  });
}

/** Avisa al asistente que un stand le registró un sello. */
export async function notifyStandScan(profileId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();

  // Verifica que quien llama realmente escaneó a ese asistente hace poco.
  const { data: scan } = await admin
    .from("stand_scans")
    .select("id, stands(name)")
    .eq("profile_id", profileId)
    .eq("scanned_by", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!scan) return;

  const stand = scan.stands as unknown as { name: string } | null;
  await sendPushToUsers([profileId], {
    title: "🛂 ¡Nuevo sello en tu pasaporte!",
    body: `${stand?.name ?? "Un stand"} registró tu visita. Mira tu progreso.`,
    url: "/pasaporte",
  });
}
