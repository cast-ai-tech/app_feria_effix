"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField } from "@/components/Field";
import {
  createSpeaker,
  deleteSpeaker,
  linkSpeakerUser,
  unlinkSpeakerUser,
} from "./actions";

export type AdminSpeaker = {
  id: string;
  full_name: string;
  role: string | null;
  talk_title: string | null;
  talk_starts_at: string | null;
  edition: number;
  user_id: string | null;
  linked_email: string | null;
};

type Runner = (
  fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
  fd: FormData,
  reset?: () => void,
) => void;

function SpeakerRow({
  speaker,
  run,
  pending,
}: {
  speaker: AdminSpeaker;
  run: Runner;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");

  function link() {
    const fd = new FormData();
    fd.set("speaker_id", speaker.id);
    fd.set("email", email);
    run(linkSpeakerUser, fd, () => setEmail(""));
  }

  function unlink() {
    const fd = new FormData();
    fd.set("speaker_id", speaker.id);
    run(unlinkSpeakerUser, fd);
  }

  return (
    <GlassCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold text-brand-white">
            {speaker.full_name}
          </p>
          <p className="truncate text-[10px] text-brand-muted">
            {[speaker.role, speaker.talk_title].filter(Boolean).join(" · ") ||
              "—"}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge>Ed. {speaker.edition}</Badge>
          <form
            action={(fd) => run(deleteSpeaker, fd)}
            onSubmit={(e) => {
              if (
                !confirm(
                  "¿Eliminar este ponente? Esta acción no se puede deshacer.",
                )
              )
                e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={speaker.id} />
            <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <p className="text-[10.5px] text-brand-muted">
          Cuenta vinculada:{" "}
          <span className="font-bold text-brand-white">
            {speaker.linked_email || "Sin cuenta"}
          </span>
        </p>
        {speaker.user_id ? (
          <button
            onClick={unlink}
            disabled={pending}
            className="self-start rounded-full border border-red-400/40 px-3 py-1 text-[9px] font-bold text-red-300"
          >
            Desvincular
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@delponente.com"
              className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
            />
            <Button variant="ghost" onClick={link} disabled={pending || !email}>
              Vincular
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

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

  const run: Runner = (fn, fd, reset) => {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  };

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
          <Field
            label="Nombre completo"
            name="full_name"
            placeholder="Nombre del ponente"
            required
          />
          <Field label="Rol / cargo" name="role" placeholder="Ej. CEO de…" />
          <Field
            label="Título de la charla"
            name="talk_title"
            placeholder="Nombre de la ponencia"
          />
          <Field
            label="Fecha y hora de la charla"
            name="talk_starts_at"
            type="text"
            placeholder="AAAA-MM-DD HH:MM"
          />
          <Field label="Foto (URL)" name="photo_url" placeholder="https://…" />
          <TextAreaField
            label="Bio"
            name="bio"
            value={bio}
            onChange={setBio}
            placeholder="Reseña del ponente"
          />
          <Field label="Instagram" name="instagram" placeholder="@usuario" />
          <Field
            label="LinkedIn"
            name="linkedin"
            placeholder="linkedin.com/in/…"
          />
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
          <SpeakerRow key={s.id} speaker={s} run={run} pending={pending} />
        ))}
      </div>
    </div>
  );
}
