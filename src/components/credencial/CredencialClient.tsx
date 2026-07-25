"use client";

import { AtSign, Briefcase, Camera, MessageCircle } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import PushOptIn from "@/components/PushOptIn";
import { connectPayload, parseConnectPayload } from "@/lib/credencial";
import { notifyNewConnection } from "@/app/credencial/actions";
import { enqueueScan, flushScans, pendingScans } from "@/lib/connectQueue";
import { cacheCredencial } from "@/lib/credencialStore";
import { scanQR } from "@/lib/platform/camera";
import { hapticError, hapticSuccess } from "@/lib/platform/haptics";

export type CredencialData = {
  connectCode: string;
  fullName: string;
  role: string | null;
  country: string | null;
  tier: string | null; // 'general' | 'vip' | 'black' | 'diaria' | null
  tierLabel: string | null;
};

type ConnectedProfile = {
  id: string;
  full_name: string | null;
  country: string | null;
  role: string | null;
  bio: string | null;
  whatsapp: string | null;
  instagram: string | null;
  linkedin: string | null;
};

type ConnectResult = {
  status: "connected" | "already" | "not_found" | "self";
  note?: string | null;
  profile?: ConnectedProfile;
};

/**
 * Código de color por tier — el OFICIAL del sitio (Fase 23, corrige F14):
 * General/Pasaporte = lavanda · VIP = oro · Black = plata/cromo con brillo.
 * `dark` = el fondo metálico exige texto negro.
 */
const TIER_STYLES: Record<string, { card: string; dark: boolean }> = {
  general: { card: "border-brand-lav/60 bg-brand-lav/20", dark: false },
  corporativa: { card: "border-brand-lav/60 bg-brand-lav/20", dark: false },
  diaria: { card: "border-brand-lav/60 bg-brand-lav/20", dark: false },
  vip: { card: "tier-vip-bg tier-shine border-transparent", dark: true },
  black: { card: "tier-black-bg tier-shine border-transparent", dark: true },
};

const NO_TIER = { card: "border-white/15 bg-white/[0.04]", dark: false };

function waLink(v: string) {
  return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
}
function igLink(v: string) {
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}
function inLink(v: string) {
  return v.startsWith("http") ? v : `https://${v}`;
}

