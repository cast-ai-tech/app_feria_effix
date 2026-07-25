import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import AdminAcademiaClient, {
  type AdminCollection,
  type AdminRecording,
} from "./AdminAcademiaClient";

const PAGE_SIZE = 50;

/**
 * Admin de Academia 2.0 (Fase 20): pipeline de publicación, teaser,
 * colecciones, y listado con paginación + buscador server-side
 * (hallazgo #29 — antes traía todo con limit 300).
 */
export default async function AdminAcademiaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();

  // El admin ve TODAS las grabaciones (cualquier estado) vía RLS.
  let query = supabase
    .from("recordings")
    .select("id,title,speaker_name,description,video_url,edition,status,is_free", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    query = query.or(`title.ilike.%${q}%,speaker_name.ilike.%${q}%`);
  }

  const [{ data: recs, count }, { data: eds }, { data: cols }] =
    await Promise.all([
      query,
      supabase.from("editions").select("year").order("year", { ascending: false }),
      supabase
        .from("collections")
        .select("id,name,description,edition,sort_order")
        .order("sort_order"),
    ]);

  const collectionsMeta = cols ?? [];
  const { data: items } = collectionsMeta.length
    ? await supabase
        .from("collection_items")
        .select("collection_id,recording_id,sort_order,recordings(title)")
        .in(
          "collection_id",
          collectionsMeta.map((c) => c.id),
        )
        .order("sort_order")
    : { data: [] };

  const collections: AdminCollection[] = collectionsMeta.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    edition: c.edition,
    items: (items ?? [])
      .filter((i) => i.collection_id === c.id)
      .map((i) => {
        const rec = i.recordings as unknown as { title: string } | null;
        return { recordingId: i.recording_id, title: rec?.title ?? "—" };
      }),
  }));

  const editions = (eds ?? []).map((e) => e.year);
  const total = count ?? 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Academia"
        subtitle="Pipeline de publicación, colecciones y teaser gratuito"
        backHref="/admin"
      />
      <AdminAcademiaClient
        recordings={(recs ?? []) as AdminRecording[]}
        editions={editions.length > 0 ? editions : [2026, 2025, 2024]}
        collections={collections}
        page={page}
        hasMore={page * PAGE_SIZE < total}
        total={total}
        q={q}
      />
    </div>
  );
}
