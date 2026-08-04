"use client";

import { Star } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { layoutDay, timeBounds, type ScheduleItem } from "@/lib/scheduleLayout";
import type { Talk } from "@/components/agenda/AgendaClient";

/**
 * Vista HORARIO de la Agenda (Fase 30): el calendario visual de la feria
 * dentro de la app — horas en el eje vertical, charlas como bloques
 * proporcionales a su duración, color por auditorio, charlas simultáneas
 * lado a lado y línea de "ahora" durante el día del evento. Sin depender
 * de Google/Apple: este ES el calendario del evento.
 */

const TZ = "America/Bogota";
const HOUR_MS = 3_600_000;
/** Altura de una hora en px — define la escala vertical. */
const HOUR_PX = 96;
const GUTTER_PX = 48;

/** Paleta por auditorio — derivados de la gama de marca (cromo/cian/lavanda/oro). */
const AUDITORIUM_COLORS = [
  "#248acc", // cian (glow oficial)
  "#726e8d", // lavanda
  "#f5d67b", // oro VIP
  "#e8e8e8", // cromo
  "#8a86ad", // lavanda clara
];

function fmtHour(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

export default function DayCalendar({
  talks,
  nowMs,
  savedIds,
  onToggleSave,
  canStar = () => true,
}: {
  talks: Talk[];
  nowMs: number;
  savedIds: Set<string>;
  onToggleSave: (talk: Talk) => void;
  /** false para items sin estrella (p. ej. citas personales de Mi Agenda). */
  canStar?: (talk: Talk) => boolean;
}) {
  const timed = useMemo(() => talks.filter((t) => !!t.starts_at), [talks]);

  const items: ScheduleItem[] = useMemo(
    () =>
      timed.map((t) => {
        const startMs = new Date(t.starts_at!).getTime();
        const endMs = t.ends_at
          ? new Date(t.ends_at).getTime()
          : startMs + HOUR_MS;
        return {
          id: t.id,
          startMs,
          endMs: Math.max(endMs, startMs + 15 * 60_000),
        };
      }),
    [timed],
  );

  const bounds = useMemo(() => timeBounds(items), [items]);
  const layout = useMemo(() => layoutDay(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const auditoriums = useMemo(
    () =>
      [...new Set(timed.map((t) => t.auditorium).filter(Boolean))] as string[],
    [timed],
  );
  const colorOf = (auditorium: string | null) => {
    const idx = auditorium ? auditoriums.indexOf(auditorium) : -1;
    return AUDITORIUM_COLORS[
      ((idx % AUDITORIUM_COLORS.length) + AUDITORIUM_COLORS.length) %
        AUDITORIUM_COLORS.length
    ];
  };

  if (timed.length === 0) return null;

  const totalMs = bounds.endMs - bounds.startMs;
  const heightPx = (totalMs / HOUR_MS) * HOUR_PX;
  const hourMarks: number[] = [];
  for (let ms = bounds.startMs; ms <= bounds.endMs; ms += HOUR_MS) {
    hourMarks.push(ms);
  }
  const yOf = (ms: number) => ((ms - bounds.startMs) / totalMs) * heightPx;
  const nowVisible = nowMs >= bounds.startMs && nowMs <= bounds.endMs;

  return (
    <div className="flex flex-col gap-2">
      {auditoriums.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {auditoriums.map((a) => (
            <span
              key={a}
              className="flex items-center gap-1.5 text-[9.5px] font-bold text-brand-dim"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: colorOf(a) }}
              />
              {a}
            </span>
          ))}
        </div>
      )}

      <div
        className="relative"
        style={{ height: heightPx + 16 }}
        role="list"
        aria-label="Horario del día"
      >
        {/* Marcas de hora */}
        {hourMarks.map((ms) => (
          <div
            key={ms}
            aria-hidden
            className="absolute left-0 right-0 flex items-center gap-2"
            style={{ top: yOf(ms) }}
          >
            <span className="w-[40px] text-right text-[9px] font-bold tabular-nums text-brand-muted">
              {fmtHour(ms)}
            </span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
        ))}

        {/* Línea de "ahora" (solo mientras transcurre el día del evento) */}
        {nowVisible && (
          <div
            aria-hidden
            className="absolute left-[40px] right-0 z-10 flex items-center"
            style={{ top: yOf(nowMs) }}
          >
            <span className="h-2 w-2 -translate-x-1 rounded-full bg-glow-cian" />
            <span className="h-[2px] flex-1 bg-glow-cian/80" />
          </div>
        )}

        {/* Bloques de charlas (contenedor a la derecha del gutter de horas) */}
        <div className="absolute inset-y-0 right-0" style={{ left: GUTTER_PX }}>
          {timed.map((t) => {
            const it = byId.get(t.id)!;
            const place = layout.get(t.id) ?? { lane: 0, laneCount: 1 };
            const top = yOf(it.startMs);
            const height = Math.max(yOf(it.endMs) - top, 34);
            const laneW = 100 / place.laneCount;
            const saved = savedIds.has(t.id);
            const cancelled = t.status === "cancelled";
            const color = colorOf(t.auditorium);
            const compact = height < 56;

            return (
              <div
                key={t.id}
                role="listitem"
                className={cn(
                  "absolute overflow-hidden rounded-[10px] border bg-[rgba(20,20,26,0.92)] px-2 py-1.5",
                  saved ? "border-white/60" : "border-white/[0.12]",
                  cancelled && "opacity-45",
                )}
                style={{
                  top,
                  height,
                  left: `${place.lane * laneW}%`,
                  width: `calc(${laneW}% - 3px)`,
                  borderLeftWidth: 3,
                  borderLeftColor: color,
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[10.5px] font-extrabold leading-tight text-brand-white",
                        cancelled && "line-through",
                      )}
                    >
                      {t.title}
                    </p>
                    <p className="truncate text-[9px] font-semibold tabular-nums text-brand-muted">
                      {fmtHour(it.startMs)}–{fmtHour(it.endMs)}
                      {!compact && t.auditorium ? ` · ${t.auditorium}` : ""}
                      {cancelled ? " · Cancelada" : ""}
                    </p>
                    {!compact && t.speaker_name && (
                      <p className="truncate text-[9px] text-brand-dim">
                        {t.speaker_name}
                      </p>
                    )}
                  </div>
                  {canStar(t) && (
                    <button
                      type="button"
                      onClick={() => onToggleSave(t)}
                      aria-label={
                        saved
                          ? `Quitar de Mi Agenda: ${t.title}`
                          : `Guardar en Mi Agenda: ${t.title}`
                      }
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full active:scale-90"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          saved
                            ? "fill-brand-white text-brand-white"
                            : "text-brand-muted",
                        )}
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
