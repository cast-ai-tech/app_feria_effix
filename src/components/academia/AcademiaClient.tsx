"use client";

import { GraduationCap, LockOpen, Play } from "lucide-react";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import RecordingCard, {
  type RecordingView,
} from "@/components/academia/RecordingCard";

export type ContinueItem = {
  id: string;
  title: string;
  speaker_name: string | null;
  video_url: string | null;
};

export type CollectionView = {
  id: string;
  name: string;
  description: string | null;
  itemIds: string[];
};

const INPUT =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white placeholder:text-brand-muted outline-none " +
  "focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60";

/**
 * Covers por edición: memorias visuales OFICIALES del sitio feriaeffix.com
 * (assets estáticos de la app). Ediciones sin foto (p. ej. la vigente) no
 * muestran cover.
 */
const EDITION_COVERS: Record<number, string> = {
  2021: "/academia/edicion-2021.webp",
  2022: "/academia/edicion-2022.webp",
  2023: "/academia/edicion-2023.webp",
  2024: "/academia/edicion-2024.webp",
  2025: "/academia/edicion-2025.webp",
};

/**
 * Academia 2.0 (Fase 20) — vista completa para alumni/admin.
 * La edición se filtra SERVER-SIDE (?edicion=YYYY, hallazgo #29); los chips
 * navegan. El buscador filtra client-side sobre lo cargado.
 */
export default function AcademiaClient({
  recordings,
  editions,
  selectedEdition,
  collections,
  continueWatching,
}: {
  recordings: RecordingView[];
  /** Años disponibles (tabla `editions`), de más reciente a más antiguo. */
  editions: number[];
  selectedEdition: number;
  collections: CollectionView[];
  continueWatching: ContinueItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const byId = useMemo(
    () => new Map(recordings.map((r) => [r.id, r])),
    [recordings],
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recordings;
    // Busca por título, ponente, descripción y tema (nombre de colección).
    const collectionHits = new Set(
      collections
        .filter((c) => c.name.toLowerCase().includes(q))
        .flatMap((c) => c.itemIds),
    );
    return recordings.filter(
      (r) =>
        collectionHits.has(r.id) ||
        [r.title, r.speaker_name, r.description]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [recordings, collections, query]);

  /** Items de una colección presentes en la edición cargada, por rating. */
  function collectionRecordings(c: CollectionView): RecordingView[] {
    return c.itemIds
      .map((id) => byId.get(id))
      .filter((r): r is RecordingView => !!r)
      .sort((a, b) => b.avg - a.avg);
  }

  const visibleCollections = collections
    .map((c) => ({ meta: c, items: collectionRecordings(c) }))
    .filter((c) => c.items.length > 0);

  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-center">
        <Badge><LockOpen className="mr-1 inline h-3 w-3" aria-hidden />Acceso permanente</Badge>
      </div>

      {/* Chips de edición → navegación server-side */}
      <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {editions.map((e) => (
          <FilterChip
            key={e}
            active={selectedEdition === e}
            onClick={() => router.push(`/academia?edicion=${e}`)}
          >
            {e}
          </FilterChip>
        ))}
      </div>

      {/* Cover de la edición seleccionada (foto real de esa feria) */}
      {EDITION_COVERS[selectedEdition] && (
        <div className="relative mb-3 aspect-[16/6] w-full overflow-hidden rounded-[18px] border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={EDITION_COVERS[selectedEdition]}
            alt={`Feria Effix ${selectedEdition}`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <p className="absolute bottom-2.5 left-3.5 text-[13px] font-black tracking-wide text-brand-white">
            Así se vivió la edición {selectedEdition}
          </p>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={INPUT + " mb-2"}
        placeholder="Buscar por título, ponente o tema…"
      />

      {/* Continuar viendo (cross-edición) */}
      {!searching && continueWatching.length > 0 && (
        <>
          <SectionTitle>Continuar viendo</SectionTitle>
          <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {continueWatching.map((c) => (
              <a
                key={c.id}
                href={c.video_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[180px] flex-shrink-0"
              >
                <GlassCard className="flex flex-col gap-1 p-3">
                  <Play className="h-4 w-4 text-brand-white" aria-hidden />
                  <p className="line-clamp-2 text-[11px] font-extrabold leading-snug text-brand-white">
                    {c.title}
                  </p>
                  {c.speaker_name && (
                    <p className="truncate text-[9.5px] text-brand-muted">
                      {c.speaker_name}
                    </p>
                  )}
                </GlassCard>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Colecciones curadas, ordenadas por calificación */}
      {!searching &&
        visibleCollections.map(({ meta, items }) => (
          <div key={meta.id} className="mb-1">
            <SectionTitle>{meta.name}</SectionTitle>
            {meta.description && (
              <p className="-mt-1 mb-2 text-[10.5px] text-brand-muted">
                {meta.description}
              </p>
            )}
            <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2">
              {items.map((r) => (
                <RecordingCard key={`${meta.id}-${r.id}`} recording={r} />
              ))}
            </div>
          </div>
        ))}

      <SectionTitle>
        {searching
          ? `Resultados (${searched.length})`
          : `Ponencias ${selectedEdition} (${recordings.length})`}
      </SectionTitle>

      {searched.length === 0 ? (
        <div className="mt-1">
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" aria-hidden />}
            title={
              searching
                ? "Sin resultados"
                : `Sin grabaciones de ${selectedEdition}`
            }
            subtitle={
              searching
                ? "Prueba con otro título, ponente o tema."
                : "Aún no hay ponencias publicadas para esta edición. Vuelve pronto: seguimos subiendo contenido."
            }
          />
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-1 items-start gap-2.5 md:grid-cols-2">
          {searched.map((r) => (
            <RecordingCard key={r.id} recording={r} />
          ))}
        </div>
      )}
    </div>
  );
}
