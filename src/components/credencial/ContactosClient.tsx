"use client";

import { AtSign, Briefcase, Download, MessageCircle } from "lucide-react";

import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import { createClient } from "@/lib/supabase/client";

export type ContactRow = {
  profileId: string;
  fullName: string | null;
  country: string | null;
  role: string | null;
  whatsapp: string | null;
  instagram: string | null;
  linkedin: string | null;
  note: string | null;
  createdAt: string;
};

const INPUT =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white placeholder:text-brand-muted outline-none " +
  "focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60";

function csvEscape(v: string | null): string {
  const s = v ?? "";
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Arma el CSV de contactos (separador coma, UTF-8 con BOM para Excel). */
export function buildContactsCsv(rows: ContactRow[]): string {
  const header =
    "nombre,rol,pais,whatsapp,instagram,linkedin,nota,conectado_el";
  const lines = rows.map((r) =>
    [
      csvEscape(r.fullName),
      csvEscape(r.role),
      csvEscape(r.country),
      csvEscape(r.whatsapp),
      csvEscape(r.instagram),
      csvEscape(r.linkedin),
      csvEscape(r.note),
      csvEscape(r.createdAt.slice(0, 10)),
    ].join(","),
  );
  return "﻿" + [header, ...lines].join("\n");
}

function waLink(v: string) {
  return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
}
function igLink(v: string) {
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}
function inLink(v: string) {
  return v.startsWith("http") ? v : `https://${v}`;
}

function ContactCard({ contact }: { contact: ContactRow }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(contact.note ?? "");
  const [saving, setSaving] = useState(false);

  async function saveNote() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("connections")
        .update({ note: note.trim() || null })
        .eq("owner_id", user.id)
        .eq("connected_profile_id", contact.profileId);
    }
    setSaving(false);
    setEditing(false);
  }

  return (
    <GlassCard className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-extrabold text-brand-white">
            {contact.fullName ?? "Asistente"}
          </p>
          <p className="truncate text-[10px] text-brand-muted">
            {[contact.role, contact.country].filter(Boolean).join(" · ") || "—"}
            {" · "}
            {contact.createdAt.slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {contact.whatsapp && (
          <a
            href={waLink(contact.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-3 py-1 text-[9.5px] font-bold text-brand-white"
          >
            <MessageCircle className="mr-1 inline h-3 w-3" aria-hidden />
            WhatsApp
          </a>
        )}
        {contact.instagram && (
          <a
            href={igLink(contact.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-3 py-1 text-[9.5px] font-bold text-brand-white"
          >
            <AtSign className="mr-1 inline h-3 w-3" aria-hidden />
            Instagram
          </a>
        )}
        {contact.linkedin && (
          <a
            href={inLink(contact.linkedin)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/30 px-3 py-1 text-[9.5px] font-bold text-brand-white"
          >
            <Briefcase className="mr-1 inline h-3 w-3" aria-hidden />
            LinkedIn
          </a>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={INPUT + " resize-none"}
            placeholder="Dónde lo conocí / de qué hablamos…"
          />
          <div className="flex gap-2">
            <button
              onClick={saveNote}
              disabled={saving}
              className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-left text-[10px] italic text-brand-muted"
        >
          {note ? `Nota: ${note}` : "Agregar nota…"}
        </button>
      )}
    </GlassCard>
  );
}

export default function ContactosClient({
  contacts,
}: {
  contacts: ContactRow[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const roles = useMemo(
    () => [...new Set(contacts.map((c) => c.role).filter(Boolean))] as string[],
    [contacts],
  );
  const countries = useMemo(
    () =>
      [...new Set(contacts.map((c) => c.country).filter(Boolean))] as string[],
    [contacts],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (roleFilter && c.role !== roleFilter) return false;
      if (countryFilter && c.country !== countryFilter) return false;
      if (!q) return true;
      return [c.fullName, c.role, c.country, c.note]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [contacts, search, roleFilter, countryFilter]);

  function exportCsv() {
    const blob = new Blob([buildContactsCsv(shown)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contactos-effix.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        image="/brand/hand-loading.png"
        title="Aún no tienes contactos"
        subtitle="Escanea la Credencial Effix de otra persona en la feria y quedará guardada aquí, con sus redes y tu nota."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={INPUT}
        placeholder="Buscar por nombre, rol, país o nota…"
      />

      {(roles.length > 1 || countries.length > 1) && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {roles.map((r) => (
            <FilterChip
              key={`r-${r}`}
              active={roleFilter === r}
              onClick={() => setRoleFilter(roleFilter === r ? null : r)}
            >
              {r}
            </FilterChip>
          ))}
          {countries.map((c) => (
            <FilterChip
              key={`c-${c}`}
              active={countryFilter === c}
              onClick={() => setCountryFilter(countryFilter === c ? null : c)}
            >
              {c}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold text-brand-muted">
          {shown.length} {shown.length === 1 ? "contacto" : "contactos"}
        </p>
        <button
          onClick={exportCsv}
          className="rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
        >
          <Download className="mr-1 inline h-3 w-3" aria-hidden />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <ContactCard key={c.profileId} contact={c} />
        ))}
      </div>
    </div>
  );
}
