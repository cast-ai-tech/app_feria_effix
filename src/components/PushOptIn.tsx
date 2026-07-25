"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { notifications } from "@/lib/platform/notifications";
import { enablePush } from "@/lib/pushClient";
import { storage } from "@/lib/platform/storage";

const DISMISSED_KEY = "efx.push_optin_dismissed.v1";

/**
 * Pre-prompt de push (Fase 16). REGLA: no pedir el permiso al abrir la app;
 * pedirlo en el primer MOMENTO DE VALOR (primera conexión, primera charla
 * guardada) explicando el beneficio. Este componente se monta en esos
 * momentos con el `reason` correspondiente.
 */
export default function PushOptIn({ reason }: { reason: string }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "denied">(
    "idle",
  );

  useEffect(() => {
    void (async () => {
      const perm = await notifications.permissionState();
      if (perm !== "prompt") return; // ya decidió o no soporta
      const dismissed = await storage.get(DISMISSED_KEY);
      if (!dismissed) setVisible(true);
    })();
  }, []);

  if (!visible) return null;

  async function accept() {
    setState("busy");
    const res = await enablePush();
    if (res === "enabled") {
      setState("done");
      setTimeout(() => setVisible(false), 2500);
    } else {
      setState("denied");
      setTimeout(() => setVisible(false), 2500);
    }
  }

  async function dismiss() {
    await storage.set(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <GlassCard sheen className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-brand-white">
        <Bell className="h-4 w-4" aria-hidden />
        Activa las notificaciones
      </p>
      <p className="text-[10.5px] leading-relaxed text-brand-muted">{reason}</p>
      {state === "done" ? (
        <p className="text-[11px] font-bold text-emerald-300">
          Notificaciones activadas ✓
        </p>
      ) : state === "denied" ? (
        <p className="text-[11px] font-bold text-brand-muted">
          Puedes activarlas luego desde tu perfil.
        </p>
      ) : (
        <div className="flex gap-2">
          <Button fullWidth onClick={accept} disabled={state === "busy"}>
            {state === "busy" ? "Activando…" : "Activar"}
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Ahora no
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
