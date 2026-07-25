import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AcademiaClient, {
  type CollectionView,
  type ContinueItem,
} from "@/components/academia/AcademiaClient";
import TeaserAcademia from "@/components/academia/TeaserAcademia";
import type { RecordingView } from "@/components/academia/RecordingCard";

type RecordingRow = {
  id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  video_url: string | null;
  edition: number;
};

/**
 * ACADEMIA 2.0 (Fase 20).
 * - Alumni/admin: repositorio completo, filtrado por edición SERVER-SIDE
 *   (hallazgo #29), colecciones curadas y "continuar viendo".
 * - Anillo gratis (registrado sin boleta): teaser con las charlas is_free
 *   y CTA a boleta — ya no un LockedModule seco.
 * - Privacidad (hallazgo #15): los promedios salen de la vista agregada
 *   recording_rating_stats; la tabla de ratings solo expone la fila propia.
 */
export default async function AcademiaPage({
  searchParams,
}: {
  searchParams: Promise<{ edicion?: string }>;
}) {
  const a = await getAccess();

  if (!a.configured)
    return <LockedModule title="Academia" reason="alumni" configured={false} />;
  if (!a.user) return <LockedModule title="Academia" reason="login" />;

  const supabase = await createClient();
  const userId = a.user.id;

  /** Enriquece filas con rating (vista agregada) + mi voto + mi progreso. */
  async function enrich(rows: RecordingRow[]): Promise<RecordingView[]> {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];

    const [{ data: stats }, { data: mine }, { data: progress }] =
      await Promise.all([
        supabase
          .from("recording_rating_stats")
          .select("recording_id,avg_stars,votes")
          .in("recording_id", ids),
        supabase
          .from("recording_ratings")
          .select("recording_id,stars")
          .eq("user_id", userId)
          .in("recording_id", ids),
        supabase
          .from("watch_progress")
          .select("recording_id,completed")
          .eq("user_id", userId)
          .in("recording_id", ids),
      ]);

    const statById = new Map(
      (stats ?? []).map((s) => [s.recording_id, s] as const),
    );
    const myById = new Map(
      (mine ?? []).map((m) => [m.recording_id, m.stars] as const),
    );
    const progById = new Map(
      (progress ?? []).map((p) => [p.recording_id, p.completed] as const),
    );

    return rows.map((r) => {
      const s = statById.get(r.id);
      return {
        ...r,
        avg: s ? Number(s.avg_stars) : 0,
        count: s?.votes ?? 0,
        myStars: myById.get(r.id) ?? 0,
        opened: progById.has(r.id),
        completed: progById.get(r.id) ?? false,
      };
    });
  }

  // ── Anillo gratis: teaser ─────────────────────────────────────────────
  if (!a.isAlumni && !a.isAdmin) {
    const { data: freeRows } = await supabase
      .from("recordings")
      .select("id,title,speaker_name,description,video_url,edition")
      .eq("is_free", true)
      .eq("status", "publicada")
      .order("created_at", { ascending: false })
      .limit(4);

    return (
      <div className="flex flex-col">
        <PageHeader
          title="Academia"
          subtitle="Charlas destacadas abiertas para ti"
          backHref="/"
        />
        <TeaserAcademia recordings={await enrich(freeRows ?? [])} />
      </div>
    );
  }

  // ── Alumni/admin: vista completa ──────────────────────────────────────
  const { data: eds } = await supabase
    .from("editions")
    .select("year")
    .order("year", { ascending: false });
  const editions =
    (eds ?? []).map((e) => e.year).length > 0
      ? (eds ?? []).map((e) => e.year)
      : [a.currentEdition];

  const sp = await searchParams;
  const requested = parseInt(sp.edicion ?? "", 10);
  const selectedEdition = editions.includes(requested)
    ? requested
    : editions[0];

  const [{ data: recRows }, { data: colRows }, { data: cwRows }] =
    await Promise.all([
      supabase
        .from("recordings")
        .select("id,title,speaker_name,description,video_url,edition")
        .eq("status", "publicada")
        .eq("edition", selectedEdition)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("collections")
        .select("id,name,description,edition,sort_order")
        .or(`edition.is.null,edition.eq.${selectedEdition}`)
        .order("sort_order"),
      supabase
        .from("watch_progress")
        .select("recording_id,updated_at,recordings(title,speaker_name,video_url,status)")
        .eq("user_id", userId)
        .eq("completed", false)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

  const collectionsMeta = colRows ?? [];
  const { data: itemRows } = collectionsMeta.length
    ? await supabase
        .from("collection_items")
        .select("collection_id,recording_id,sort_order")
        .in(
          "collection_id",
          collectionsMeta.map((c) => c.id),
        )
        .order("sort_order")
    : { data: [] };

  const collections: CollectionView[] = collectionsMeta.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    itemIds: (itemRows ?? [])
      .filter((i) => i.collection_id === c.id)
      .map((i) => i.recording_id),
  }));

  const continueWatching: ContinueItem[] = (cwRows ?? [])
    .map((row) => {
      const rec = row.recordings as unknown as {
        title: string;
        speaker_name: string | null;
        video_url: string | null;
        status: string;
      } | null;
      if (!rec || rec.status !== "publicada") return null;
      return {
        id: row.recording_id,
        title: rec.title,
        speaker_name: rec.speaker_name,
        video_url: rec.video_url,
      };
    })
    .filter((x): x is ContinueItem => x !== null);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Academia"
        subtitle="Acceso de por vida · todas las ediciones"
        backHref="/"
      />
      <BannerSlot
        placement="module_top"
        moduleKey="academia"
        edition={a.currentEdition}
        className="mb-4"
      />
      <AcademiaClient
        recordings={await enrich((recRows ?? []) as RecordingRow[])}
        editions={editions}
        selectedEdition={selectedEdition}
        collections={collections}
        continueWatching={continueWatching}
      />
    </div>
  );
}
