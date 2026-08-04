"use client";

import { MessageCircle, Play, ShoppingBag, Store } from "lucide-react";

import { useMemo, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import { SelectField } from "@/components/Field";
import { requestMeeting as requestMeetingAction } from "@/app/stands/actions";

export type Stand = {
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

/** Estado de la cita del usuario con cada stand (fix hallazgo #11). */
export type MyMeeting = {
  status: string; // 'pending' | 'accepted' | 'declined'
  intent: string | null;
  slotNote: string | null;
};

const INTENT_OPTIONS = [
  { value: "comprar", label: "Quiero comprar" },
  { value: "proveedor", label: "Busco proveedor" },
  { value: "alianza", label: "Busco alianza" },
  { value: "otro", label: "Otro" },
];

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

function MeetingBadge({ meeting }: { meeting: MyMeeting }) {
  if (meeting.status === "accepted") {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <Badge dot>Aceptada</Badge>
        {meeting.slotNote && (
          <span className="text-[9px] font-bold text-emerald-300">
            Franja: {meeting.slotNote}
          </span>
        )}
      </span>
    );
  }
  if (meeting.status === "declined") {
    return <Badge>Rechazada</Badge>;
  }
  return <Badge>Solicitada</Badge>;
}

export default function StandsClient({
  stands,
  myMeetings,
}: {
  stands: Stand[];
  myMeetings: Record<string, MyMeeting>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState("comprar");
  const [busy, setBusy] = useState(false);
  const [meetings, setMeetings] =
    useState<Record<string, MyMeeting>>(myMeetings);
  const [note, setNote] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stands.forEach((s) => s.category && set.add(s.category));
    return Array.from(set).sort();
  }, [stands]);

  // Diamante primero (posición destacada que se vende), luego el resto A-Z.
  const ordered = useMemo(
    () =>
      [...stands].sort((a, b) => {
        const d =
          (TIER_RANK[b.tier] === 3 ? 1 : 0) - (TIER_RANK[a.tier] === 3 ? 1 : 0);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      }),
    [stands],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((s) => {
      if (category !== "__all__" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.stand_number ?? "").toLowerCase().includes(q) ||
        (s.zone ?? "").toLowerCase().includes(q)
      );
    });
  }, [ordered, query, category]);

  async function requestMeeting(standId: string) {
    setBusy(true);
    setNote(null);
    const res = await requestMeetingAction(standId, message, intent);
    setBusy(false);
    if (!res.ok) {
      setNote(res.error ?? "No se pudo enviar la solicitud.");
      return;
    }
    setMeetings((r) => ({
      ...r,
      [standId]: { status: "pending", intent, slotNote: null },
    }));
    setOpenId(null);
    setMessage("");
    setNote("Solicitud enviada ✓ El expositor la verá en su panel.");
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar expositor…"
        aria-label="Buscar expositor"
        className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
      />

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip
            active={category === "__all__"}
            onClick={() => setCategory("__all__")}
          >
            Todas
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </FilterChip>
          ))}
        </div>
      )}

      {note && (
        <p className="text-[11px] font-semibold text-brand-dim">{note}</p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" aria-hidden />}
          title="Sin expositores"
          subtitle="No hay stands que coincidan con tu búsqueda."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2">
          {filtered.map((s) => {
            const meeting = meetings[s.id];
            const destacado = tierAtLeast(s.tier, "diamante");
            return (
              <GlassCard
                key={s.id}
                sheen={destacado}
                className={`flex flex-col p-1 ${
                  destacado ? "border-white/40" : ""
                }`}
              >
                <ListItem
                  thumb={
                    s.category?.[0]?.toUpperCase() ?? (
                      <Store
                        className="h-[18px] w-[18px] text-brand-white"
                        aria-hidden
                      />
                    )
                  }
                  title={
                    destacado ? (
                      <span>
                        {s.name}{" "}
                        <span className="text-[9px] font-bold text-brand-lav">
                          DESTACADO
                        </span>
                      </span>
                    ) : (
                      s.name
                    )
                  }
                  subtitle={
                    <>
                      {s.category ?? "Expositor"}
                      {s.stand_number ? ` · Stand ${s.stand_number}` : ""}
                      {s.zone ? ` · ${s.zone}` : ""}
                    </>
                  }
                  right={
                    meeting ? (
                      <MeetingBadge meeting={meeting} />
                    ) : (
                      <button
                        onClick={() => setOpenId(openId === s.id ? null : s.id)}
                        className="rounded-full bg-brand-white px-3 py-1.5 text-[10px] font-extrabold text-black"
                      >
                        Agendar
                      </button>
                    )
                  }
                />
                {s.description && (
                  <p className="px-[14px] pb-2 text-[10.5px] leading-relaxed text-brand-muted">
                    {s.description}
                  </p>
                )}

                {/* Galería (nivel Plata+) */}
                {tierAtLeast(s.tier, "plata") && s.gallery_urls.length > 0 && (
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-[14px] pb-2">
                    {s.gallery_urls.slice(0, 8).map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt={`Foto de ${s.name}`}
                        className="h-16 w-16 flex-shrink-0 rounded-[10px] object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                {/* Acciones por nivel */}
                {(tierAtLeast(s.tier, "plata") && s.video_url) ||
                (tierAtLeast(s.tier, "oro") &&
                  (s.catalog_url || s.whatsapp_url)) ? (
                  <div className="flex flex-wrap gap-2 px-[14px] pb-2">
                    {tierAtLeast(s.tier, "plata") && s.video_url && (
                      <a
                        href={s.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/30 px-3 py-1 text-[9.5px] font-bold text-brand-white"
                      >
                        <Play className="mr-1 inline h-3 w-3" aria-hidden />
                        Video
                      </a>
                    )}
                    {tierAtLeast(s.tier, "oro") && s.catalog_url && (
                      <a
                        href={s.catalog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/30 px-3 py-1 text-[9.5px] font-bold text-brand-white"
                      >
                        <ShoppingBag
                          className="mr-1 inline h-3 w-3"
                          aria-hidden
                        />
                        Catálogo
                      </a>
                    )}
                    {tierAtLeast(s.tier, "oro") && s.whatsapp_url && (
                      <a
                        href={s.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300"
                      >
                        <MessageCircle
                          className="mr-1 inline h-3 w-3"
                          aria-hidden
                        />
                        WhatsApp
                      </a>
                    )}
                  </div>
                ) : null}

                {openId === s.id && !meeting && (
                  <div className="flex flex-col gap-2 px-[14px] pb-3">
                    <SelectField
                      label="¿Qué buscas con esta reunión?"
                      name={`intent-${s.id}`}
                      value={intent}
                      onChange={setIntent}
                      options={INTENT_OPTIONS}
                    />
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      placeholder="Mensaje corto para el expositor (opcional)"
                      aria-label="Mensaje para el expositor"
                      className="w-full resize-none rounded-[12px] border border-white/15 bg-white/5 px-3 py-2 text-[12px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => requestMeeting(s.id)}
                      disabled={busy}
                    >
                      {busy ? "Enviando…" : "Enviar solicitud de cita"}
                    </Button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
