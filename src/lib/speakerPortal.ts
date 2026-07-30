import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lógica de negocio del portal del ponente /mi-charla (Fase 28).
 *
 * Escrituras SIEMPRE por server action con service key tras validar
 * ownership (speakers.user_id = auth.uid()) — no hay política RLS de
 * UPDATE para el ponente, igual que el portal del expositor (F19).
 */

export type MySpeaker = {
  id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  role: string | null;
  talk_title: string | null;
  talk_starts_at: string | null;
  instagram: string | null;
  linkedin: string | null;
  website: string | null;
  edition: number;
  /** Promedio de estrellas (1-5) o null sin calificaciones. */
  avgRating: number | null;
  ratingsCount: number;
  followersCount: number;
};

/** Fichas de ponente vinculadas a la cuenta, con métricas agregadas. */
export async function getMySpeakers(userId: string): Promise<MySpeaker[]> {
  const supabase = await createClient();
  const { data: speakers } = await supabase
    .from("speakers")
    .select(
      "id,full_name,photo_url,bio,role,talk_title,talk_starts_at,instagram,linkedin,website,edition",
    )
    .eq("user_id", userId)
    .order("edition", { ascending: false });
  if (!speakers || speakers.length === 0) return [];

  const ids = speakers.map((s) => s.id);
  const [{ data: ratings }, { data: follows }] = await Promise.all([
    supabase
      .from("speaker_ratings")
      .select("speaker_id,stars")
      .in("speaker_id", ids),
    supabase.from("speaker_follows").select("speaker_id").in("speaker_id", ids),
  ]);

  return speakers.map((s) => {
    const mine = (ratings ?? []).filter((r) => r.speaker_id === s.id);
    const sum = mine.reduce((acc, r) => acc + r.stars, 0);
    return {
      ...s,
      avgRating:
        mine.length > 0 ? Math.round((sum / mine.length) * 10) / 10 : null,
      ratingsCount: mine.length,
      followersCount: (follows ?? []).filter((f) => f.speaker_id === s.id)
        .length,
    };
  });
}

/**
 * Valida que quien llama es el dueño de la ficha de ponente (o admin)
 * y devuelve el cliente service-role para escribir saltando RLS.
 */
export async function assertSpeakerOwner(speakerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [{ data: profile }, { data: speaker }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("speakers")
      .select("id,user_id")
      .eq("id", speakerId)
      .maybeSingle(),
  ]);

  if (!speaker) throw new Error("Ponente no encontrado");
  if (!profile?.is_admin && speaker.user_id !== user.id) {
    throw new Error("No autorizado (no es tu ficha de ponente)");
  }
  return createAdminClient();
}
