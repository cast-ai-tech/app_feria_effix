"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField } from "@/components/Field";
import { createSpeaker, deleteSpeaker } from "./actions";

export type AdminSpeaker = {
  id: string;
  full_name: string;
  role: string | null;
  talk_title: string | null;
  talk_starts_at: string | null;
  edition: number;
};

export default function AdminPonentesClient({
  speakers,
  currentEdition,
}: {
  speakers: AdminSpeaker[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nuevo ponente</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createSpeaker, new FormData(form), () => {
              form.reset();
              setBio("");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Nombre completo" name="full_name" placeholder="Nombre del ponente" required />
          <Field label="Rol / cargo" name="role" placeholder="Ej. CEO de…" />
          <Field label="Título de la charla" name="talk_title" placeholder="Nombre de la ponencia" />
          <Field
            label="Fecha y hora de la charla"
            name="talk_starts_at"
            type="text"
            placeholder="AAAA-MM-DD HH:MM"
          />
          <Field label="Foto (URL)" name="photo_url" placeholder="https://…" />
          <TextAreaField label="Bio" name="bio" value={bio} onChange={setBio} placeholder="Reseña del ponente" />
          <Field label="Instagram" name="instagram" placeholder="@usuario" />
          <Field label="LinkedIn" name="linkedin" placeholder="linkedin.com/in/…" />
          <Field label="Sitio web" name="website" placeholder="https://…" />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear ponente"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Ponentes ({speakers.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {speakers.map((s) => (
          <GlassCard key={s.id} className="flex items-center justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-brand-white">
                {s.full_name}
              </p>
              <p className="truncate text-[10px] text-brand-muted">
                {[s.role, s.talk_title].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Badge>Ed. {s.edition}</Badge>
              <form
                action={(fd) => run(deleteSpeaker, fd)}
                onSubmit={(e) => {
                  if (!confirm("¿Eliminar este ponente? Esta acción no se puede deshacer.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={s.id} />
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
