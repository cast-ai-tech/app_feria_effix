"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import { createTalk, updateTalk, cancelTalk, reactivateTalk } from "./actions";

export type AdminTalk = {
  id: string;
  title: string;
  description: string | null;
  speaker_name: string | null;
  auditorium: string | null;
  day: number | null;
  starts_at: string | null;
  ends_at: string | null;
  edition: number;
  status: string;
};

const TZ = "America/Bogota";

const DAY_OPTIONS = [
  { value: "1", label: "Día 1 · 16 oct" },
  { value: "2", label: "Día 2 · 17 oct" },
  { value: "3", label: "Día 3 · 18 oct" },
];

const TIME_INPUT =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white outline-none focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60 " +
  "[color-scheme:dark]";

/** "HH:MM" en la zona del evento (para prellenar los campos de hora). */
function timeValue(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

type Action = (fd: FormData) => Promise<{ ok: boolean; error?: string }>;

function TalkForm({
  initial,
  currentEdition,
  onSubmit,
  submitLabel,
  pending,
}: {
  initial?: AdminTalk;
  currentEdition: number;
  onSubmit: (fd: FormData) => void;
  submitLabel: string;
  pending: boolean;
}) {
  const [day, setDay] = useState(String(initial?.day ?? 1));
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
      <input
        type="hidden"
        name="edition"
        defaultValue={initial?.edition ?? currentEdition}
      />

      <Field
        label="Título"
        name="title"
        defaultValue={initial?.title ?? ""}
        placeholder="Título de la charla"
        required
      />
      <Field
        label="Ponente"
        name="speaker_name"
        defaultValue={initial?.speaker_name ?? ""}
        placeholder="Nombre del ponente"
      />
      <Field
        label="Auditorio"
        name="auditorium"
        defaultValue={initial?.auditorium ?? ""}
        placeholder="Auditorio 1"
      />
      <SelectField
        label="Día"
        name="day"
        value={day}
        onChange={setDay}
        options={DAY_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-brand-dim">
            Inicio
          </span>
          <input
            name="start_time"
            type="time"
            defaultValue={timeValue(initial?.starts_at ?? null)}
            className={TIME_INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-brand-dim">
            Fin
          </span>
          <input
            name="end_time"
            type="time"
            defaultValue={timeValue(initial?.ends_at ?? null)}
            className={TIME_INPUT}
          />
        </label>
      </div>
      <TextAreaField
        label="Descripción"
        name="description"
        value={description}
        onChange={setDescription}
        placeholder="De qué trata la charla"
      />
      <Button type="submit" variant="ghost" fullWidth disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export default function AdminAgendaClient({
  talks,
  currentEdition,
}: {
  talks: AdminTalk[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createKey, setCreateKey] = useState(0);

  function run(fn: Action, fd: FormData, onDone?: () => void) {
    startTransition(async () => {
      const res = await fn(fd);
      if (res?.error) setNote(`⚠️ ${res.error}`);
      else {
        setNote("✅ Listo");
        onDone?.();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Crear charla */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva charla</SectionTitle>
        <TalkForm
          key={createKey}
          currentEdition={currentEdition}
          pending={pending}
          submitLabel="Crear charla"
          onSubmit={(fd) => {
            run(createTalk, fd);
            setCreateKey((k) => k + 1);
          }}
        />
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Listado */}
      <SectionTitle>Charlas ({talks.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {talks.map((t) => {
          const cancelled = t.status === "cancelled";
          const time =
            t.starts_at && t.ends_at
              ? `${timeValue(t.starts_at)} – ${timeValue(t.ends_at)}`
              : "—";
          return (
            <GlassCard key={t.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[12px] font-extrabold text-brand-white",
                      cancelled && "line-through opacity-70",
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="truncate text-[10px] text-brand-muted">
                    {[t.auditorium, time].filter(Boolean).join(" · ")}
                    {t.speaker_name ? ` · ${t.speaker_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge>{t.day ? `Día ${t.day}` : "—"}</Badge>
                  <span
                    className={cn(
                      "text-[9.5px] font-bold",
                      cancelled ? "text-red-300" : "text-emerald-300",
                    )}
                  >
                    {cancelled ? "cancelada" : "activa"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() =>
                    setEditingId(editingId === t.id ? null : t.id)
                  }
                  className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                >
                  {editingId === t.id ? "Cerrar" : "Editar"}
                </button>
                {cancelled ? (
                  <form action={(fd) => run(reactivateTalk, fd)}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                      Reactivar
                    </button>
                  </form>
                ) : (
                  <form action={(fd) => run(cancelTalk, fd)}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                      Cancelar
                    </button>
                  </form>
                )}
              </div>

              {editingId === t.id && (
                <div className="pt-2">
                  <TalkForm
                    initial={t}
                    currentEdition={currentEdition}
                    pending={pending}
                    submitLabel="Guardar cambios"
                    onSubmit={(fd) =>
                      run(updateTalk, fd, () => setEditingId(null))
                    }
                  />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
