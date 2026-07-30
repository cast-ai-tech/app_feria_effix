"use client";

import { useState, useTransition } from "react";
import { MessageCircleQuestion, UserRound } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import { Field, TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import {
  updateSpeakerProfile,
  setQuestionStatus,
} from "@/app/mi-charla/actions";
import type { MySpeaker } from "@/lib/speakerPortal";

export type MyQuestion = {
  id: string;
  speakerId: string;
  text: string;
  status: string;
  votes: number;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  answered: "Respondida",
  discarded: "Descartada",
};

const QA_FILTERS = ["pending", "approved", "answered", "discarded"] as const;

function PerfilTab({ speaker }: { speaker: MySpeaker }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [bio, setBio] = useState(speaker.bio ?? "");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSpeakerProfile(fd);
      setNote(res.error ? `Error: ${res.error}` : "Perfil actualizado ✓");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="hidden" name="speaker_id" value={speaker.id} />

      <GlassCard sheen className="flex items-center gap-3 p-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-brand-lav to-[#23222b]">
          {speaker.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={speaker.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-6 w-6 text-brand-white" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-brand-white">
            {speaker.full_name}
          </p>
          {speaker.talk_title && (
            <p className="text-[11px] text-brand-muted">{speaker.talk_title}</p>
          )}
          {speaker.talk_starts_at && (
            <p className="text-[10px] text-brand-dim">
              {new Date(speaker.talk_starts_at).toLocaleString("es-CO", {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <Badge>Ed. {speaker.edition}</Badge>
      </GlassCard>
      <p className="-mt-1 text-[9.5px] text-brand-muted">
        Nombre, charla y horario los gestiona el equipo Effix.
      </p>

      <TextAreaField
        label="Bio"
        name="bio"
        value={bio}
        onChange={setBio}
        placeholder="Cuéntale al público quién eres"
        rows={4}
      />
      <Field
        label="Instagram"
        name="instagram"
        defaultValue={speaker.instagram ?? ""}
        placeholder="@usuario"
      />
      <Field
        label="LinkedIn"
        name="linkedin"
        defaultValue={speaker.linkedin ?? ""}
        placeholder="linkedin.com/in/…"
      />
      <Field
        label="Sitio web"
        name="website"
        defaultValue={speaker.website ?? ""}
        placeholder="https://…"
      />

      {note && (
        <p className="text-[11px] font-semibold text-brand-white">{note}</p>
      )}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}

function QaTab({
  speaker,
  questions,
}: {
  speaker: MySpeaker;
  questions: MyQuestion[];
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");

  const mine = questions.filter((q) => q.speakerId === speaker.id);

  function moveTo(id: string, status: string) {
    const fd = new FormData();
    fd.set("question_id", id);
    fd.set("speaker_id", speaker.id);
    fd.set("status", status);
    startTransition(async () => {
      const res = await setQuestionStatus(fd);
      setNote(res.error ? `Error: ${res.error}` : null);
    });
  }

  if (mine.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircleQuestion className="h-6 w-6" aria-hidden />}
        title="Sin preguntas todavía"
        subtitle="Cuando el público envíe preguntas para tu charla, aparecerán aquí para moderar."
      />
    );
  }

  const countBy = (s: string) => mine.filter((q) => q.status === s).length;
  const shown = mine
    .filter((q) => q.status === filter)
    .sort((a, b) => (filter === "approved" ? b.votes - a.votes : 0));

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {QA_FILTERS.map((f) => (
          <FilterChip
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
          >
            {STATUS_LABEL[f]} ({countBy(f)})
          </FilterChip>
        ))}
      </div>

      {note && (
        <p className="text-[11px] font-semibold text-brand-white">{note}</p>
      )}

      {shown.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sin preguntas en “{STATUS_LABEL[filter]}”.
        </p>
      ) : (
        shown.map((q) => (
          <GlassCard key={q.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-[12px] leading-relaxed text-brand-white",
                  q.status === "discarded" && "line-through opacity-60",
                )}
              >
                {q.text}
              </p>
              {q.votes > 0 && <Badge>▲ {q.votes}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              {q.status !== "approved" && (
                <button
                  disabled={pending}
                  onClick={() => moveTo(q.id, "approved")}
                  className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300"
                >
                  Aprobar
                </button>
              )}
              {q.status === "approved" && (
                <button
                  disabled={pending}
                  onClick={() => moveTo(q.id, "answered")}
                  className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                >
                  Respondida
                </button>
              )}
              {q.status !== "discarded" && (
                <button
                  disabled={pending}
                  onClick={() => moveTo(q.id, "discarded")}
                  className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300"
                >
                  Descartar
                </button>
              )}
              {q.status !== "pending" && (
                <button
                  disabled={pending}
                  onClick={() => moveTo(q.id, "pending")}
                  className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                >
                  A pendiente
                </button>
              )}
            </div>
          </GlassCard>
        ))
      )}
    </div>
  );
}

function MetricasTab({ speaker }: { speaker: MySpeaker }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <GlassCard sheen className="p-4 text-center">
        <p className="text-[22px] font-black text-brand-white">
          {speaker.avgRating !== null ? speaker.avgRating.toFixed(1) : "—"}
        </p>
        <p className="text-[9.5px] font-semibold text-brand-muted">
          Promedio ({speaker.ratingsCount})
        </p>
      </GlassCard>
      <GlassCard sheen className="p-4 text-center">
        <p className="text-[22px] font-black text-brand-white">
          {speaker.followersCount}
        </p>
        <p className="text-[9.5px] font-semibold text-brand-muted">
          {speaker.followersCount === 1 ? "seguidor" : "seguidores"}
        </p>
      </GlassCard>
      <GlassCard sheen className="p-4 text-center">
        <p className="text-[22px] font-black text-brand-white">
          {speaker.ratingsCount}
        </p>
        <p className="text-[9.5px] font-semibold text-brand-muted">
          {speaker.ratingsCount === 1 ? "calificación" : "calificaciones"}
        </p>
      </GlassCard>
    </div>
  );
}

export default function MiCharlaClient({
  speakers,
  questions,
}: {
  speakers: MySpeaker[];
  questions: MyQuestion[];
}) {
  const [speakerId, setSpeakerId] = useState(speakers[0]?.id ?? "");
  const [tab, setTab] = useState<"perfil" | "qa" | "metricas">("perfil");
  const speaker = speakers.find((s) => s.id === speakerId) ?? speakers[0];

  if (!speaker) return null;

  const pendingCount = questions.filter(
    (q) => q.speakerId === speaker.id && q.status === "pending",
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {speakers.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {speakers.map((s) => (
            <FilterChip
              key={s.id}
              active={s.id === speaker.id}
              onClick={() => setSpeakerId(s.id)}
            >
              {s.talk_title ?? s.full_name}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <FilterChip active={tab === "perfil"} onClick={() => setTab("perfil")}>
          Perfil
        </FilterChip>
        <FilterChip active={tab === "qa"} onClick={() => setTab("qa")}>
          Q&A{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </FilterChip>
        <FilterChip
          active={tab === "metricas"}
          onClick={() => setTab("metricas")}
        >
          Métricas
        </FilterChip>
      </div>

      {tab === "perfil" && <PerfilTab speaker={speaker} />}
      {tab === "qa" && <QaTab speaker={speaker} questions={questions} />}
      {tab === "metricas" && <MetricasTab speaker={speaker} />}
    </div>
  );
}
