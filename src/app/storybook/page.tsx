"use client";

import { useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";

const SWATCHES = [
  { name: "Negro", hex: "#000000", cls: "bg-brand-black border border-white/15" },
  { name: "Blanco", hex: "#FFFFFF", cls: "bg-brand-white" },
  { name: "Lavanda", hex: "#726E8D", cls: "bg-brand-lav" },
  { name: "Dim", hex: "#C9C7D6", cls: "bg-brand-dim" },
  { name: "Muted", hex: "#9A97AB", cls: "bg-brand-muted" },
];

const DAYS = ["Hoy · Día 1", "Día 2", "Día 3"];

export default function StorybookPage() {
  const [day, setDay] = useState(0);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Sistema de diseño"
        subtitle="Componentes de la App Feria Effix (Fase 1)"
        backHref="/"
      />

      {/* Paleta */}
      <SectionTitle>Paleta de marca</SectionTitle>
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1">
              <div className={`h-12 w-12 rounded-xl ${s.cls}`} />
              <span className="text-[10px] font-bold text-brand-white">
                {s.name}
              </span>
              <span className="text-[8.5px] font-medium text-brand-muted">
                {s.hex}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Tipografía */}
      <SectionTitle>Tipografía · Montserrat</SectionTitle>
      <GlassCard className="p-4">
        <p className="text-[22px] font-black text-brand-white">
          Montserrat Black
        </p>
        <p className="text-[11px] font-medium text-brand-muted">
          Titulares, mayúsculas, elementos destacados.
        </p>
        <hr className="my-3 border-white/10" />
        <p className="text-[14px] font-normal text-brand-dim">
          Montserrat Regular — cuerpo de texto, descripciones largas de ponentes,
          stands y políticas dentro de la app.
        </p>
      </GlassCard>

      {/* Glass card */}
      <SectionTitle>Glass card</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-[12px] font-extrabold text-brand-white">Simple</p>
          <p className="mt-1 text-[10px] text-brand-muted">Superficie vidrio</p>
        </GlassCard>
        <GlassCard sheen className="p-4">
          <p className="text-[12px] font-extrabold text-brand-white">Con sheen</p>
          <p className="mt-1 text-[10px] text-brand-muted">Brillo cromado</p>
        </GlassCard>
      </div>

      {/* Botones */}
      <SectionTitle>Botones</SectionTitle>
      <GlassCard className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="solid">Solid</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="solid" size="md">
            Solid md
          </Button>
        </div>
        <Button variant="solid" fullWidth>
          Ancho completo
        </Button>
        <Button variant="solid" disabled>
          Deshabilitado
        </Button>
      </GlassCard>

      {/* Badges / chips de estado */}
      <SectionTitle>Badges de estado</SectionTitle>
      <GlassCard className="flex flex-wrap items-center gap-2 p-4">
        <Badge>Acceso permanente</Badge>
        <Badge>🔓 Desbloqueado de por vida</Badge>
        <Badge>Modo offline activo</Badge>
        <Badge dot>En vivo ahora</Badge>
      </GlassCard>

      {/* Filter chips (interactivo) */}
      <SectionTitle>Filter chips (interactivo)</SectionTitle>
      <GlassCard className="p-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {DAYS.map((d, i) => (
            <FilterChip key={d} active={day === i} onClick={() => setDay(i)}>
              {d}
            </FilterChip>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-medium text-brand-muted">
          Seleccionado: <span className="text-brand-white">{DAYS[day]}</span>
        </p>
      </GlassCard>

      {/* Section title live */}
      <SectionTitle live>Section title · en vivo</SectionTitle>
      <GlassCard className="p-4">
        <p className="text-[11px] text-brand-muted">
          El rótulo de arriba lleva el punto pulsante de estado en vivo.
        </p>
      </GlassCard>

      <p className="mt-6 mb-2 text-center text-[10px] text-brand-muted">
        La barra inferior (BottomNav) es visible en todas las páginas.
      </p>
    </div>
  );
}
