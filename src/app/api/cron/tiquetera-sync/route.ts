import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSecret } from "@/lib/totp";
import { fetchSalesPerDay, mapLocationToTicketType } from "@/lib/tiquetera";
import { FALLBACK_EDITION } from "@/lib/editions";

/**
 * Sincronización de ventas de La Tiquetera (import automático de compradores).
 * Su API no tiene webhooks, solo consulta por día — así que este cron
 * relee el día de hoy (hora Bogotá) cada vez que corre y hace upsert por
 * order_number (mismo mecanismo que el import manual de CSV, Fase 3).
 *
 * Pensado para Vercel Cron cada hora:
 *   vercel.ts → crons: [{ path: "/api/cron/tiquetera-sync", schedule: "0 * * * *" }]
 *
 * Seguridad: exige el header Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  }); // YYYY-MM-DD
  const purchaseDate = new Date(`${today}T12:00:00-05:00`).toISOString();

  let result: { data: Awaited<ReturnType<typeof fetchSalesPerDay>>["data"] };
  try {
    result = await fetchSalesPerDay(today);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error de La Tiquetera";
    console.error("[tiquetera-sync] fetchSalesPerDay falló:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  let inserted = 0;
  let matched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ticket of result.data) {
    const email = ticket.buyer?.email?.toLowerCase().trim();
    if (!email) {
      skipped++;
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("ticket_email", email)
      .maybeSingle();
    const userId = profile?.id ?? null;
    if (userId) matched++;

    const holderName = [ticket.buyer?.firstName, ticket.buyer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const { error } = await admin.from("tickets").upsert(
      {
        user_id: userId,
        ticket_email: email,
        holder_name: holderName || null,
        ticket_type: mapLocationToTicketType(ticket.locationName),
        order_number: ticket.id,
        purchase_date: purchaseDate,
        edition: FALLBACK_EDITION.year,
        status: "active",
        secret: generateSecret(),
        source: "api",
      },
      { onConflict: "order_number", ignoreDuplicates: true },
    );

    if (error) errors.push(`${ticket.id}: ${error.code || error.message}`);
    else inserted++;
  }

  return NextResponse.json({
    ok: true,
    date: today,
    total: result.data.length,
    inserted,
    matched,
    skipped,
    errors: errors.slice(0, 10),
  });
}
