"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField } from "@/components/Field";
import { createStand, deleteStand, setMeetingStatus } from "./actions";

export type AdminStand = {
  id: string;
  name: string;
  category: string | null;
  stand_number: string | null;
  description: string | null;
  edition: number;
};

export type AdminMeeting = {
  id: string;
  message: string | null;
  status: string;
  stand_name: string;
};

export default function AdminStandsClient({
  stands,
  meetings,
  currentEdition,
}: {
  stands: AdminStand[];
  meetings: AdminMeeting[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

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

  const pendingMeetings = meetings.filter((m) => m.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nuevo stand</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createStand, new FormData(form), () => form.reset());
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Nombre" name="name" placeholder="Nombre del expositor" required />
          <Field label="Categoría" name="category" placeholder="Ej. E-commerce" />
          <Field label="Número de stand" name="stand_number" placeholder="Ej. B12" />
          <TextAreaField label="Descripción" name="description" value="" onChange={() => {}} placeholder="Qué ofrece" />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear stand"}
          </Button>
        </form>
        <p className="text-[10px] text-brand-muted">
          Los stands se crean para la edición {currentEdition}. El directorio no
          mezcla años: cada edición se filtra por separado.
        </p>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Solicitudes de cita ({pendingMeetings.length} pendientes)</SectionTitle>
      {pendingMeetings.length === 0 ? (
        <p className="text-[11px] text-brand-muted">Sin solicitudes pendientes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pendingMeetings.map((m) => (
            <GlassCard key={m.id} className="flex flex-col gap-2 p-4">
              <p className="text-[12px] font-extrabold text-brand-white">{m.stand_name}</p>
              {m.message && (
                <p className="text-[10.5px] text-brand-muted">“{m.message}”</p>
              )}
              <div className="flex gap-2">
                <form action={(fd) => run(setMeetingStatus, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value="accepted" />
                  <button className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300">
                    Aceptar
                  </button>
                </form>
                <form action={(fd) => run(setMeetingStatus, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                    Rechazar
                  </button>
                </form>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <SectionTitle>Stands ({stands.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {stands.map((s) => (
          <GlassCard key={s.id} className="flex items-center justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-brand-white">
                {s.name}
              </p>
              <p className="truncate text-[10px] text-brand-muted">
                {s.category ?? "—"}
                {s.stand_number ? ` · ${s.stand_number}` : ""} · Ed. {s.edition}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Badge>Ed. {s.edition}</Badge>
              <form action={(fd) => run(deleteStand, fd)}>
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
