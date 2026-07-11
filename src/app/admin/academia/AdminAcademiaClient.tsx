"use client";

import { useTransition, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField, SelectField } from "@/components/Field";
import {
  createRecording,
  toggleApproved,
  deleteRecording,
} from "./actions";

export type AdminRecording = {
  id: string;
  title: string;
  speaker_name: string | null;
  description: string | null;
  video_url: string | null;
  edition: number;
  approved: boolean;
};

const EDITIONS = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

export default function AdminAcademiaClient({
  recordings,
}: {
  recordings: AdminRecording[];
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [edition, setEdition] = useState("2026");

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `⚠️ ${res.error}` : "✅ Listo");
      if (res?.ok) reset?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva grabación</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createRecording, new FormData(form), () => form.reset());
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Título" name="title" placeholder="Nombre de la ponencia" required />
          <Field label="Ponente" name="speaker_name" placeholder="Nombre del ponente" />
          <Field label="URL del video" name="video_url" placeholder="https://…" />
          <TextAreaField label="Descripción" name="description" value="" onChange={() => {}} placeholder="Breve descripción" />
          <SelectField
            label="Edición"
            name="edition"
            value={edition}
            onChange={setEdition}
            options={EDITIONS}
          />
          <label className="flex items-center gap-2 text-[11px] font-bold text-brand-dim">
            <input type="checkbox" name="approved" />
            Aprobado para Academia (visible a asistentes)
          </label>
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear grabación"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Grabaciones ({recordings.length})</SectionTitle>
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
              </div>
              <Badge>{r.approved ? "Aprobada" : "Borrador"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <form action={(fd) => run(toggleApproved, fd)}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approved" value={r.approved ? "false" : "true"} />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  {r.approved ? "Quitar aprobación" : "Aprobar"}
                </button>
              </form>
              <form action={(fd) => run(deleteRecording, fd)}>
                <input type="hidden" name="id" value={r.id} />
                <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                  Eliminar
                </button>
              </form>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
