"use client";

import { CalendarDays, Download, Lock } from "lucide-react";

import { useMemo, useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField } from "@/components/Field";
import { updateMyStand, setMyMeetingStatus } from "@/app/mi-stand/actions";

export type MyStand = {
  id: string;
  name: string;
  category: string | null;
  stand_number: string | null;
  description: string | null;
  logo_url: string | null;
  tier: string;
  gallery_urls: string[];
  video_url: string | null;
  catalog_url: string | null;
  whatsapp_url: string | null;
  zone: string | null;
  edition: number;
};

export type StandLead = {
  standId: string;
  profileId: string;
  fullName: string | null;
  role: string | null;
  country: string | null;
  whatsapp: string | null;
  instagram: string | null;
  linkedin: string | null;
  createdAt: string;
};

export type StandMeetingRow = {
  id: string;
  standId: string;
  requesterName: string;
  requesterRole: string | null;
  requesterCountry: string | null;
  message: string | null;
  intent: string | null;
  status: string;
  slotNote: string | null;
  createdAt: string;
};

const TIER_LABEL: Record<string, string> = {
  basico: "Básico",
  plata: "Plata",
  oro: "Oro",
  diamante: "Diamante",
  black: "Black",
};

const INTENT_LABEL: Record<string, string> = {
  comprar: "Quiere comprar",
  proveedor: "Busca proveedor",
  alianza: "Busca alianza",
  otro: "Otro",
};

/**
 * Qué desbloquea cada nivel (es el producto que Effix vende con el stand):
 *   básico   → editar descripción y logo; leads: SOLO conteo
 *   plata    → + galería y video;         leads: lista visible
 *   oro      → + catálogo y WhatsApp;     leads: lista + export CSV
 *   diamante → todo lo de oro + posición destacada en el directorio
 *   black    → nivel tope (F29): todo lo de diamante
 */
const TIER_RANK: Record<string, number> = {
  basico: 0,
  plata: 1,
  oro: 2,
  diamante: 3,
  black: 4,
};

function tierAtLeast(tier: string, min: keyof typeof TIER_RANK): boolean {
  return (TIER_RANK[tier] ?? 0) >= TIER_RANK[min];
}

const INPUT =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white placeholder:text-brand-muted outline-none " +
  "focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60";

