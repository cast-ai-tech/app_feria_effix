"use client";

import { useEffect, useState } from "react";
import { Expand, Minus, Plus, X } from "lucide-react";

/**
 * Planimetría oficial 2026 (asset real de feriaeffix.com, fondo transparente).
 * - Tarjeta: vista completa del plano, tap para ampliar.
 * - Ampliado: overlay full-device con zoom por botones y paneo por scroll
 *   nativo (el pinch del navegador está bloqueado por maximumScale=1).
 */

const SRC = "/mapa/planimetria-2026.webp";
const ZOOM_MIN = 1.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.75;

export default function PlanimetriaViewer() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(2.25);

  // El overlay congela el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ampliar planimetría del recinto"
        className="group relative block w-full overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] transition-colors duration-150 hover:border-white/25 active:scale-[0.99]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SRC}
          alt="Planimetría oficial Feria Effix 2026"
          className="aspect-[2560/1576] w-full object-contain p-2"
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] font-bold text-brand-white">
          <Expand className="h-3 w-3" aria-hidden />
          Toca para ampliar
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <p className="text-[13px] font-extrabold text-brand-white">
              Planimetría 2026
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                aria-label="Alejar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-brand-white active:scale-95"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                aria-label="Acercar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-brand-white active:scale-95"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar planimetría"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-brand-white active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SRC}
              alt="Planimetría oficial Feria Effix 2026 ampliada"
              style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
              className="h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
