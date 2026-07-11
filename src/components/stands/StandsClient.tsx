"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import { createClient } from "@/lib/supabase/client";

export type Stand = {
  id: string;
  name: string;
  category: string | null;
  stand_number: string | null;
  description: string | null;
  logo_url: string | null;
  edition: number;
};

export default function StandsClient({ stands }: { stands: Stand[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stands.forEach((s) => s.category && set.add(s.category));
    return Array.from(set).sort();
  }, [stands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stands.filter((s) => {
      if (category !== "__all__" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.stand_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [stands, query, category]);

  async function requestMeeting(standId: string) {
    setBusy(true);
    setNote(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setNote("Inicia sesión para agendar una cita.");
      return;
    }
    const { error } = await supabase.from("stand_meetings").insert({
      stand_id: standId,
      user_id: user.id,
      message: message.trim() || null,
    });
    setBusy(false);
    if (error) {
      setNote(`⚠️ ${error.message}`);
      return;
    }
    setRequested((r) => ({ ...r, [standId]: true }));
    setOpenId(null);
    setMessage("");
    setNote("✅ Solicitud enviada. El expositor la verá en su panel.");
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
          <FilterChip active={category === "__all__"} onClick={() => setCategory("__all__")}>
            Todas
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
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
          icon="🏬"
          title="Sin expositores"
          subtitle="No hay stands que coincidan con tu búsqueda."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <GlassCard key={s.id} className="flex flex-col p-1">
              <ListItem
                thumb={s.category?.[0]?.toUpperCase() ?? "🏬"}
                title={s.name}
                subtitle={
                  <>
                    {s.category ?? "Expositor"}
                    {s.stand_number ? ` · Stand ${s.stand_number}` : ""}
                  </>
                }
                right={
                  requested[s.id] ? (
                    <Badge>Solicitada</Badge>
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
              {openId === s.id && (
                <div className="flex flex-col gap-2 px-[14px] pb-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="Mensaje para el expositor (opcional)"
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
          ))}
        </div>
      )}
    </div>
  );
}
