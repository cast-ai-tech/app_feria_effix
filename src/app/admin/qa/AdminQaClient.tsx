"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import {
  createPoll,
  deletePoll,
  finishTalk,
  setPollActive,
} from "./actions";

export type QaSpeakerRow = {
  id: string;
  full_name: string;
  talk_title: string | null;
  pending: number;
  approved: number;
  answered: number;
};

export type QaTalkRow = {
  id: string;
  title: string;
  status: string;
  day: number | null;
};

export type PollRow = {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  talk_title: string | null;
  totalVotes: number;
};

type Action = (fd: FormData) => Promise<{ ok: boolean; error?: string }>;

export default function AdminQaClient({
  speakers,
  talks,
  polls,
}: {
  speakers: QaSpeakerRow[];
  talks: QaTalkRow[];
  polls: PollRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [pollTalk, setPollTalk] = useState("");
  const [options, setOptions] = useState("");

  function run(fn: Action, fd: FormData, reset?: () => void) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Q&A por ponente/charla */}
      <SectionTitle className="mt-0">Q&A por charla</SectionTitle>
      {speakers.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sin ponentes en la edición activa.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {speakers.map((s) => (
            <GlassCard key={s.id} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {s.talk_title ?? s.full_name}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {s.full_name} · {s.pending} pendientes · {s.approved} aprobadas ·{" "}
                  {s.answered} respondidas
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {s.pending > 0 && <Badge dot>{s.pending}</Badge>}
                <Link
                  href={`/admin/qa/${s.id}`}
                  className="rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
                >
                  Moderar
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Finalizar charla → encuesta flash */}
      <SectionTitle>Charlas (encuesta flash)</SectionTitle>
      <p className="-mt-2 text-[10px] leading-relaxed text-brand-muted">
        Al marcar una charla como finalizada, los asistentes pueden calificarla
        en /encuesta. (El push automático a quienes la guardaron llega con las
        Fases 16-17.)
      </p>
      <div className="flex flex-col gap-2">
        {talks.map((t) => (
          <GlassCard key={t.id} className="flex items-center justify-between gap-2 p-4">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-brand-white">
                {t.title}
              </p>
              <p className="truncate text-[10px] text-brand-muted">
                {t.day ? `Día ${t.day} · ` : ""}
                {t.status === "finished"
                  ? "finalizada"
                  : t.status === "cancelled"
                    ? "cancelada"
                    : "activa"}
              </p>
            </div>
            {t.status === "active" && (
              <form action={(fd) => run(finishTalk, fd)}>
                <input type="hidden" name="id" value={t.id} />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  Finalizar
                </button>
              </form>
            )}
            {t.status === "finished" && <Badge>Finalizada</Badge>}
          </GlassCard>
        ))}
      </div>

      {/* Votaciones en vivo */}
      <SectionTitle>Votaciones en vivo</SectionTitle>
      <GlassCard className="flex flex-col gap-3 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createPoll, new FormData(form), () => {
              form.reset();
              setOptions("");
              setPollTalk("");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label="Pregunta"
            name="question"
            placeholder="¿Cuántos venden en Amazon?"
            required
          />
          <TextAreaField
            label="Opciones (una por línea)"
            name="options"
            value={options}
            onChange={setOptions}
            placeholder={"Sí, ya vendo\nEstoy empezando\nTodavía no"}
          />
          <SelectField
            label="Charla (opcional)"
            name="talk_id"
            value={pollTalk}
            onChange={setPollTalk}
            placeholder="Sin charla asociada"
            options={talks.map((t) => ({ value: t.id, label: t.title }))}
          />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear votación"}
          </Button>
        </form>
      </GlassCard>

      <div className="flex flex-col gap-2">
        {polls.map((p) => (
          <GlassCard key={p.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold text-brand-white">
                  {p.question}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {p.options.length} opciones · {p.totalVotes} votos
                  {p.talk_title ? ` · ${p.talk_title}` : ""}
                </p>
              </div>
              <Badge dot={p.active}>{p.active ? "EN VIVO" : "Apagada"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <form action={(fd) => run(setPollActive, fd)}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={p.active ? "false" : "true"} />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  {p.active ? "Apagar" : "Activar"}
                </button>
              </form>
              <Link
                href={`/proyector/poll/${p.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
              >
                <MonitorPlay className="h-3 w-3" aria-hidden /> Proyector
              </Link>
              <form
                action={(fd) => run(deletePoll, fd)}
                onSubmit={(e) => {
                  if (!confirm("¿Eliminar esta votación y sus votos? Esta acción no se puede deshacer.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={p.id} />
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
