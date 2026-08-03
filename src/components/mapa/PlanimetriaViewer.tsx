"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Minus, Plus, X } from "lucide-react";

/**
 * Planimetría oficial 2026 (asset real de feriaeffix.com).
 * - Tarjeta: vista completa del plano, tap para ampliar.
 * - Ampliado: overlay full-device con zoom (botones, pellizco con dos
 *   dedos, o rueda del mouse) y paneo libre en X/Y. Touch (arrastre y
 *   pellizco) va por Touch Events nativos; mouse va por Pointer Events —
 *   están separados a propósito, ver el comentario en handlePointerDown.
 *   El pinch nativo del navegador (zoom de la página) está bloqueado por
 *   maximumScale=1 en el viewport global.
 */

// ?v= (Fase 30): el archivo se reemplazó en la misma ruta — sin esto el
// navegador puede seguir sirviendo del caché la versión vieja (2560×1576)
// mientras el código ya calcula tamaños con la proporción nueva, y el
// resultado se ve estirado. Súbele el número si se vuelve a reemplazar.
const SRC = "/mapa/planimetria-2026.webp?v=2";
const NATURAL_ASPECT = 3200 / 1411;
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1;
const DEFAULT_ZOOM = 2;

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Centra el eje si la imagen es más chica que el viewport; si no, la
 * mantiene dentro de los bordes (nunca deja un hueco vacío de un lado). */
function clampAxis(pos: number, viewport: number, imgSize: number): number {
  if (imgSize <= viewport) return (viewport - imgSize) / 2;
  return Math.min(0, Math.max(viewport - imgSize, pos));
}

