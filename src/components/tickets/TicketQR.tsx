"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { computeTotp, qrPayload } from "@/lib/totp";
import {
  cacheTickets,
  loadCachedTickets,
  type CachedTicket,
} from "@/lib/ticketStore";

const STATUS_LABEL: Record<CachedTicket["status"], string> = {
  active: "Activa",
  used: "Usada",
  cancelled: "Cancelada",
};

/**
 * Vista de "Mi boleta": QR con clave dinámica que rota, temporizador y modo
 * offline. Recibe las boletas obtenidas del servidor (con conexión) y las
 * cachea; si no llegan datos frescos, cae al cache local para funcionar sin red.
 */
export default function TicketQR({
  serverTickets,
}: {
  serverTickets: CachedTicket[];
}) {
  // Cache local: solo se consulta tras montar (evita mismatch de hidratación,
  // porque en SSR no hay localStorage).
  const [cachedTickets, setCachedTickets] = useState<CachedTicket[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (serverTickets.length > 0) {
      void cacheTickets(serverTickets); // descarga con conexión → guarda offline
      return;
    }
    void loadCachedTickets().then((cached) => {
      if (!cancelled && cached.length > 0) setCachedTickets(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [serverTickets]);

  // Datos a mostrar: los del servidor si llegaron; si no, el cache local.
  const fromCache = serverTickets.length === 0 && cachedTickets.length > 0;
  const tickets = serverTickets.length > 0 ? serverTickets : cachedTickets;

  const activeTickets = tickets.filter((t) => t.status === "active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current =
    activeTickets.find((t) => t.id === selectedId) ??
    activeTickets[0] ??
    tickets[0] ??
    null;

  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      {activeTickets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {activeTickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${
                current.id === t.id
                  ? "border-white/60 bg-brand-white text-black"
                  : "border-white/25 text-brand-dim"
              }`}
            >
              {t.tierLabel} · {t.edition}
            </button>
          ))}
        </div>
      )}

      {current.status === "active" ? (
        <ActiveTicket ticket={current} fromCache={fromCache} />
      ) : (
        <GlassCard className="p-6 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Escarapela {STATUS_LABEL[current.status].toLowerCase()}
          </p>
          <p className="mt-1 text-[11px] text-brand-muted">
            {current.status === "used"
              ? "Esta escarapela ya fue usada para ingresar."
              : "Esta escarapela fue cancelada o transferida. ¿Dudas? Escríbenos por WhatsApp."}
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function ActiveTicket({
  ticket,
  fromCache,
}: {
  ticket: CachedTicket;
  fromCache: boolean;
}) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(ticket.step);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [online, setOnline] = useState(true);
  const lastCode = useRef<string>("");

  // Estado de conexión (para el badge "Modo offline activo").
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Bucle de 1s: recalcula el código TOTP con la hora del sistema (sin red).
  // Regenera el QR solo cuando el código cambia (cada `step` segundos).
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const { code: next, secondsRemaining } = await computeTotp(ticket.secret, {
        step: ticket.step,
        digits: ticket.digits,
      });
      if (cancelled) return;
      setRemaining(secondsRemaining);
      if (next !== lastCode.current) {
        lastCode.current = next;
        setCode(next);
        const url = await QRCode.toDataURL(qrPayload(ticket.id, next), {
          margin: 1,
          width: 340,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ticket.id, ticket.secret, ticket.step, ticket.digits]);

  const mmss = useMemo(() => {
    const s = Math.max(0, remaining);
    return `00:${s.toString().padStart(2, "0")}`;
  }, [remaining]);

  const showOffline = !online || fromCache;

  // Código de color por tier del sitio (Fase 23): Black plata/cromo,
  // VIP oro, General/Pasaporte lavanda. Metálicos → texto negro.
  const metallic = ticket.tierSlug === "black" || ticket.tierSlug === "vip";
  const tierCard =
    ticket.tierSlug === "black"
      ? "tier-black-bg tier-shine border-transparent"
      : ticket.tierSlug === "vip"
        ? "tier-vip-bg tier-shine border-transparent"
        : "border-brand-lav/60 bg-brand-lav/20";

  return (
    <GlassCard
      sheen={!metallic}
      className={cn("flex flex-col items-center p-6 text-center", tierCard)}
    >
      <p
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[1.5px]",
          metallic ? "text-black/60" : "text-brand-dim",
        )}
      >
        Feria Effix {ticket.edition} · Escarapela {ticket.tierLabel}
      </p>

      {/* Caja blanca del QR (fiel al prototipo) */}
      <div className="my-4 flex h-[190px] w-[190px] items-center justify-center rounded-[16px] bg-white p-3">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Código QR de acceso"
            className="h-full w-full"
            width={170}
            height={170}
          />
        ) : (
          <span className="text-[10px] font-bold text-black/40">Generando…</span>
        )}
      </div>

      <div className="mb-2 rounded-md bg-black px-2.5 py-1.5 text-[9px] font-extrabold tracking-wide text-white">
        CLAVE DINÁMICA · {code || "········"}
      </div>

      <p
        className={cn(
          "text-[11px] font-bold",
          metallic ? "text-black/70" : "text-brand-dim",
        )}
      >
        Se renueva en {mmss}
      </p>

      {/* Barra de progreso de la rotación */}
      <div
        className={cn(
          "mt-2 h-1 w-32 overflow-hidden rounded-full",
          metallic ? "bg-black/20" : "bg-white/10",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            metallic ? "bg-black/60" : "bg-brand-dim",
          )}
          style={{ width: `${(remaining / ticket.step) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {metallic ? (
          <>
            <span className="rounded-full border border-black/40 px-2.5 py-1 text-[9.5px] font-extrabold text-black">
              {showOffline ? "Modo offline activo" : "En línea"}
            </span>
            <span className="rounded-full border border-black/40 px-2.5 py-1 text-[9.5px] font-extrabold text-black">
              Personal · transferible solo vía equipo Effix
            </span>
          </>
        ) : (
          <>
            <Badge dot={showOffline}>
              {showOffline ? "Modo offline activo" : "En línea"}
            </Badge>
            <Badge>Personal · transferible solo vía equipo Effix</Badge>
          </>
        )}
      </div>

      <p
        className={cn(
          "mt-3 text-[10px] leading-relaxed",
          metallic ? "text-black/70" : "text-brand-muted",
        )}
      >
        Titular:{" "}
        <span
          className={cn(
            "font-bold",
            metallic ? "text-black" : "text-brand-white",
          )}
        >
          {ticket.holder}
        </span>
        <br />
        El código cambia cada {ticket.step} segundos: una captura de pantalla no
        sirve para ingresar.
      </p>
    </GlassCard>
  );
}
