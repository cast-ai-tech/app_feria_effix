"use client";

import { useTransition, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, TextAreaField } from "@/components/Field";
import { createOffer, toggleOffer, deleteOffer } from "./actions";

export type AdminOffer = {
  id: string;
  title: string;
  partner_name: string | null;
  description: string | null;
  discount: string | null;
  referral_url: string | null;
  edition: number;
  active: boolean;
};

export default function AdminAlianzasClient({
  offers,
  currentEdition,
}: {
  offers: AdminOffer[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `⚠️ ${res.error}` : "✅ Listo");
      if (res?.ok) reset?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nueva oferta</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(createOffer, new FormData(form), () => form.reset());
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Título" name="title" placeholder="Nombre de la oferta" required />
          <Field label="Aliado / empresa" name="partner_name" placeholder="Marca aliada" />
          <Field label="Beneficio / descuento" name="discount" placeholder="Ej. 30% OFF" />
          <TextAreaField label="Descripción" name="description" value="" onChange={() => {}} placeholder="Detalle de la oferta" />
          <Field
            label="Link de referido (administrado por Feria Effix)"
            name="referral_url"
            placeholder="https://…"
          />
          <input type="hidden" name="edition" value={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear oferta"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Ofertas ({offers.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {offers.map((o) => (
          <GlassCard key={o.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {o.title}
                </p>
                <p className="truncate text-[10px] text-brand-muted">
                  {o.partner_name ?? "—"}
                  {o.discount ? ` · ${o.discount}` : ""} · Ed. {o.edition}
                </p>
              </div>
              <Badge>{o.active ? "Activa" : "Oculta"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <form action={(fd) => run(toggleOffer, fd)}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="active" value={o.active ? "true" : "false"} />
                <button className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim">
                  {o.active ? "Ocultar" : "Mostrar"}
                </button>
              </form>
              <form action={(fd) => run(deleteOffer, fd)}>
                <input type="hidden" name="id" value={o.id} />
                <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
                  Eliminar
                </button>
              </form>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
