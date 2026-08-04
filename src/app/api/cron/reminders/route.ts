import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push.server";

/**
 * Recordatorios de Mi Agenda (Fase 17): push 15 minutos antes de cada
 * charla guardada. Pensado para Vercel Cron cada 5 min:
 *
 *   vercel.json / vercel.ts → crons: [{ path: "/api/cron/reminders",
 *   schedule: "*\/5 * * * *" }]
 *
 * Seguridad: exige el header Authorization: Bearer ${CRON_SECRET}
 * (Vercel Cron lo envía automáticamente si defines CRON_SECRET).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "reminder_lead_minutes")
    .maybeSingle();
  const leadMinutes = parseInt(cfg?.value ?? "15", 10) || 15;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000);

  // Charlas activas que empiezan en los próximos 15 minutos.
  const { data: talks } = await admin
    .from("talks")
    .select("id,title,auditorium,starts_at")
    .eq("status", "active")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  let reminded = 0;
  for (const talk of talks ?? []) {
    // Guardadas sin recordatorio enviado.
    const { data: savers } = await admin
      .from("saved_talks")
      .select("user_id")
      .eq("talk_id", talk.id)
      .is("reminded_at", null);

    const userIds = (savers ?? []).map((s) => s.user_id);
    if (userIds.length === 0) continue;

    const hora = talk.starts_at
      ? new Date(talk.starts_at).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Bogota",
        })
      : "";

    const sent = await sendPushToUsers(userIds, {
      title: "⏰ Tu charla empieza pronto",
      body: `"${talk.title}" — ${hora}${talk.auditorium ? ` · ${talk.auditorium}` : ""}`,
      url: "/agenda",
    });
    reminded += sent;

    await admin
      .from("saved_talks")
      .update({ reminded_at: now.toISOString() })
      .eq("talk_id", talk.id)
      .is("reminded_at", null);
  }

  // Citas personales (Fase 30): misma ventana y mecánica que las charlas.
  const { data: events } = await admin
    .from("user_events")
    .select("id,user_id,title,location,starts_at")
    .is("reminded_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  for (const ev of events ?? []) {
    const hora = new Date(ev.starts_at).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Bogota",
    });
    const sent = await sendPushToUsers([ev.user_id], {
      title: "📅 Tu cita empieza pronto",
      body: `"${ev.title}" — ${hora}${ev.location ? ` · ${ev.location}` : ""}`,
      url: "/agenda",
    });
    reminded += sent;

    await admin
      .from("user_events")
      .update({ reminded_at: now.toISOString() })
      .eq("id", ev.id);
  }

  return NextResponse.json({
    ok: true,
    talks: (talks ?? []).length,
    events: (events ?? []).length,
    pushed: reminded,
  });
}
