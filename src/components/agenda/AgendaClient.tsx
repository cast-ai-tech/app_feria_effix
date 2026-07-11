"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import { cn } from "@/lib/cn";

export type Talk = {
  id: string;
  title: string;
  description: string | null;
  speaker_id: string | null;
  speaker_name: string | null;
  auditorium: string | null;
  day: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

const DAYS = [1, 2, 3] as const;
const TZ = "America/Bogota";

/** Hora local del evento (Medellín, -05) sin depender de la zona del dispositivo. */
function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

/** Fecha calendario (YYYY-MM-DD) en la zona del evento. */
function bogotaDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** ¿La charla está en curso ahora mismo? (comparación en tiempo absoluto). */
function isLive(t: Talk, nowMs: number): boolean {
  if (t.status !== "active" || !t.starts_at || !t.ends_at) return false;
  const start = new Date(t.starts_at).getTime();
  const end = new Date(t.ends_at).getTime();
  return nowMs >= start && nowMs < end;
}

export default function AgendaClient({ talks }: { talks: Talk[] }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Re-evalúa el badge "Ahora" contra la hora del dispositivo cada 30s.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Fecha calendario de cada día (para marcar "Hoy") a partir de las charlas.
  const dayDates = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of talks) {
      if (t.day && t.starts_at && !map.has(t.day)) {
        map.set(t.day, bogotaDay(t.starts_at));
      }
    }
    return map;
  }, [talks]);

  const todayStr = new Date(nowMs).toLocaleDateString("en-CA", { timeZone: TZ });
  const todayDay = DAYS.find((d) => dayDates.get(d) === todayStr) ?? null;

  const firstWithTalks =
    DAYS.find((d) => talks.some((t) => t.day === d)) ?? 1;

  const [day, setDay] = useState<number>(() => todayDay ?? firstWithTalks);

  const shown = talks.filter((t) => t.day === day);

  return (
    <div className="flex flex-col">
      {/* Chips de día */}
      <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DAYS.map((d) => (
          <FilterChip key={d} active={day === d} onClick={() => setDay(d)}>
            {todayDay === d ? `Hoy · Día ${d}` : `Día ${d}`}
          </FilterChip>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon="🗓️"
            title="Sin charlas para este día"
            subtitle="Aún no hay conferencias programadas en la agenda de este día. Vuelve pronto."
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {shown.map((t) => {
            const live = isLive(t, nowMs);
            const cancelled = t.status === "cancelled";
            const time =
              t.starts_at && t.ends_at
                ? `${fmtTime(t.starts_at)} – ${fmtTime(t.ends_at)}`
                : fmtTime(t.starts_at);

            const subtitle = (
              <span className={cn(cancelled && "line-through")}>
                {[t.auditorium, time].filter(Boolean).join(" · ")}
                {live && " · EN VIVO"}
                {cancelled && " · Cancelada"}
              </span>
            );

            return (
              <GlassCard
                key={t.id}
                className={cn(cancelled && "opacity-55")}
              >
                <ListItem
                  href={t.speaker_id ? `/ponentes/${t.speaker_id}` : undefined}
                  thumb={cancelled ? "🚫" : live ? "🔴" : "🕑"}
                  title={
                    <span className={cn(cancelled && "line-through")}>
                      {t.title}
                    </span>
                  }
                  subtitle={subtitle}
                  right={live ? <Badge dot>Ahora</Badge> : undefined}
                />
              </GlassCard>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-[10.5px] font-medium text-brand-muted">
        Toca una charla para ver el detalle del ponente
      </p>
    </div>
  );
}
