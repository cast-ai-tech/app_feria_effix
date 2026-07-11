"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSecret } from "@/lib/totp";

/** Verifica que quien llama es admin; devuelve el cliente service-role. */
async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) throw new Error("No autorizado (requiere admin)");
  return createAdminClient();
}

// ---------------------------------------------------------------------------
// CSV: parser tolerante (coma o punto y coma, campos entre comillas).
// ---------------------------------------------------------------------------
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const firstLine = clean.split("\n")[0];
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);

  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase();

  const headers = rows[0].map(norm);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

/** Mapea el nombre de columna (varias variantes) a un valor. */
function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    for (const col of Object.keys(row)) {
      if (col === k || col.includes(k)) return row[col];
    }
  }
  return "";
}

function normalizeType(raw: string): "general" | "vip" | "black" {
  const t = raw.toLowerCase();
  if (t.includes("black")) return "black";
  if (t.includes("vip")) return "vip";
  return "general";
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  if (!email) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("ticket_email", email)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Importar CSV de La Tiquetera.
// ---------------------------------------------------------------------------
export async function importTiquetera(formData: FormData) {
  const admin = await assertAdmin();
  const file = formData.get("file") as File | null;
  const edition = parseInt((formData.get("edition") as string) || "2026", 10);
  if (!file) return { ok: false, error: "No se recibió ningún archivo." };

  const rows = parseCsv(await file.text());
  let inserted = 0;
  let matched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const holder = pick(row, ["nombre", "titular", "comprador", "name"]);
    const email = pick(row, ["correo", "email", "mail"]).toLowerCase();
    const type = normalizeType(pick(row, ["tipo", "boleta", "categoria"]));
    const order = pick(row, ["orden", "order", "pedido"]);
    const fecha = pick(row, ["fecha", "date", "compra"]);

    if (!email && !order) {
      skipped++;
      continue;
    }

    const userId = await findUserIdByEmail(admin, email);
    if (userId) matched++;

    let purchase_date: string | null = null;
    if (fecha) {
      const d = new Date(fecha);
      if (!isNaN(d.getTime())) purchase_date = d.toISOString();
    }

    const { error } = await admin.from("tickets").upsert(
      {
        user_id: userId,
        ticket_email: email,
        holder_name: holder || null,
        ticket_type: type,
        order_number: order || null,
        purchase_date,
        edition,
        status: "active",
        secret: generateSecret(),
        source: "tiquetera_csv",
      },
      { onConflict: "order_number", ignoreDuplicates: true },
    );

    if (error) errors.push(`${order || email}: ${error.message}`);
    else inserted++;
  }

  revalidatePath("/admin/tickets");
  return {
    ok: true,
    summary: { total: rows.length, inserted, matched, skipped },
    errors: errors.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Asignar boleta Black manualmente.
// ---------------------------------------------------------------------------
export async function assignBlack(formData: FormData) {
  const admin = await assertAdmin();
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  const holder = ((formData.get("holder") as string) || "").trim();
  const order = ((formData.get("order") as string) || "").trim();
  const edition = parseInt((formData.get("edition") as string) || "2026", 10);
  if (!email) return { ok: false, error: "El correo es obligatorio." };

  const userId = await findUserIdByEmail(admin, email);
  const { error } = await admin.from("tickets").insert({
    user_id: userId,
    ticket_email: email,
    holder_name: holder || null,
    ticket_type: "black",
    order_number: order || null,
    edition,
    status: "active",
    secret: generateSecret(),
    source: "manual_black",
  });

  revalidatePath("/admin/tickets");
  if (error) return { ok: false, error: error.message };
  return { ok: true, matched: !!userId };
}

// ---------------------------------------------------------------------------
// Reembolso: cancela la boleta y marca la comisión asociada como
// "a descontar del próximo pago" (sin borrar el historial).
// ---------------------------------------------------------------------------
export async function refundTicket(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id de la boleta." };

  // Ventana de reembolso completo (configurable en app_config).
  const { data: cfg } = await admin
    .from("app_config")
    .select("key,value")
    .in("key", ["event_start_date", "refund_full_days_before_event"]);
  const map = Object.fromEntries((cfg ?? []).map((c) => [c.key, c.value]));
  const eventStart = new Date(map["event_start_date"] ?? "2026-10-16");
  const days = parseInt(map["refund_full_days_before_event"] ?? "30", 10);
  const deadline = new Date(eventStart);
  deadline.setDate(deadline.getDate() - days);
  const refundFull = new Date() <= deadline;

  const { error } = await admin
    .from("tickets")
    .update({
      status: "cancelled",
      refunded_at: new Date().toISOString(),
      refund_full: refundFull,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Comisiones ya calculadas de esta boleta → 'to_deduct' (el Panel de
  // Embajadores las leerá). No se borra el historial, solo cambia el estado.
  const { error: commErr } = await admin
    .from("commissions")
    .update({ status: "to_deduct" })
    .eq("ticket_id", id)
    .in("status", ["calculated", "paid"]);

  revalidatePath("/admin/tickets");
  if (commErr)
    return {
      ok: true,
      refundFull,
      warning: `Boleta reembolsada, pero no se pudo marcar la comisión: ${commErr.message}`,
    };
  return { ok: true, refundFull };
}

// ---------------------------------------------------------------------------
// Transferencia de titular (deja registro de dueño original y destino).
// ---------------------------------------------------------------------------
export async function transferTicket(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  const toEmail = ((formData.get("to_email") as string) || "")
    .toLowerCase()
    .trim();
  const note = ((formData.get("note") as string) || "").trim();
  if (!id || !toEmail)
    return { ok: false, error: "Faltan datos (boleta o correo destino)." };

  const { data: ticket } = await admin
    .from("tickets")
    .select("user_id,ticket_email,original_owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Boleta no encontrada." };

  const toUserId = await findUserIdByEmail(admin, toEmail);

  const { error: tErr } = await admin.from("ticket_transfers").insert({
    ticket_id: id,
    from_user_id: ticket.user_id,
    from_email: ticket.ticket_email,
    to_user_id: toUserId,
    to_email: toEmail,
    note: note || null,
  });
  if (tErr) return { ok: false, error: tErr.message };

  const { error: uErr } = await admin
    .from("tickets")
    .update({
      user_id: toUserId,
      ticket_email: toEmail,
      original_owner_id: ticket.original_owner_id ?? ticket.user_id,
    })
    .eq("id", id);
  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath("/admin/tickets");
  return { ok: true, matched: !!toUserId };
}

/** Marca una boleta como usada (ingreso registrado). */
export async function markUsed(formData: FormData) {
  const admin = await assertAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Falta el id." };
  const { error } = await admin
    .from("tickets")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/tickets");
  return error ? { ok: false, error: error.message } : { ok: true };
}
