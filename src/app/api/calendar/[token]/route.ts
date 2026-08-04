import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCalendar, type IcsEvent } from "@/lib/ics";

/**
 * Feed de calendario personal (.ics) — Fase 30.
 *
 * Las apps de calendario (iOS, Google Calendar, Outlook) se SUSCRIBEN a
 * esta URL y la refrescan solas: las charlas guardadas en Mi Agenda
 * aparecen en el calendario del teléfono sin hacer nada más, y los
 * cambios de hora/sala se propagan en el siguiente refresco.
 *
 * Autenticación: el token opaco de profiles.calendar_token ES la
 * credencial (los clientes de calendario no pueden usar la sesión de
 * Supabase). Solo expone las charlas guardadas del dueño del token.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // El token es un uuid — descarta basura antes de tocar la BD.
  const clean = token.replace(/\.ics$/i, "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clean,
    )
  ) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("calendar_token", clean)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });
  }

  const { data: saved } = await admin
    .from("saved_talks")
    .select(
      "talk_id, talks(id,title,description,speaker_name,auditorium,starts_at,ends_at,status)",
    )
    .eq("user_id", profile.id);

  const events: IcsEvent[] = (saved ?? [])
    .map((s) => {
      const t = s.talks as unknown as {
        id: string;
        title: string;
        description: string | null;
        speaker_name: string | null;
        auditorium: string | null;
        starts_at: string | null;
        ends_at: string | null;
        status: string;
      } | null;
      return t;
    })
    .filter(
      (t): t is NonNullable<typeof t> & { starts_at: string } =>
        !!t && t.status === "active" && !!t.starts_at,
    )
    .map((t) => ({
      uid: t.id,
      title: t.title,
      startsAt: t.starts_at,
      endsAt: t.ends_at,
      location: t.auditorium,
      description:
        [t.speaker_name, t.description].filter(Boolean).join(" — ") || null,
    }));

  const ics = buildCalendar(
    "Feria Effix — Mi Agenda",
    events,
    new Date().toISOString(),
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="feria-effix-agenda.ics"',
      // Los clientes de calendario refrescan por su cuenta; 5 min de caché
      // evitan hammering sin que un cambio de agenda tarde en reflejarse
      // (con 1h, guardar una charla y refrescar el calendario mostraba la
      // versión vieja del feed durante hasta una hora).
      "Cache-Control": "public, max-age=300",
    },
  });
}
