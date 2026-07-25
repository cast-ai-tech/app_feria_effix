"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import { sendNotification } from "./actions";

export type SentNotification = {
  id: string;
  title: string;
  body: string | null;
  audience_type: string;
  audience_value: string | null;
  category: string;
  sent_at: string;
  sent_count: number | null;
};

export default function AdminNotificacionesClient({
  history,
  tiers,
  roles,
  marketingSentToday,
  marketingLimit,
}: {
  history: SentNotification[];
  tiers: Array<{ value: string; label: string }>;
  roles: Array<{ value: string; label: string }>;
  marketingSentToday: number;
  marketingLimit: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [audienceType, setAudienceType] = useState("all");
  const [audienceValue, setAudienceValue] = useState("");
  const [category, setCategory] = useState("operativa");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(false);

  const audienceOptions =
    audienceType === "tier" ? tiers : audienceType === "rol" ? roles : [];

  function send() {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("url", url);
    fd.set("audience_type", audienceType);
    fd.set("audience_value", audienceValue);
    fd.set("category", category);
    startTransition(async () => {
      const res = await sendNotification(fd);
      if (res.error) setNote(`Error: ${res.error}`);
      else {
        setNote(`Enviada ✓ — ${res.sent ?? 0} push salieron a dispositivos`);
        setTitle("");
        setBody("");
        setUrl("");
        setPreview(false);
      }
    });
  }

  const audienceLabel =
    audienceType === "all"
      ? "Todos los usuarios"
      : `${audienceType === "tier" ? "Boleta" : "Rol"}: ${
          audienceOptions.find((o) => o.value === audienceValue)?.label ??
          audienceValue ??
          "—"
        }`;

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="p-3">
        <p className="text-[11px] font-semibold text-brand-white">
          Anti-spam: {marketingSentToday}/{marketingLimit} pushes de marketing
          hoy. Las operativas no cuentan.
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva notificación</SectionTitle>

        <Field
          label="Título"
          name="title"
          value={title}
          onChange={setTitle}
          placeholder="Ej. Cambio de sala: keynote de apertura"
          required
        />
        <TextAreaField
          label="Mensaje"
          name="body"
          value={body}
          onChange={setBody}
          placeholder="Texto corto y útil…"
        />
        <Field
          label="Link al tocar (ruta interna)"
          name="url"
          value={url}
          onChange={setUrl}
          placeholder="/agenda"
        />
        <SelectField
          label="Audiencia"
          name="audience_type"
          value={audienceType}
          onChange={(v) => {
            setAudienceType(v);
            setAudienceValue("");
          }}
          options={[
            { value: "all", label: "Todos" },
            { value: "tier", label: "Por tipo de boleta" },
            { value: "rol", label: "Por rol de perfil" },
          ]}
        />
        {audienceType !== "all" && (
          <SelectField
            label={audienceType === "tier" ? "Tipo de boleta" : "Rol"}
            name="audience_value"
            value={audienceValue}
            onChange={setAudienceValue}
            options={audienceOptions}
            placeholder="Selecciona…"
          />
        )}
        <SelectField
          label="Categoría"
          name="category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "operativa", label: "Operativa (no cuenta para el límite)" },
            { value: "marketing", label: "Marketing (máx. diario)" },
          ]}
        />

        {!preview ? (
          <Button
            fullWidth
            variant="ghost"
            onClick={() => title.trim() && setPreview(true)}
            disabled={!title.trim()}
          >
            Vista previa →
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Vista previa */}
            <div className="rounded-[14px] border border-white/20 bg-black p-3">
              <p className="flex items-center gap-1 text-[10px] font-bold text-brand-muted">
                <Bell className="h-3 w-3" aria-hidden /> Feria Effix · ahora
              </p>
              <p className="mt-1 text-[12px] font-extrabold text-brand-white">
                {title}
              </p>
              {body && (
                <p className="text-[10.5px] text-brand-muted">{body}</p>
              )}
              <p className="mt-1 text-[9.5px] text-brand-lav">
                → {audienceLabel} · {category}
              </p>
            </div>
            <div className="flex gap-2">
              <Button fullWidth onClick={send} disabled={pending}>
                {pending ? "Enviando…" : "Confirmar y enviar"}
              </Button>
              <Button variant="ghost" onClick={() => setPreview(false)}>
                Editar
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Enviadas ({history.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {history.map((n) => (
          <GlassCard key={n.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-extrabold text-brand-white">
                {n.title}
              </p>
              <Badge>{n.category}</Badge>
            </div>
            {n.body && (
              <p className="text-[10.5px] text-brand-muted">{n.body}</p>
            )}
            <p className="text-[9.5px] text-brand-muted">
              {n.audience_type === "all"
                ? "Todos"
                : `${n.audience_type}: ${n.audience_value}`}
              {" · "}
              {n.sent_at.slice(0, 16).replace("T", " ")}
              {n.sent_count !== null && ` · ${n.sent_count} push`}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
