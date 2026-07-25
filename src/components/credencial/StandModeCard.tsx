"use client";

import { Camera, Store } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { SelectField } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { parseConnectPayload } from "@/lib/credencial";
import {
  enqueueStandScan,
  flushStandScans,
  pendingStandScans,
} from "@/lib/standScanQueue";
import { scanQR } from "@/lib/platform/camera";
import { hapticError, hapticSuccess } from "@/lib/platform/haptics";
import { notifyStandScan } from "@/app/credencial/actions";

export type StaffStand = { id: string; name: string };

type ScanFeedItem = {
  key: string;
  label: string;
  status: "sealed" | "already" | "not_found" | "queued" | "not_staff";
};

const STATUS_LABEL: Record<ScanFeedItem["status"], string> = {
  sealed: "Sello + lead ✓",
  already: "Ya tenía sello de este stand",
  not_found: "Credencial no encontrada",
  queued: "Sin señal — en cola",
  not_staff: "No autorizado en este stand",
};

/**
 * MODO STAND (Fase 15): visible en /credencial solo para staff de stands.
 * Escanea credenciales de asistentes → sello del pasaporte + lead.
 * Funciona offline con cola de sincronización.
 */
export default function StandModeCard({ stands }: { stands: StaffStand[] }) {
  const [active, setActive] = useState(false);
  const [standId, setStandId] = useState(stands[0]?.id ?? "");
  const [scanning, setScanning] = useState(false);
  const [feed, setFeed] = useState<ScanFeedItem[]>([]);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendScan = useCallback(async (stand: string, code: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("stand_scan_credencial", {
      p_stand: stand,
      p_code: code,
    });
    if (error) throw new Error(error.message);
    const res = data as {
      status: "sealed" | "already" | "not_found" | "not_staff";
      attendee?: { id?: string; full_name: string | null };
    };
    // Push operativo al asistente sellado (Fase 16); fire-and-forget.
    if (res.status === "sealed" && res.attendee?.id) {
      void notifyStandScan(res.attendee.id);
    }
    return res;
  }, []);

  const refreshPending = useCallback(async () => {
    setPending(await pendingStandScans());
  }, []);

  useEffect(() => {
    const flush = async () => {
      const n = await flushStandScans(sendScan);
      if (n > 0) hapticSuccess();
      await refreshPending();
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [sendScan, refreshPending]);

  function pushFeed(item: Omit<ScanFeedItem, "key">) {
    setFeed((f) => [{ ...item, key: `${Date.now()}-${f.length}` }, ...f].slice(0, 8));
  }

  async function handleCode(code: string) {
    try {
      const res = await sendScan(standId, code);
      const name = res.attendee?.full_name ?? "Asistente";
      pushFeed({ label: name, status: res.status });
      if (res.status === "sealed") hapticSuccess();
      else hapticError();
    } catch {
      await enqueueStandScan(standId, code);
      await refreshPending();
      hapticSuccess();
      pushFeed({ label: `Código ${code}`, status: "queued" });
    }
  }

  async function startScan() {
    setError(null);
    setScanning(true);
    await new Promise((r) => setTimeout(r, 50));
    const video = videoRef.current;
    if (!video) {
      setScanning(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Escaneo continuo: tras cada lectura reabre hasta que cancelen.
      // (Bucle simple: una lectura por sesión de cámara.)
      const raw = await scanQR(video, { signal: controller.signal });
      setScanning(false);
      const code = parseConnectPayload(raw);
      if (!code) {
        hapticError();
        setError("Ese QR no es una Credencial Effix.");
        return;
      }
      await handleCode(code);
    } catch (e) {
      setScanning(false);
      const msg = e instanceof Error ? e.message : "No se pudo abrir la cámara.";
      if (!msg.includes("cancelado")) setError(msg);
    }
  }

  function stopScan() {
    abortRef.current?.abort();
    setScanning(false);
  }

  if (stands.length === 0) return null;

  return (
    <GlassCard className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-extrabold text-brand-white">
            <Store className="mr-1 inline h-3.5 w-3.5" aria-hidden />Modo stand
          </p>
          <p className="text-[10px] text-brand-muted">
            Escanea asistentes → sello del pasaporte + lead para tu stand
          </p>
        </div>
        <button
          onClick={() => setActive((a) => !a)}
          aria-pressed={active}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${
            active
              ? "border-emerald-400/60 text-emerald-300"
              : "border-white/30 text-brand-dim"
          }`}
        >
          {active ? "Activo" : "Activar"}
        </button>
      </div>

      {active && (
        <>
          {stands.length > 1 && (
            <SelectField
              label="Stand"
              name="stand"
              value={standId}
              onChange={setStandId}
              options={stands.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}

          <Button fullWidth onClick={startScan}>
            <Camera className="mr-2 inline h-4 w-4" aria-hidden />Escanear credencial del asistente
          </Button>

          {pending > 0 && (
            <p className="text-center text-[10px] font-semibold text-amber-300">
              {pending} en cola de sincronización
            </p>
          )}
          {error && (
            <p className="text-[10.5px] font-semibold text-red-300">{error}</p>
          )}

          {feed.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {feed.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="truncate text-[11px] font-bold text-brand-white">
                    {f.label}
                  </span>
                  <span className="flex-shrink-0 text-[9.5px] font-semibold text-brand-muted">
                    {STATUS_LABEL[f.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {scanning && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6">
              <p className="mb-3 text-[12px] font-extrabold text-brand-white">
                Apunta a la credencial del asistente
              </p>
              <video
                ref={videoRef}
                className="aspect-square w-full max-w-[340px] rounded-[18px] object-cover"
                muted
                playsInline
              />
              <div className="mt-2 flex items-center gap-2">
                <Badge dot>Se registra sello + lead</Badge>
              </div>
              <Button variant="ghost" className="mt-4" onClick={stopScan}>
                Cancelar
              </Button>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