export default function PlanimetriaViewer() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<Point | null>(null);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const clampPan = useCallback(
    (p: Point, z: number): Point => {
      const imgW = viewport.w * z;
      const imgH = imgW / NATURAL_ASPECT;
      return {
        x: clampAxis(p.x, viewport.w, imgW),
        y: clampAxis(p.y, viewport.h, imgH),
      };
    },
    [viewport],
  );

  // El overlay congela el scroll del fondo mientras está abierto, y mide el
  // viewport real del visor (cambia con la rotación del dispositivo). El
  // reset de zoom/pan al abrir vive en el onClick del botón (evento, no
  // efecto) para no encadenar un setState síncrono dentro del effect.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const el = viewportRef.current;
    if (!el) return;
    // Además de medir, centra el pan inicial con las medidas reales (si se
    // dejara en {0,0} a secas, la imagen nacería pegada arriba-izquierda
    // hasta el primer gesto del usuario). Si el elemento aún no tiene
    // layout (0×0) en el primer intento, reintenta un par de frames — en
    // algunos navegadores móviles el overlay `fixed` tarda un frame extra
    // en asentarse. Sin esto la imagen podía quedarse con viewport.w=0
    // para siempre y no renderizarse nunca (parecía que "nada reaccionaba").
    let attempts = 0;
    let raf = 0;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 && h === 0 && attempts < 10) {
        attempts++;
        raf = requestAnimationFrame(measure);
        return;
      }
      setViewport({ w, h });
      const imgW = w * DEFAULT_ZOOM;
      const imgH = imgW / NATURAL_ASPECT;
      setPan({ x: clampAxis(0, w, imgW), y: clampAxis(0, h, imgH) });
    };
    measure();

    // ResizeObserver es un nice-to-have (recalcula si rotas el teléfono);
    // el resize de window es el respaldo universal si no está disponible.
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [open]);

  function zoomBy(delta: number) {
    const nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
    setZoom(nz);
    setPan((p) => clampPan(p, nz));
  }

  // Arrastre con MOUSE (Pointer Events — el mouse solo tiene un puntero,
  // sin ambigüedad multi-touch). El touch se maneja aparte, con Touch
  // Events nativos (ver más abajo) — Pointer Events tiene soporte
  // multi-touch inconsistente entre navegadores móviles (Safari iOS en
  // particular), así que para el pinch usamos la API original y más
  // confiable en vez de confiar en pointerdown/pointermove por dedo.
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = pan;
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan(
      clampPan(
        { x: panStart.current.x + dx, y: panStart.current.y + dy },
        zoom,
      ),
    );
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    dragStart.current = null;
    setIsDragging(false);
  }

  // Arrastre y pellizco con DEDOS — Touch Events nativos enganchados a
  // mano (mismo motivo que el wheel: necesitan { passive: false } para
  // poder frenar el scroll/zoom nativo de la página, y React nunca
  // registra estos listeners como no-pasivos).
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;

    function point(t: Touch): Point {
      return { x: t.clientX, y: t.clientY };
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1) {
        dragStart.current = point(e.touches[0]);
        panStart.current = panRef.current;
        pinchStart.current = null;
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        pinchStart.current = {
          dist: distance(point(e.touches[0]), point(e.touches[1])),
          zoom: zoomRef.current,
        };
        dragStart.current = null;
        setIsDragging(false);
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2 && pinchStart.current) {
        const ratio =
          distance(point(e.touches[0]), point(e.touches[1])) /
          pinchStart.current.dist;
        const nz = Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, pinchStart.current.zoom * ratio),
        );
        setZoom(nz);
        setPan((p) => clampPan(p, nz));
        return;
      }
      if (e.touches.length === 1 && dragStart.current) {
        const t = point(e.touches[0]);
        const dx = t.x - dragStart.current.x;
        const dy = t.y - dragStart.current.y;
        setPan(
          clampPan(
            { x: panStart.current.x + dx, y: panStart.current.y + dy },
            zoomRef.current,
          ),
        );
      }
    }

    // touchend/touchcancel: e.touches ya refleja los dedos que QUEDAN.
    function onTouchEnd(e: TouchEvent) {
      pinchStart.current = null;
      if (e.touches.length === 1) {
        dragStart.current = point(e.touches[0]);
        panStart.current = panRef.current;
        setIsDragging(true);
      } else {
        dragStart.current = null;
        setIsDragging(false);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open, clampPan]);

  // Zoom con la rueda del mouse — enganchado a mano con { passive: false }.
  // El onWheel de React SIEMPRE se registra como passive (limitación
  // conocida: no hay forma de pedirle a React que no lo sea), así que
  // e.preventDefault() ahí nunca funciona y el navegador scrollea la
  // página en vez de zoomear. Un listener nativo sí lo permite.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const nz = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, zoomRef.current - e.deltaY * 0.0025),
      );
      setZoom(nz);
      setPan((p) => clampPan(p, nz));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, clampPan]);

  const imgW = viewport.w * zoom;
  const imgH = imgW / NATURAL_ASPECT;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setZoom(DEFAULT_ZOOM);
        }}
        aria-label="Ampliar planimetría del recinto"
        className="group relative block w-full overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] transition-colors duration-150 hover:border-white/25 active:scale-[0.99]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SRC}
          alt="Planimetría oficial Feria Effix 2026"
          className="aspect-[3200/1411] w-full object-contain p-2"
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
                onClick={() => zoomBy(-ZOOM_STEP)}
                aria-label="Alejar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-brand-white active:scale-95"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
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

          {/* Arrastra para mover, pellizca o usa la rueda del mouse para
              hacer zoom — overflow-hidden porque el paneo lo controla el
              transform, no el scroll nativo. */}
          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative flex-1 touch-none select-none overflow-hidden pb-[env(safe-area-inset-bottom)]"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {viewport.w > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={SRC}
                alt="Planimetría oficial Feria Effix 2026 ampliada"
                draggable={false}
                style={{
                  position: "absolute",
                  width: imgW,
                  height: imgH,
                  // Salvaguarda: si por lo que sea width/height no calzan
                  // exacto con la proporción real de la imagen (caché
                  // vieja, redondeo), "contain" nunca la estira — como
                  // mucho deja una franja vacía, jamás la deforma.
                  objectFit: "contain",
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  willChange: "transform",
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
