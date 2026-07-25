"use client";

import { Globe } from "lucide-react";

import { useMemo, useState } from "react";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";

export type CommunityMember = {
  id: string;
  full_name: string | null;
  country: string | null;
  role: string | null;
  bio: string | null;
  whatsapp: string | null;
  instagram: string | null;
  linkedin: string | null;
};

/** Construye enlaces de conexión externos a partir de los campos del perfil. */
function whatsappUrl(v: string) {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
function instagramUrl(v: string) {
  const handle = v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  return handle ? `https://instagram.com/${handle}` : null;
}
function linkedinUrl(v: string) {
  const t = v.trim();
  if (!t) return null;
  if (/^https?:\/\//.test(t)) return t;
  return `https://linkedin.com/in/${t.replace(/^@/, "")}`;
}

export default function ComunidadClient({
  members,
}: {
  members: CommunityMember[];
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("__all__");
  const [country, setCountry] = useState("__all__");

  const roles = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => m.role && set.add(m.role));
    return Array.from(set).sort();
  }, [members]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => m.country && set.add(m.country));
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (role !== "__all__" && m.role !== role) return false;
      if (country !== "__all__" && m.country !== country) return false;
      if (!q) return true;
      return (
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q) ||
        (m.country ?? "").toLowerCase().includes(q) ||
        (m.bio ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, query, role, country]);

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, rol o país…"
        aria-label="Buscar en la comunidad"
        className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
      />

      {roles.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip active={role === "__all__"} onClick={() => setRole("__all__")}>
            Todos los roles
          </FilterChip>
          {roles.map((r) => (
            <FilterChip key={r} active={role === r} onClick={() => setRole(r)}>
              {r}
            </FilterChip>
          ))}
        </div>
      )}

      {countries.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip active={country === "__all__"} onClick={() => setCountry("__all__")}>
            Todos los países
          </FilterChip>
          {countries.map((c) => (
            <FilterChip key={c} active={country === c} onClick={() => setCountry(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-6 w-6" aria-hidden />}
          title="Sin resultados"
          subtitle="Ajusta la búsqueda o los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member: m }: { member: CommunityMember }) {
  const links = [
    m.whatsapp && whatsappUrl(m.whatsapp) && { label: "WhatsApp", href: whatsappUrl(m.whatsapp)! },
    m.instagram && instagramUrl(m.instagram) && { label: "Instagram", href: instagramUrl(m.instagram)! },
    m.linkedin && linkedinUrl(m.linkedin) && { label: "LinkedIn", href: linkedinUrl(m.linkedin)! },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <GlassCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-brand-lav to-[#23222b] text-[15px]">
          {(m.full_name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-extrabold text-brand-white">
            {m.full_name}
          </p>
          <p className="truncate text-[10.5px] text-brand-muted">
            {[m.role, m.country].filter(Boolean).join(" · ") || "Miembro de la comunidad"}
          </p>
        </div>
      </div>
      {m.bio && (
        <p className="text-[10.5px] leading-relaxed text-brand-dim">{m.bio}</p>
      )}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 px-3 py-1.5 text-[10px] font-bold text-brand-white"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
