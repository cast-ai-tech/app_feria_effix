"use client";

import { Ticket } from "lucide-react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";

/**
 * Estado "sin boleta vinculada aún": explica qué hacer, deja re-buscar por
 * correo, vincular manualmente por número de orden, y ofrece la boleta Black
 * por WhatsApp (venta 100% manual, sin flujo de pago).
 */
export default function NoTicket({
  accountEmail,
  blackWhatsappUrl,
}: {
  accountEmail: string;
  blackWhatsappUrl: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState("");
  const [email, setEmail] = useState(accountEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function research() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_my_tickets");
    setBusy(false);
    if (error) return setErr(error.message);
    if (data && data > 0) {
      setMsg("¡Boleta encontrada! Cargando…");
      router.refresh();
    } else {
      setErr(
        "No encontramos ninguna boleta con tu correo. Revisa que sea el mismo de la compra o vincúlala por número de orden.",
      );
    }
  }

  async function linkByOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("link_ticket_by_order", {
      p_order: order,
      p_email: email,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data === true) {
      setMsg("¡Boleta vinculada! Cargando…");
      router.refresh();
    } else {
      setErr(
        "No encontramos una boleta con ese número de orden y correo. Verifica los datos.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col items-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-brand-lav/25"><Ticket className="h-6 w-6 text-brand-white" aria-hidden /></div>
        <p className="mt-3 text-[14px] font-black text-brand-white">
          Aún no tienes tu escarapela vinculada
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-muted">
          Compra tu entrada en La Tiquetera (Pasaporte 3 Días, VIP o
          Corporativa). Cuando la tengas, la vinculamos automáticamente si usas
          el mismo correo de tu cuenta{accountEmail ? ` (${accountEmail})` : ""}.
        </p>
        <div className="mt-5">
          <Button size="md" variant="glow" onClick={research} disabled={busy}>
            {busy ? "Buscando…" : "Buscar mi entrada"}
          </Button>
        </div>
        <p className="mt-4 text-[9.5px] text-brand-muted">
          Política oficial: no reembolsable pero transferible — la
          transferencia de titular la gestiona el equipo Effix.
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">
          ¿Compraste con otro correo?
        </SectionTitle>
        <p className="text-[10.5px] leading-relaxed text-brand-muted">
          Vincula tu escarapela manualmente con el número de orden y el correo
          con el que compraste en La Tiquetera.
        </p>
        <form onSubmit={linkByOrder} className="flex flex-col gap-3">
          <Field
            label="Número de orden"
            name="order"
            value={order}
            onChange={setOrder}
            placeholder="Ej. TQ-000123"
          />
          <Field
            label="Correo de compra"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="correo@ejemplo.com"
          />
          <Button type="submit" variant="ghost" fullWidth disabled={busy}>
            {busy ? "Vinculando…" : "Vincular mi escarapela"}
          </Button>
        </form>
      </GlassCard>

      <GlassCard className="tier-black-bg tier-shine flex flex-col items-center border-transparent p-5 text-center">
        <p className="text-[13px] font-black uppercase tracking-wide text-black">
          Entrada Black
        </p>
        <p className="mt-1 text-[10px] font-extrabold text-black/70">
          Solo 400 cupos en todo el mundo
        </p>
        <p className="mt-2 text-[10.5px] leading-relaxed text-black/70">
          La experiencia completa: 5 días, mentorías, zonas exclusivas,
          alimentación y la Línea Black de soporte dedicado. Se gestiona de
          forma personal por WhatsApp.
        </p>
        <div className="mt-4">
          <Button href={blackWhatsappUrl} size="md" variant="solid" className="bg-black text-white">
            COMPRA TU ENTRADA BLACK
          </Button>
        </div>
      </GlassCard>

      {err && (
        <p className="text-center text-[11px] font-semibold text-red-300">{err}</p>
      )}
      {msg && (
        <p className="text-center text-[11px] font-semibold text-emerald-300">
          {msg}
        </p>
      )}
    </div>
  );
}
