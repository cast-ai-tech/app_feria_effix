"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push.server";

type Result = { ok: boolean; error?: string };

/**
 * Solicitar cita con un stand (Fase 6/30) — antes era un insert directo
 * desde el cliente (StandsClient.tsx); se mueve a server action para poder
 * avisarle al staff del stand con push, igual que ya hacen las
 * notificaciones operativas de Credencial (src/app/credencial/actions.ts).
 */
export async function requestMeeting(
  standId: string,
  message: string,
  intent: string,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Inicia sesión para agendar una cita." };

  const { error } = await supabase.from("stand_meetings").insert({
    stand_id: standId,
    user_id: user.id,
    message: message.trim() || null,
    intent,
  });
  if (error) {
    // UNIQUE(user_id, stand_id): ya existe una solicitud para este stand.
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Ya tienes una solicitud con este stand."
          : error.message,
    };
  }

  const admin = createAdminClient();
  const [{ data: staff }, { data: stand }, { data: profile }] =
    await Promise.all([
      admin.from("stand_staff").select("user_id").eq("stand_id", standId),
      admin.from("stands").select("name").eq("id", standId).maybeSingle(),
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const staffIds = (staff ?? []).map((s) => s.user_id);
  if (staffIds.length > 0) {
    await sendPushToUsers(staffIds, {
      title: `📅 Nueva cita solicitada`,
      body: `${profile?.full_name ?? "Un asistente"} quiere agendar contigo en ${stand?.name ?? "tu stand"}.`,
      url: "/mi-stand",
    });
  }

  return { ok: true };
}
