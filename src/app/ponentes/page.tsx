import { Mic, UserRound } from "lucide-react";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import EmptyState from "@/components/EmptyState";
import LockedModule from "@/components/LockedModule";
import Stars from "@/components/ponentes/Stars";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

export default async function PonentesPage() {
  const a = await getAccess();

  // Acceso: Ponentes REQUIERE BOLETA VIGENTE del año en curso.
  if (!a.configured)
    return (
      <LockedModule
        title="Ponentes"
        subtitle="Perfiles, calificaciones y preguntas"
        reason="ticket"
        configured={false}
      />
    );
  if (!a.user)
    return (
      <LockedModule
        title="Ponentes"
        subtitle="Perfiles, calificaciones y preguntas"
        reason="login"
      />
    );
  if (!a.hasCurrentTicket && !a.isAdmin)
    return (
      <LockedModule
        title="Ponentes"
        subtitle="Perfiles, calificaciones y preguntas"
        reason="ticket"
      />
    );

  const supabase = await createClient();

  // El directorio rota por edición en curso.
  const { data: speakers } = await supabase
    .from("speakers")
    .select("id,full_name,photo_url,role,talk_title,talk_starts_at,edition")
    .eq("edition", a.currentEdition)
    .order("talk_starts_at", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  const list = speakers ?? [];

  // Promedio de estrellas por ponente (lectura pública de speaker_ratings).
  const avgById = new Map<string, { avg: number; count: number }>();
  if (list.length > 0) {
    const { data: ratings } = await supabase
      .from("speaker_ratings")
      .select("speaker_id,stars")
      .in(
        "speaker_id",
        list.map((s) => s.id),
      );
    const acc = new Map<string, { sum: number; count: number }>();
    for (const r of ratings ?? []) {
      const cur = acc.get(r.speaker_id) ?? { sum: 0, count: 0 };
      cur.sum += r.stars;
      cur.count += 1;
      acc.set(r.speaker_id, cur);
    }
    for (const [id, { sum, count }] of acc) {
      avgById.set(id, { avg: sum / count, count });
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ponentes"
        subtitle="Califica, sigue y pregunta"
        backHref="/"
      />

      <BannerSlot
        placement="module_top"
        moduleKey="ponentes"
        edition={a.currentEdition}
        className="mb-4"
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<Mic className="h-6 w-6" aria-hidden />}
          title="Aún no hay ponentes publicados"
          subtitle="Muy pronto anunciaremos las charlas y quiénes las dictan."
        />
      ) : (
        <GlassCard className="flex flex-col divide-y divide-white/[0.06] p-2 md:grid md:grid-cols-2 md:gap-x-4 md:divide-y-0 xl:grid-cols-3">
          {list.map((s) => {
            const rating = avgById.get(s.id);
            return (
              <ListItem
                key={s.id}
                href={`/ponentes/${s.id}`}
                thumb={
                  s.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.photo_url}
                      alt=""
                      className="h-full w-full rounded-[12px] object-cover"
                    />
                  ) : (
                    <UserRound className="h-5 w-5 text-brand-white" aria-hidden />
                  )
                }
                title={s.full_name}
                subtitle={
                  [s.role, s.talk_title].filter(Boolean).join(" · ") || undefined
                }
                right={
                  rating ? (
                    <Stars value={rating.avg} count={rating.count} />
                  ) : (
                    <span className="text-brand-muted">›</span>
                  )
                }
              />
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}
