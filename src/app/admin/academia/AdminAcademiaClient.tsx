"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, Eye, Gift, TriangleAlert } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField, SelectField } from "@/components/Field";
import { isPlaceholderUrl } from "@/lib/placeholders";
import { cn } from "@/lib/cn";
import {
  addCollectionItem,
  createCollection,
  createRecording,
  deleteCollection,
  deleteRecording,
  removeCollectionItem,
  setRecordingStatus,
  toggleFree,
  updateRecording,
} from "./actions";

export type AdminRecording = {
  id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  video_url: string | null;
  edition: number;
  status: string; // 'borrador' | 'revision' | 'publicada'
  is_free: boolean;
  /** Métricas de video (Fase 27, vista recording_watch_stats). */
  viewers: number;
  completedCount: number;
  avgPctWatched: number;
};

export type InstallTotals = {
  shown: number;
  accepted: number;
  dismissed: number;
};

export type AdminCollection = {
  id: string;
  name: string;
  description: string | null;
  edition: number | null;
  items: { recordingId: string; title: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  borrador: "Borrador",
  revision: "En revisión",
  publicada: "Publicada",
};

const STATUS_ORDER = ["borrador", "revision", "publicada"] as const;

type ActionFn = (fd: FormData) => Promise<{ ok?: boolean; error?: string }>;

/** Formulario de grabación (crear y editar) — pipeline con metadata completa. */
function RecordingForm({
  initial,
  editions,
  pending,
  submitLabel,
  onSubmit,
}: {
  initial?: AdminRecording;
  editions: number[];
  pending: boolean;
  submitLabel: string;
  onSubmit: (fd: FormData) => void;
}) {
  const editionOptions = editions.map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const [edition, setEdition] = useState(
    String(initial?.edition ?? editions[0] ?? ""),
  );
  const [status, setStatus] = useState(initial?.status ?? "borrador");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="flex flex-col gap-3"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field
        label="Título"
        name="title"
        defaultValue={initial?.title ?? ""}
        placeholder="Nombre de la ponencia"
        required
      />
      <Field
        label="Ponente"
        name="speaker_name"
        defaultValue={initial?.speaker_name ?? ""}
        placeholder="Nombre del ponente"
      />
      <Field
        label="URL del video"
        name="video_url"
        defaultValue={initial?.video_url ?? ""}
        placeholder="https://…"
      />
      <TextAreaField
        label="Descripción"
        name="description"
        value={description}
        onChange={setDescription}
        placeholder="Breve descripción"
      />
      <SelectField
        label="Edición"
        name="edition"
        value={edition}
        onChange={setEdition}
        options={editionOptions}
      />
      <SelectField
        label="Estado del pipeline"
        name="status"
        value={status}
        onChange={setStatus}
        options={STATUS_ORDER.map((s) => ({
          value: s,
          label: STATUS_LABEL[s],
        }))}
      />
      <label className="flex items-center gap-2 text-[11px] font-bold text-brand-dim">
        <input
          type="checkbox"
          name="is_free"
          defaultChecked={initial?.is_free ?? false}
        />
        Teaser gratis (visible para registrados sin boleta)
      </label>
      <Button type="submit" variant="ghost" fullWidth disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export default function AdminAcademiaClient({
  recordings,
  editions,
  collections,
  page,
  hasMore,
  total,
  q,
  installTotals,
}: {
  recordings: AdminRecording[];
  /** Años disponibles (tabla `editions`), de más reciente a más antiguo. */
  editions: number[];
  collections: AdminCollection[];
  page: number;
  hasMore: boolean;
  total: number;
  q: string;
  installTotals: InstallTotals;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createKey, setCreateKey] = useState(0);

  function run(fn: ActionFn, fd: FormData, onDone?: () => void) {
    startTransition(async () => {
      const res = await fn(fd);
      if (res?.error) setNote(`Error: ${res.error}`);
      else {
        setNote("Listo ✓");
        onDone?.();
      }
    });
  }

  const pageUrl = (p: number) =>
    `/admin/academia?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Crear grabación */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva grabación</SectionTitle>
        <RecordingForm
          key={createKey}
          editions={editions}
          pending={pending}
          submitLabel="Crear grabación"
          onSubmit={(fd) => {
            run(createRecording, fd, () => setCreateKey((k) => k + 1));
          }}
        />
      </GlassCard>

      {/* Colecciones curadas */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Colecciones</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createCollection, new FormData(form), () => form.reset());
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label="Nombre"
            name="name"
            placeholder="Ej. Logística y última milla"
            required
          />
          <Field
            label="Descripción"
            name="description"
            placeholder="Opcional"
          />
          <Field
            label="Edición (vacío = todas)"
            name="edition"
            placeholder={String(editions[0] ?? "")}
          />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear colección"}
          </Button>
        </form>

        {collections.length > 0 && (
          <div className="flex flex-col gap-2 pt-2">
            {collections.map((c) => (
              <div
                key={c.id}
                className="rounded-[14px] border border-white/10 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-extrabold text-brand-white">
                      {c.name}
                    </p>
                    <p className="text-[9.5px] text-brand-muted">
                      {c.edition
                        ? `Edición ${c.edition}`
                        : "Todas las ediciones"}
                      {" · "}
                      {c.items.length}{" "}
                      {c.items.length === 1 ? "charla" : "charlas"}
                    </p>
                  </div>
                  <form
                    action={(fd) => run(deleteCollection, fd)}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          "¿Eliminar esta colección? Las grabaciones no se borran, solo la agrupación.",
                        )
                      )
                        e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                      Eliminar
                    </button>
                  </form>
                </div>
                {c.items.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {c.items.map((i) => (
                      <li
                        key={i.recordingId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-[10px] text-brand-muted">
                          {i.title}
                        </span>
                        <form action={(fd) => run(removeCollectionItem, fd)}>
                          <input
                            type="hidden"
                            name="collection_id"
                            value={c.id}
                          />
                          <input
                            type="hidden"
                            name="recording_id"
                            value={i.recordingId}
                          />
                          <button className="text-[9.5px] font-bold text-red-300">
                            Quitar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Métricas del aviso de instalación PWA (Fase 27) */}
      <GlassCard className="flex items-center gap-2 p-4">
        <Download
          className="h-4 w-4 flex-shrink-0 text-brand-white"
          aria-hidden
        />
        <p className="text-[10.5px] text-brand-muted">
          Instalación de la app: visto{" "}
          <b className="text-brand-white">{installTotals.shown}</b> veces ·
          instalado <b className="text-brand-white">{installTotals.accepted}</b>{" "}
          veces · descartado{" "}
          <b className="text-brand-white">{installTotals.dismissed}</b> veces
        </p>
      </GlassCard>

      {/* Buscador server-side (hallazgo #29) */}
      <form method="get" action="/admin/academia" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o ponente…"
          className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60"
        />
        <Button type="submit" variant="ghost">
          Buscar
        </Button>
      </form>

      <SectionTitle>
        Grabaciones ({total}
        {q ? ` · filtro "${q}"` : ""})
      </SectionTitle>

      <div className="flex flex-col gap-2">
        {recordings.map((r) => (
          <GlassCard key={r.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {r.title}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {r.speaker_name ?? "—"} · Ed. {r.edition}
                </p>
                {r.viewers > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-brand-dim">
                    <Eye className="h-3 w-3 flex-shrink-0" aria-hidden />
                    {r.viewers} {r.viewers === 1 ? "vista" : "vistas"} ·{" "}
                    {r.avgPctWatched}% completitud promedio · {r.completedCount}{" "}
                    terminaron
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <Badge>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                {r.is_free && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                    <Gift className="h-2.5 w-2.5" aria-hidden /> teaser gratis
                  </span>
                )}
                {isPlaceholderUrl(r.video_url) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                    <TriangleAlert className="h-2.5 w-2.5" aria-hidden /> video
                    placeholder
                  </span>
                )}
              </div>
            </div>

            {/* Pipeline: mover de estado */}
            <div className="flex flex-wrap gap-2 pt-1">
              {STATUS_ORDER.map((s) => (
                <form key={s} action={(fd) => run(setRecordingStatus, fd)}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    disabled={r.status === s}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[9.5px] font-bold",
                      r.status === s
                        ? "border-white/60 bg-brand-white text-black"
                        : "border-white/25 text-brand-dim",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
              >
                {editingId === r.id ? "Cerrar" : "Editar"}
              </button>
              <form action={(fd) => run(toggleFree, fd)}>
                <input type="hidden" name="id" value={r.id} />
                <input
                  type="hidden"
                  name="is_free"
                  value={r.is_free ? "false" : "true"}
                />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  {r.is_free ? "Quitar teaser" : "Hacer teaser"}
                </button>
              </form>
              <form
                action={(fd) => run(deleteRecording, fd)}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      "¿Eliminar esta grabación? Se borran sus calificaciones y progreso. Esta acción no se puede deshacer.",
                    )
                  )
                    e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={r.id} />
                <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                  Eliminar
                </button>
              </form>
            </div>

            {/* Agregar a colección */}
            {collections.length > 0 && (
              <form
                action={(fd) => run(addCollectionItem, fd)}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="recording_id" value={r.id} />
                <select
                  name="collection_id"
                  className="w-full rounded-[10px] border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] text-brand-white"
                  defaultValue=""
                  required
                >
                  <option value="" disabled className="bg-brand-black">
                    Agregar a colección…
                  </option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id} className="bg-brand-black">
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="flex-shrink-0 rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  Agregar
                </button>
              </form>
            )}

            {editingId === r.id && (
              <div className="pt-2">
                <RecordingForm
                  initial={r}
                  editions={editions}
                  pending={pending}
                  submitLabel="Guardar cambios"
                  onSubmit={(fd) =>
                    run(updateRecording, fd, () => setEditingId(null))
                  }
                />
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Paginación server-side */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="rounded-full border border-white/25 px-4 py-2 text-[10px] font-bold text-brand-dim"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-brand-muted">Página {page}</span>
          {hasMore ? (
            <Link
              href={pageUrl(page + 1)}
              className="rounded-full border border-white/25 px-4 py-2 text-[10px] font-bold text-brand-dim"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
