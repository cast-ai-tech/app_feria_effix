"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/**
 * Citas personales de Mi Agenda (Fase 30): networking, negocios y
 * seguimientos — durante el evento y todo el año. Escriben con el cliente
 * NORMAL (RLS "dueño gestiona"): sin service key, el usuario solo puede
 * tocar sus propias filas.
 *
 * Las horas llegan como fecha + hora local del evento (Medellín, -05,
 * sin DST) — mismo criterio que toEventTimestamp en admin/agenda/actions.
 */
export async function createUserEvent(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para crear citas." };

  const title = ((formData.get("title") as string) || "").trim();
  const date = ((formData.get("date") as string) || "").trim();
  const startTime = ((formData.get("start_time") as string) || "").trim();
  const endTime = ((formData.get("end_time") as string) || "").trim();
  const location = ((formData.get("location") as string) || "").trim();
  const notes = ((formData.get("notes") as string) || "").trim();

  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false, error: "Falta la fecha." };
  if (!/^\d{2}:\d{2}$/.test(startTime))
    return { ok: false, error: "Falta la hora de inicio." };
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime))
    return { ok: false, error: "Hora de fin inválida." };
  if (endTime && endTime <= startTime)
    return { ok: false, error: "La hora de fin debe ser después del inicio." };

  const { error } = await supabase.from("user_events").insert({
    user_id: user.id,
    title,
    starts_at: `${date}T${startTime}:00-05:00`,
    ends_at: endTime ? `${date}T${endTime}:00-05:00` : null,
    location: location || null,
    notes: notes || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}

export async function deleteUserEvent(eventId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  // RLS ya restringe al dueño; el .eq("user_id") es cinturón y tirantes.
  const { error } = await supabase
    .from("user_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}
