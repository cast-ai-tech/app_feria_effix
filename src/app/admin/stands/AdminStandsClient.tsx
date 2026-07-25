"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import {
  createStand,
  deleteStand,
  setMeetingStatus,
  setStandTier,
  addStandStaff,
  removeStandStaff,
} from "./actions";

export type AdminStand = {
  id: string;
  name: string;
  category: string | null;
  stand_number: string | null;
  description: string | null;
  zone: string | null;
  tier: string;
  edition: number;
};

export type AdminMeeting = {
  id: string;
  message: string | null;
  intent: string | null;
  status: string;
  stand_id: string;
  stand_name: string;
};

export type StaffRow = {
  id: string;
  stand_id: string;
  label: string;
};

export type StandMetrics = {
  stand_id: string;
  name: string;
  tier: string;
  leads: number;
  meetings: number;
};

const TIER_OPTIONS = [
  { value: "basico", label: "Básico" },
  { value: "plata", label: "Plata" },
  { value: "oro", label: "Oro" },
  { value: "diamante", label: "Diamante" },
];

const INTENT_LABEL: Record<string, string> = {
  comprar: "Comprar",
  proveedor: "Proveedor",
  alianza: "Alianza",
  otro: "Otro",
};

function StandRow({
  stand,
  staff,
  run,
  pending,
}: {
  stand: AdminStand;
  staff: StaffRow[];
  run: (
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) => void;
  pending: boolean;
}) {
  const [tier, setTier] = useState(stand.tier);
  const [staffEmail, setStaffEmail] = useState("");
  const [open, setOpen] = useState(false);

  function saveTier() {
    const fd = new FormData();
    fd.set("id", stand.id);
    fd.set("tier", tier);
    run(setStandTier, fd);
  }

  function addStaff() {
    const fd = new FormData();
    fd.set("stand_id", stand.id);
    fd.set("email", staffEmail);
    run(addStandStaff, fd, () => setStaffEmail(""));
  }

  return (
    <GlassCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold text-brand-white">
            {stand.name}
          </p>
          <p className="truncate text-[10px] text-brand-muted">
            {[stand.category, stand.stand_number, stand.zone]
              .filter(Boolean)
              .join(" · ") || "—"}{" "}
            · Ed. {stand.edition}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge>{TIER_OPTIONS.find((t) => t.value === stand.tier)?.label ?? stand.tier}</Badge>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
          >
            {open ? "Cerrar" : "Gestionar"}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
          {/* Nivel de patrocinio */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label="Nivel de patrocinio"
                name={`tier-${stand.id}`}
                value={tier}
                onChange={setTier}
                options={TIER_OPTIONS}
              />
            </div>
            <Button variant="ghost" onClick={saveTier} disabled={pending}>
              Guardar
            </Button>
          </div>

          {/* Staff del stand */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-brand-dim">
              Staff autorizado ({staff.length}) — escanean visitantes y usan /mi-stand
            </p>
            {staff.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2"
              >
                <p className="truncate text-[10.5px] text-brand-white">
                  {m.label}
                </p>
                <form action={(fd) => run(removeStandStaff, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9px] font-bold text-red-300">
                    Quitar
                  </button>
                </form>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="correo@delstaff.com"
                className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
              />
              <Button variant="ghost" onClick={addStaff} disabled={pending || !staffEmail}>
                Agregar
              </Button>
            </div>
          </div>

          <form
                action={(fd) => run(deleteStand, fd)}
                onSubmit={(e) => {
                  if (!confirm("¿Eliminar este stand? Se borran también sus sellos, leads y citas. Esta acción no se puede deshacer.")) e.preventDefault();
                }}
              >
            <input type="hidden" name="id" value={stand.id} />
            <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
              Eliminar stand
            </button>
          </form>
        </div>
      )}
    </GlassCard>
  );
}

export default function AdminStandsClient({
  stands,
  meetings,
  staff,
  metrics,
  currentEdition,
}: {
  stands: AdminStand[];
  meetings: AdminMeeting[];
  staff: StaffRow[];
  metrics: StandMetrics[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState("basico");

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  }

  const pendingMeetings = meetings.filter((m) => m.status === "pending");
  const withActivity = metrics.filter((m) => m.leads > 0 || m.meetings > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Métricas comerciales — ranking de tráfico */}
      <SectionTitle className="mt-0">
        Ranking de tráfico ({withActivity.length} con actividad)
      </SectionTitle>
      {withActivity.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Aún no hay leads ni reuniones. Los números aparecen cuando el staff
          escanea visitantes (Pasaporte) o llegan solicitudes de cita.
        </p>
      ) : (
        <GlassCard className="flex flex-col divide-y divide-white/[0.06] p-2">
          {withActivity.slice(0, 15).map((m, i) => (
            <div
              key={m.stand_id}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <p className="min-w-0 truncate text-[11.5px] font-bold text-brand-white">
                {i + 1}. {m.name}
              </p>
              <p className="flex-shrink-0 text-[10px] font-semibold text-brand-muted">
                {m.leads} leads · {m.meetings} citas
              </p>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Crear stand */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nuevo stand</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createStand, new FormData(form), () => {
              form.reset();
              setDescription("");
              setTier("basico");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Nombre" name="name" placeholder="Nombre del expositor" required />
          <Field label="Categoría" name="category" placeholder="Ej. E-commerce" />
          <Field label="Número de stand" name="stand_number" placeholder="Ej. B12" />
          <Field label="Zona del mapa" name="zone" placeholder="Ej. Pabellón Azul" />
          <SelectField
            label="Nivel de patrocinio"
            name="tier"
            value={tier}
            onChange={setTier}
            options={TIER_OPTIONS}
          />
          <TextAreaField label="Descripción" name="description" value={description} onChange={setDescription} placeholder="Qué ofrece" />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear stand"}
          </Button>
        </form>
        <p className="text-[10px] text-brand-muted">
          Los stands se crean para la edición {currentEdition}. Galería, video,
          catálogo y WhatsApp los edita el propio expositor en /mi-stand según
          su nivel.
        </p>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Citas pendientes (respaldo del admin; el expositor gestiona en /mi-stand) */}
      <SectionTitle>Solicitudes de cita ({pendingMeetings.length} pendientes)</SectionTitle>
      {pendingMeetings.length === 0 ? (
        <p className="text-[11px] text-brand-muted">Sin solicitudes pendientes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pendingMeetings.map((m) => (
            <GlassCard key={m.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-extrabold text-brand-white">{m.stand_name}</p>
                {m.intent && <Badge>{INTENT_LABEL[m.intent] ?? m.intent}</Badge>}
              </div>
              {m.message && (
                <p className="text-[10.5px] text-brand-muted">“{m.message}”</p>
              )}
              <div className="flex gap-2">
                <form action={(fd) => run(setMeetingStatus, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value="accepted" />
                  <button className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9.5px] font-bold text-emerald-300">
                    Aceptar
                  </button>
                </form>
                <form action={(fd) => run(setMeetingStatus, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                    Rechazar
                  </button>
                </form>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Listado con gestión de nivel y staff */}
      <SectionTitle>Stands ({stands.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {stands.map((s) => (
          <StandRow
            key={s.id}
            stand={s}
            staff={staff.filter((m) => m.stand_id === s.id)}
            run={run}
            pending={pending}
          />
        ))}
      </div>
    </div>
  );
}
