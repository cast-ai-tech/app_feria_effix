"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field } from "@/components/Field";
import {
  importTiquetera,
  assignBlack,
  refundTicket,
  transferTicket,
  markUsed,
} from "./actions";

export type AdminTicket = {
  id: string;
  holder_name: string | null;
  ticket_email: string;
  ticket_type: string;
  order_number: string | null;
  edition: number;
  status: string;
  user_id: string | null;
  source: string;
  refund_full: boolean | null;
};

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-300",
  used: "text-brand-dim",
  cancelled: "text-red-300",
};

export default function AdminTicketsClient({
  tickets,
  currentEdition,
}: {
  tickets: AdminTicket[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState<string | null>(null);

  function run(fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string; summary?: unknown; matched?: boolean }>, fd: FormData) {
    startTransition(async () => {
      const res = await fn(fd);
      if (res?.error) setNote(`Error: ${res.error}`);
      else if (res?.summary) {
        const s = res.summary as { total: number; inserted: number; matched: number; skipped: number };
        setNote(
          `CSV procesado ✓ ${s.total} filas · ${s.inserted} importadas · ${s.matched} vinculadas a una cuenta · ${s.skipped} omitidas`,
        );
      } else setNote("Listo ✓");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Importar CSV */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Importar CSV de La Tiquetera</SectionTitle>
        <p className="text-[10.5px] leading-relaxed text-brand-muted">
          Columnas esperadas: nombre, correo, tipo de boleta, número de orden,
          fecha de compra. Cada fila se cruza por correo con las cuentas
          registradas. Las que no coincidan quedan sin vincular hasta que el
          usuario se registre con ese correo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(importTiquetera, new FormData(e.currentTarget));
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="text-[11px] text-brand-dim file:mr-3 file:rounded-full file:border-0 file:bg-brand-white file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-black"
          />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Procesando…" : "Importar boletas"}
          </Button>
        </form>
      </GlassCard>

      {/* Asignar Black */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Asignar boleta Black</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(assignBlack, new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Correo del titular" name="email" type="email" placeholder="correo@ejemplo.com" />
          <Field label="Nombre" name="holder" placeholder="Nombre completo" />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            Asignar Black
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Listado */}
      <SectionTitle>Boletas ({tickets.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {tickets.map((t) => (
          <GlassCard key={t.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {t.holder_name || t.ticket_email}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {t.ticket_email} · orden {t.order_number ?? "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="uppercase">{t.ticket_type}</Badge>
                <span className={`text-[9.5px] font-bold ${STATUS_STYLE[t.status] ?? ""}`}>
                  {t.status}
                  {t.status === "cancelled" && t.refund_full != null
                    ? t.refund_full
                      ? " · reembolso total"
                      : " · reembolso parcial"
                    : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-brand-dim">
                Ed. {t.edition}
              </span>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-brand-dim">
                {t.user_id ? "cuenta vinculada" : "sin cuenta"}
              </span>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-brand-dim">
                {t.source}
              </span>
            </div>

            {t.status === "active" && (
              <div className="flex flex-wrap gap-2 pt-1">
                <form
                  action={(fd) => run(markUsed, fd)}
                >
                  <input type="hidden" name="id" value={t.id} />
                  <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                    Marcar usada
                  </button>
                </form>
                <form
                  action={(fd) => run(refundTicket, fd)}
                  onSubmit={(e) => {
                    if (
                      !confirm(
                        "La política oficial es NO reembolsable pero transferible. ¿Registrar reembolso como EXCEPCIÓN administrativa aprobada por el equipo Effix?",
                      )
                    )
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={t.id} />
                  <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                    Reembolso (excepción)
                  </button>
                </form>
                <button
                  onClick={() =>
                    setTransferOpen(transferOpen === t.id ? null : t.id)
                  }
                  className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
                >
                  Transferir
                </button>
              </div>
            )}

            {transferOpen === t.id && (
              <form
                action={(fd) => {
                  run(transferTicket, fd);
                  setTransferOpen(null);
                }}
                className="flex flex-col gap-2 pt-1"
              >
                <input type="hidden" name="id" value={t.id} />
                <Field label="Correo del nuevo titular" name="to_email" type="email" placeholder="nuevo@correo.com" />
                <Field label="Nota (opcional)" name="note" placeholder="Motivo de la transferencia" />
                <Button type="submit" size="sm" variant="ghost">
                  Confirmar transferencia
                </Button>
              </form>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