function csvEscape(v: string | null): string {
  const s = v ?? "";
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildLeadsCsv(rows: StandLead[]): string {
  const header = "nombre,rol,pais,whatsapp,instagram,linkedin,fecha";
  const lines = rows.map((r) =>
    [
      csvEscape(r.fullName),
      csvEscape(r.role),
      csvEscape(r.country),
      csvEscape(r.whatsapp),
      csvEscape(r.instagram),
      csvEscape(r.linkedin),
      csvEscape(r.createdAt.slice(0, 10)),
    ].join(","),
  );
  return "﻿" + [header, ...lines].join("\n");
}

function LockedField({ label, needed }: { label: string; needed: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-white/15 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-brand-dim">
        <Lock className="h-3.5 w-3.5" aria-hidden /> {label}
      </p>
      <p className="text-[9.5px] text-brand-muted">
        Disponible desde el nivel {needed}. Contacta al equipo comercial de la
        feria para subir tu patrocinio.
      </p>
    </div>
  );
}

function PerfilTab({ stand }: { stand: MyStand }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [description, setDescription] = useState(stand.description ?? "");
  const [gallery, setGallery] = useState((stand.gallery_urls ?? []).join("\n"));

  const plata = tierAtLeast(stand.tier, "plata");
  const oro = tierAtLeast(stand.tier, "oro");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateMyStand(fd);
      setNote(res.error ? `Error: ${res.error}` : "Perfil actualizado ✓");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="hidden" name="stand_id" value={stand.id} />

      <GlassCard className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-brand-white">
            {stand.name}
          </p>
          <Badge>{TIER_LABEL[stand.tier] ?? stand.tier}</Badge>
        </div>
        <p className="text-[10px] text-brand-muted">
          {[
            stand.category,
            stand.stand_number && `Stand ${stand.stand_number}`,
            stand.zone,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}{" "}
          · Ed. {stand.edition}
        </p>
        <p className="mt-1 text-[9.5px] text-brand-muted">
          Nombre, categoría y número de stand los gestiona el equipo Effix.
        </p>
      </GlassCard>

      <TextAreaField
        label="Descripción"
        name="description"
        value={description}
        onChange={setDescription}
        placeholder="Qué ofrece tu marca a los asistentes"
      />
      <Field
        label="Logo (URL)"
        name="logo_url"
        defaultValue={stand.logo_url ?? ""}
        placeholder="https://…"
      />

      {plata ? (
        <>
          <TextAreaField
            label="Galería (una URL de imagen por línea, máx. 8)"
            name="gallery_urls"
            value={gallery}
            onChange={setGallery}
            placeholder={"https://…/foto1.jpg\nhttps://…/foto2.jpg"}
          />
          <Field
            label="Video (URL de YouTube/Vimeo)"
            name="video_url"
            defaultValue={stand.video_url ?? ""}
            placeholder="https://…"
          />
        </>
      ) : (
        <>
          <LockedField label="Galería de fotos" needed="Plata" />
          <LockedField label="Video promocional" needed="Plata" />
        </>
      )}

      {oro ? (
        <>
          <Field
            label="Catálogo de productos (URL)"
            name="catalog_url"
            defaultValue={stand.catalog_url ?? ""}
            placeholder="https://…"
          />
          <Field
            label="WhatsApp directo (link wa.me)"
            name="whatsapp_url"
            defaultValue={stand.whatsapp_url ?? ""}
            placeholder="https://wa.me/57…"
          />
        </>
      ) : (
        <>
          <LockedField label="Catálogo de productos" needed="Oro" />
          <LockedField label="Botón de WhatsApp directo" needed="Oro" />
        </>
      )}

      {note && (
        <p className="text-[11px] font-semibold text-brand-white">{note}</p>
      )}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}

function ReunionesTab({
  stand,
  meetings,
}: {
  stand: MyStand;
  meetings: StandMeetingRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [slotById, setSlotById] = useState<Record<string, string>>({});

  const mine = meetings.filter((m) => m.standId === stand.id);
  const pendientes = mine.filter((m) => m.status === "pending");
  const resueltas = mine.filter((m) => m.status !== "pending");

  function act(meetingId: string, status: "accepted" | "declined") {
    const fd = new FormData();
    fd.set("stand_id", stand.id);
    fd.set("meeting_id", meetingId);
    fd.set("status", status);
    fd.set("slot_note", slotById[meetingId] ?? "");
    startTransition(async () => {
      const res = await setMyMeetingStatus(fd);
      setNote(res.error ? `Error: ${res.error}` : "Listo ✓");
    });
  }

  if (mine.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-6 w-6" aria-hidden />}
        title="Sin solicitudes de reunión"
        subtitle="Cuando un asistente pida reunión con tu marca, aparecerá aquí con su intención declarada."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {note && (
        <p className="text-[11px] font-semibold text-brand-white">{note}</p>
      )}
      <SectionTitle className="mt-0">
        Pendientes ({pendientes.length})
      </SectionTitle>
      {pendientes.length === 0 && (
        <p className="text-[11px] text-brand-muted">Nada pendiente.</p>
      )}
      {pendientes.map((m) => (
        <GlassCard key={m.id} className="flex flex-col gap-2 p-4">
          <div>
            <p className="text-[12px] font-extrabold text-brand-white">
              {m.requesterName}
            </p>
            <p className="text-[10px] text-brand-muted">
              {[m.requesterRole, m.requesterCountry]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          {m.intent && <Badge>{INTENT_LABEL[m.intent] ?? m.intent}</Badge>}
          {m.message && (
            <p className="text-[10.5px] italic text-brand-muted">
              “{m.message}”
            </p>
          )}
          <input
            value={slotById[m.id] ?? ""}
            onChange={(e) =>
              setSlotById((s) => ({ ...s, [m.id]: e.target.value }))
            }
            className={INPUT}
            placeholder="Franja propuesta (ej. Jueves 3–4 pm)"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act(m.id, "accepted")}
              disabled={pending}
              className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-[10px] font-bold text-emerald-300"
            >
              Aceptar
            </button>
            <button
              onClick={() => act(m.id, "declined")}
              disabled={pending}
              className="rounded-full border border-red-400/40 px-3 py-1.5 text-[10px] font-bold text-red-300"
            >
              Rechazar
            </button>
          </div>
        </GlassCard>
      ))}

      {resueltas.length > 0 && (
        <>
          <SectionTitle>Historial ({resueltas.length})</SectionTitle>
          {resueltas.map((m) => (
            <GlassCard key={m.id} className="flex flex-col gap-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-extrabold text-brand-white">
                  {m.requesterName}
                </p>
                <Badge>
                  {m.status === "accepted" ? "Aceptada" : "Rechazada"}
                </Badge>
              </div>
              {m.intent && (
                <p className="text-[10px] text-brand-muted">
                  {INTENT_LABEL[m.intent] ?? m.intent}
                </p>
              )}
              {m.slotNote && (
                <p className="text-[10px] text-brand-dim">
                  Franja: {m.slotNote}
                </p>
              )}
            </GlassCard>
          ))}
        </>
      )}
    </div>
  );
}

function LeadsTab({ stand, leads }: { stand: MyStand; leads: StandLead[] }) {
  const [search, setSearch] = useState("");
  const mine = leads.filter((l) => l.standId === stand.id);

  const canSeeList = tierAtLeast(stand.tier, "plata");
  const canExport = tierAtLeast(stand.tier, "oro");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mine;
    return mine.filter((l) =>
      [l.fullName, l.role, l.country]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [mine, search]);

  function exportCsv() {
    const blob = new Blob([buildLeadsCsv(shown)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${stand.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <GlassCard sheen className="p-5 text-center">
        <p className="text-[26px] font-black text-brand-white">{mine.length}</p>
        <p className="text-[10.5px] font-semibold text-brand-muted">
          {mine.length === 1 ? "visitante escaneado" : "visitantes escaneados"}{" "}
          en tu stand
        </p>
      </GlassCard>

      {!canSeeList ? (
        <GlassCard className="p-4 text-center">
          <p className="text-[11px] font-bold text-brand-dim">
            <Lock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            La lista de leads con contacto está disponible desde el nivel Plata
            (y el export CSV desde Oro).
          </p>
          <p className="mt-1 text-[10px] text-brand-muted">
            Contacta al equipo comercial de la feria para subir tu patrocinio.
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={INPUT}
              placeholder="Buscar lead…"
            />
            {canExport ? (
              <button
                onClick={exportCsv}
                className="flex-shrink-0 rounded-full border border-white/35 px-3 py-2 text-[10px] font-extrabold text-brand-white"
              >
                <Download className="mr-1 inline h-3 w-3" aria-hidden />
                CSV
              </button>
            ) : (
              <span
                title="Export disponible desde nivel Oro"
                className="flex-shrink-0 rounded-full border border-white/15 px-3 py-2 text-[10px] font-bold text-brand-dim"
              >
                <Lock className="mr-1 inline h-3 w-3" aria-hidden />
                CSV
              </span>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="text-center text-[11px] text-brand-muted">
              Aún no hay leads. Activa el “Modo stand” en la Credencial y
              escanea a tus visitantes.
            </p>
          ) : (
            shown.map((l) => (
              <GlassCard key={l.profileId} className="flex flex-col gap-1 p-4">
                <p className="text-[12px] font-extrabold text-brand-white">
                  {l.fullName ?? "Asistente"}
                </p>
                <p className="text-[10px] text-brand-muted">
                  {[l.role, l.country].filter(Boolean).join(" · ") || "—"} ·{" "}
                  {l.createdAt.slice(0, 10)}
                </p>
                <p className="text-[10px] text-brand-dim">
                  {[
                    l.whatsapp && `WhatsApp ${l.whatsapp}`,
                    l.instagram && `Instagram ${l.instagram}`,
                    l.linkedin && `LinkedIn ${l.linkedin}`,
                  ]
                    .filter(Boolean)
                    .join("  ") || "Sin contacto compartido"}
                </p>
              </GlassCard>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default function MiStandClient({
  stands,
  leads,
  meetings,
}: {
  stands: MyStand[];
  leads: StandLead[];
  meetings: StandMeetingRow[];
}) {
  const [standId, setStandId] = useState(stands[0]?.id ?? "");
  const [tab, setTab] = useState<"perfil" | "reuniones" | "leads">("perfil");
  const stand = stands.find((s) => s.id === standId) ?? stands[0];

  if (!stand) return null;

  const pendingCount = meetings.filter(
    (m) => m.standId === stand.id && m.status === "pending",
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {stands.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {stands.map((s) => (
            <FilterChip
              key={s.id}
              active={s.id === stand.id}
              onClick={() => setStandId(s.id)}
            >
              {s.name}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <FilterChip active={tab === "perfil"} onClick={() => setTab("perfil")}>
          Perfil
        </FilterChip>
        <FilterChip
          active={tab === "reuniones"}
          onClick={() => setTab("reuniones")}
        >
          Reuniones{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </FilterChip>
        <FilterChip active={tab === "leads"} onClick={() => setTab("leads")}>
          Leads
        </FilterChip>
      </div>

      {tab === "perfil" && <PerfilTab stand={stand} />}
      {tab === "reuniones" && (
        <ReunionesTab stand={stand} meetings={meetings} />
      )}
      {tab === "leads" && <LeadsTab stand={stand} leads={leads} />}
    </div>
  );
}