export default function CredencialClient({ data }: { data: CredencialData }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // QR estático de la credencial + cache offline.
  useEffect(() => {
    void QRCode.toDataURL(connectPayload(data.connectCode), {
      margin: 1,
      width: 340,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
    void cacheCredencial(data);
  }, [data]);

  const sendCode = useCallback(async (code: string): Promise<ConnectResult> => {
    const supabase = createClient();
    const { data: res, error } = await supabase.rpc("connect_by_code", {
      p_code: code,
    });
    if (error) {
      // Errores de red se lanzan para que la cola offline los capture.
      throw new Error(error.message);
    }
    return res as ConnectResult;
  }, []);

  const refreshPending = useCallback(async () => {
    setPending(await pendingScans());
  }, []);

  // Sincroniza la cola offline al montar y al volver la conexión.
  useEffect(() => {
    const flush = async () => {
      const n = await flushScans(sendCode);
      if (n > 0) hapticSuccess();
      await refreshPending();
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [sendCode, refreshPending]);

  async function handleCode(code: string) {
    setBusy(true);
    setScanError(null);
    try {
      const res = await sendCode(code);
      setResult(res);
      if (res.status === "connected" || res.status === "already") {
        hapticSuccess();
        // Push operativo al otro asistente (Fase 16); fire-and-forget.
        if (res.status === "connected" && res.profile?.id) {
          void notifyNewConnection(res.profile.id);
        }
      } else {
        hapticError();
      }
    } catch {
      // Sin señal: encolar y avisar.
      await enqueueScan(code);
      await refreshPending();
      hapticSuccess();
      setScanError(
        "Sin conexión: el escaneo quedó guardado y se sincroniza al volver la señal.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    setScanning(true);
    setScanError(null);
    setResult(null);
    // Espera al render del <video>.
    await new Promise((r) => setTimeout(r, 50));
    const video = videoRef.current;
    if (!video) {
      setScanning(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const raw = await scanQR(video, { signal: controller.signal });
      setScanning(false);
      const code = parseConnectPayload(raw);
      if (!code) {
        hapticError();
        setScanError("Ese QR no es una Credencial Effix.");
        return;
      }
      if (code === data.connectCode) {
        setResult({ status: "self" });
        hapticError();
        return;
      }
      await handleCode(code);
    } catch (e) {
      setScanning(false);
      const msg = e instanceof Error ? e.message : "No se pudo abrir la cámara.";
      if (!msg.includes("cancelado")) setScanError(msg);
    }
  }

  function stopScan() {
    abortRef.current?.abort();
    setScanning(false);
  }

  const tierStyle = (data.tier && TIER_STYLES[data.tier]) || NO_TIER;

  return (
    <div className="flex flex-col gap-4">
      {/* La credencial */}
      <GlassCard
        sheen={!tierStyle.dark}
        className={cn(
          "flex flex-col items-center p-6 text-center",
          tierStyle.card,
        )}
      >
        <p
          className={cn(
            "text-[10px] font-extrabold uppercase tracking-[1.5px]",
            tierStyle.dark ? "text-black/60" : "text-brand-dim",
          )}
        >
          Credencial Effix
        </p>
        <p
          className={cn(
            "mt-2 text-[22px] font-black uppercase leading-tight tracking-wide",
            tierStyle.dark ? "text-black" : "text-brand-white",
          )}
        >
          {data.fullName || "Asistente"}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[12.5px] font-semibold",
            tierStyle.dark ? "text-black/70" : "text-brand-muted",
          )}
        >
          {[data.role, data.country].filter(Boolean).join(" · ") || "—"}
        </p>

        {/* Placa blanca del QR — protagonista de la credencial */}
        <div className="my-5 flex aspect-square w-[min(64vw,260px)] items-center justify-center rounded-[22px] bg-white p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR de mi credencial"
              className="h-full w-full"
              width={240}
              height={240}
            />
          ) : (
            <span className="text-[11px] font-bold text-black/40">
              Generando…
            </span>
          )}
        </div>

        <p
          className={cn(
            "text-[10px] font-bold tracking-[2px]",
            tierStyle.dark ? "text-black/60" : "text-brand-dim",
          )}
        >
          {data.connectCode}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {tierStyle.dark ? (
            <>
              {data.tierLabel && (
                <span className="rounded-full border border-black/40 bg-black/10 px-2.5 py-1 text-[9.5px] font-extrabold text-black">
                  {data.tierLabel}
                </span>
              )}
              <span className="rounded-full border border-black/40 px-2.5 py-1 text-[9.5px] font-extrabold text-black">
                Escanéame para conectar
              </span>
            </>
          ) : (
            <>
              {data.tierLabel && <Badge dot>{data.tierLabel}</Badge>}
              <Badge>Escanéame para conectar</Badge>
            </>
          )}
        </div>
      </GlassCard>

      <Button fullWidth size="md" variant="glow" onClick={startScan} disabled={busy}>
        {busy ? (
          "Conectando…"
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" aria-hidden />
            Escanear otra credencial
          </>
        )}
      </Button>

      {pending > 0 && (
        <p className="text-center text-[10.5px] font-semibold text-amber-300">
          {pending} {pending === 1 ? "escaneo pendiente" : "escaneos pendientes"}{" "}
          de sincronizar (sin señal)
        </p>
      )}

      {scanError && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">
            {scanError}
          </p>
        </GlassCard>
      )}

      {/* Overlay de cámara */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6">
          <p className="mb-3 text-[12px] font-extrabold text-brand-white">
            Apunta al QR de la otra credencial
          </p>
          <video
            ref={videoRef}
            className="aspect-square w-full max-w-[340px] rounded-[18px] object-cover"
            muted
            playsInline
          />
          <Button variant="ghost" className="mt-4" onClick={stopScan}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Resultado del escaneo */}
      {result && (
        <ResultCard
          result={result}
          onClose={() => setResult(null)}
        />
      )}

      {/* Primer momento de valor: tras conectar, ofrecer push (Fase 16). */}
      {result?.status === "connected" && (
        <PushOptIn reason="Te avisamos cuando alguien se conecte contigo y cuando ganes sellos del pasaporte — incluso con la app cerrada." />
      )}
    </div>
  );
}

function ResultCard({
  result,
  onClose,
}: {
  result: ConnectResult;
  onClose: () => void;
}) {
  const [note, setNote] = useState(result.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (result.status === "not_found") {
    return (
      <GlassCard className="p-4 text-center">
        <p className="text-[12px] font-extrabold text-brand-white">
          Código no encontrado
        </p>
        <p className="mt-1 text-[10.5px] text-brand-muted">
          Ese código no corresponde a ninguna credencial. Pídele a la persona
          que abra su Credencial Effix y vuelve a escanear.
        </p>
        <Button variant="ghost" className="mt-3" onClick={onClose}>
          Cerrar
        </Button>
      </GlassCard>
    );
  }

  if (result.status === "self") {
    return (
      <GlassCard className="p-4 text-center">
        <p className="text-[12px] font-extrabold text-brand-white">
          Esa es tu propia credencial
        </p>
        <p className="mt-1 text-[10.5px] text-brand-muted">
          Escanea la credencial de OTRA persona para conectar.
        </p>
        <Button variant="ghost" className="mt-3" onClick={onClose}>
          Cerrar
        </Button>
      </GlassCard>
    );
  }

  const p = result.profile!;

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
        .eq("connected_profile_id", p.id);
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <GlassCard sheen className="flex flex-col gap-3 p-5">
      <div className="text-center">
        <p className="text-[11px] font-bold text-emerald-300">
          {result.status === "connected"
            ? "¡Conexión guardada en ambos sentidos!"
            : "Ya estaban conectados"}
        </p>
        <p className="mt-2 text-[15px] font-black text-brand-white">
          {p.full_name ?? "Asistente"}
        </p>
        <p className="text-[10.5px] text-brand-muted">
          {[p.role, p.country].filter(Boolean).join(" · ") || "—"}
        </p>
        {p.bio && (
          <p className="mt-2 text-[10.5px] leading-relaxed text-brand-muted">
            {p.bio}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {p.whatsapp && (
          <a
            href={waLink(p.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
          >
            <MessageCircle className="mr-1 inline h-3 w-3" aria-hidden />WhatsApp
          </a>
        )}
        {p.instagram && (
          <a
            href={igLink(p.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
          >
            <AtSign className="mr-1 inline h-3 w-3" aria-hidden />Instagram
          </a>
        )}
        {p.linkedin && (
          <a
            href={inLink(p.linkedin)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-extrabold text-brand-white"
          >
            <Briefcase className="mr-1 inline h-3 w-3" aria-hidden />LinkedIn
          </a>
        )}
      </div>

      <TextAreaField
        label="Nota (dónde lo conocí / de qué hablamos)"
        name="note"
        value={note}
        onChange={setNote}
        placeholder="Ej. Stand de pagos, quiere distribuir en México…"
      />
      <div className="flex gap-2">
        <Button fullWidth onClick={saveNote} disabled={saving}>
          {saving ? "Guardando…" : saved ? "Nota guardada ✓" : "Guardar nota"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </GlassCard>
  );
}
