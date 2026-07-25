"use client";

import { useEffect, useState } from "react";

/**
 * Candidatos en orden de preferencia para el HEADER (h-9):
 * 1. Horizontal blanco (asset oficial del sitio, invertido para fondo negro)
 *    — a 36px de alto es el único legible.
 * 2. Cromado apilado (logo hero oficial) — mejor para pantallas grandes;
 *    queda de respaldo si falta el horizontal.
 */
const LOGO_CANDIDATES = [
  "/brand/logo-horizontal-blanco.png",
  "/brand/logo-cromado.svg",
  "/brand/logo-cromado.png",
];

/**
 * Logo oficial de Feria Effix.
 *
 * REGLA DE MARCA: el logo brush-script SOLO existe como asset gráfico —
 * NUNCA se recrea con tipografía. Cuando el equipo Effix entregue el
 * SVG/PNG cromado, colocarlo en `public/brand/logo-cromado.svg` y este
 * componente lo muestra solo.
 *
 * Fase 24: el fallback es un WORDMARK INTENCIONAL (Montserrat Black +
 * "2026" en lavanda). Nunca un ícono de imagen rota: el asset se
 * pre-carga con `new Image()` y solo se renderiza si cargó bien.
 */
export default function BrandLogo({ className }: { className?: string }) {
  const [assetSrc, setAssetSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Pre-carga SECUENCIAL: respeta el orden de preferencia (no es una
    // carrera) y solo muestra el asset que realmente cargó (nunca roto).
    const tryLoad = (i: number) => {
      if (cancelled || i >= LOGO_CANDIDATES.length) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setAssetSrc(LOGO_CANDIDATES[i]);
      };
      img.onerror = () => tryLoad(i + 1);
      img.src = LOGO_CANDIDATES[i];
    };
    tryLoad(0);
    return () => {
      cancelled = true;
    };
  }, []);

  if (assetSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assetSrc}
        alt="Feria Effix"
        className={`h-9 w-auto ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 ${className ?? ""}`}
      title="Wordmark provisional — el logo oficial cromado va en public/brand/logo-cromado.svg"
    >
      <span className="bg-gradient-to-r from-white via-brand-dim to-brand-lav bg-clip-text text-[15px] font-black uppercase tracking-[0.08em] text-transparent">
        Feria Effix
      </span>
      <span className="text-[10px] font-black tracking-[0.15em] text-brand-lav">
        2026
      </span>
    </span>
  );
}
