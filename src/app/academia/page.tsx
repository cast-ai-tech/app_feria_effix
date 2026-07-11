import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AcademiaClient, {
  type Recording,
} from "@/components/academia/AcademiaClient";

export default async function AcademiaPage() {
  const a = await getAccess();

  // Acceso: Academia es de POR VIDA para alumni (boleta válida en cualquier
  // edición). No requiere boleta vigente. Admin siempre pasa.
  if (!a.configured)
    return <LockedModule title="Academia" reason="alumni" configured={false} />;
  if (!a.user) return <LockedModule title="Academia" reason="login" />;
  if (!a.isAlumni && !a.isAdmin)
    return <LockedModule title="Academia" reason="alumni" />;

  const supabase = await createClient();

  // Solo grabaciones aprobadas se muestran a los usuarios.
  const { data: recs } = await supabase
    .from("recordings")
    .select("id,title,speaker_name,description,video_url,edition")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const recordings = (recs ?? []) as Omit<
    Recording,
    "avg" | "count" | "myStars"
  >[];

  // Calificaciones (lectura pública) → promedio + conteo + la del usuario.
  const ids = recordings.map((r) => r.id);
  const { data: ratings } = ids.length
    ? await supabase
        .from("recording_ratings")
        .select("recording_id,user_id,stars")
        .in("recording_id", ids)
    : { data: [] as { recording_id: string; user_id: string; stars: number }[] };

  const agg = new Map<string, { sum: number; count: number; mine: number }>();
  for (const r of ratings ?? []) {
    const cur = agg.get(r.recording_id) ?? { sum: 0, count: 0, mine: 0 };
    cur.sum += r.stars;
    cur.count += 1;
    if (r.user_id === a.user.id) cur.mine = r.stars;
    agg.set(r.recording_id, cur);
  }

  const enriched: Recording[] = recordings.map((r) => {
    const s = agg.get(r.id);
    return {
      ...r,
      avg: s && s.count > 0 ? s.sum / s.count : 0,
      count: s?.count ?? 0,
      myStars: s?.mine ?? 0,
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Academia"
        subtitle="Acceso de por vida · todas las ediciones"
        backHref="/"
      />
      <AcademiaClient recordings={enriched} />
    </div>
  );
}
