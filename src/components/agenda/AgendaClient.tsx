"use client";

import { Ban, CalendarDays, Clock, Star } from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import PushOptIn from "@/components/PushOptIn";
import { cn } from "@/lib/cn";
import { editionDays, type EditionInfo } from "@/lib/editions";
import { createClient } from "@/lib/supabase/client";
import { storage } from "@/lib/platform/storage";
import { hapticTap } from "@/lib/platform/haptics";

export type Talk = {
  id: string;
  title: string;
  description: string | null;
  speaker_id: string | null;
  speaker_name: string | null;
  auditorium: string | null;
  track: string | null;
  day: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

const TZ = "America/Bogota";
const CACHE_KEY = "efx.agenda.v1";

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

/** ¿La charla está en curso ahora mismo? */
function isLive(t: Talk, nowMs: number): boolean {
  if (t.status !== "active" || !t.starts_at || !t.ends_at) return false;
  const start = new Date(t.starts_at).getTime();
  const end = new Date(t.ends_at).getTime();
  return nowMs >= start && nowMs < end;
}

/** Pares de charlas guardadas que se cruzan en horario (mismo día). */
export function findConflicts(talks: Talk[]): Set<string> {
  const conflicted = new Set<string>();
  const usable = talks.filter(
    (t) => t.status === "active" && t.starts_at && t.ends_at,
  );
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i];
      const b = usable[j];
      if (a.day !== b.day) continue;
      const aS = new Date(a.starts_at!).getTime();
      const aE = new Date(a.ends_at!).getTime();
      const bS = new Date(b.starts_at!).getTime();
      const bE = new Date(b.ends_at!).getTime();
      if (aS < bE && bS < aE) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}

function TalkCard({
  talk,
  nowMs,
  saved,
  conflicted,
  onToggleSave,
}: {
  talk: Talk;
  nowMs: number;
  saved: boolean;
  conflicted: boolean;
  onToggleSave: (t: Talk) => void;
}) {
  const live = isLive(talk, nowMs);
  const cancelled = talk.status === "cancelled";
  const time =
    talk.starts_at && talk.ends_at
      ? `${fmtTime(talk.starts_at)} – ${fmtTime(talk.ends_at)}`
      : fmtTime(talk.starts_at);

  return (
    <GlassCard className={cn(cancelled && "opacity-55")}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <ListItem
            href={talk.speaker_id ? `/ponentes/${talk.speaker_id}` : undefined}
            thumb={
              cancelled ? (
                <Ban className="h-[18px] w-[18px] text-red-300" aria-hidden />
              ) : live ? (
                <span className="live-dot h-3 w-3 rounded-full bg-red-500" aria-hidden />
              ) : (
                <Clock className="h-[18px] w-[18px] text-brand-white" aria-hidden />
              )
            }
            title={
              <span className={cn(cancelled && "line-through")}>
                {talk.title}
              </span>
            }
            subtitle={
              <span className={cn(cancelled && "line-through")}>
                {[talk.auditorium, time, talk.track]
                  .filter(Boolean)
                  .join(" · ")}
                {live && " · EN VIVO"}
                {cancelled && " · Cancelada"}
              </span>
            }
            right={
              conflicted ? (
                <Badge dot>Cruce</Badge>
              ) : live ? (
                <Badge dot>Ahora</Badge>
              ) : undefined
            }
          />
        </div>
        <button
          onClick={() => onToggleSave(talk)}
          aria-label={saved ? "Quitar de Mi Agenda" : "Guardar en Mi Agenda"}
          aria-pressed={saved}
          className={cn(
            "mt-2 flex-shrink-0 text-[17px] leading-none transition-transform active:scale-90",
            saved ? "text-brand-white" : "text-brand-dim/50",
          )}
        >
          {saved ? "★" : "☆"}
        </button>
      </div>
    </GlassCard>
  );
}

export default function AgendaClient({
  talks: serverTalks,
  edition,
  savedIds: initialSavedIds,
}: {
  talks: Talk[];
  edition: EditionInfo;
  savedIds: string[];
}) {
  const DAYS = editionDays(edition);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [talks, setTalks] = useState<Talk[]>(serverTalks);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(initialSavedIds),
  );
  const [tab, setTab] = useState<"toda" | "mia">("toda");
  const [auditorium, setAuditorium] = useState<string | null>(null);
  const [track, setTrack] = useState<string | null>(null);
  const [updatedBanner, setUpdatedBanner] = useState(false);
  const [justSavedFirst, setJustSavedFirst] = useState(false);

  // Reloj del badge "Ahora".
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Cache offline (adaptador storage): guarda lo fresco; si el server no
  // trajo nada (mala señal en el recinto), usa la última copia.
  useEffect(() => {
    let cancelled = false;
    if (serverTalks.length > 0) {
      void storage.set(CACHE_KEY, JSON.stringify(serverTalks));
      return;
    }
    void storage.get(CACHE_KEY).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const cached = JSON.parse(raw) as Talk[];
        if (cached.length > 0) setTalks(cached);
      } catch {
        /* cache corrupto: se ignora */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serverTalks]);

  // Realtime: cambios de sala/hora/cancelación se reflejan en vivo.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("agenda-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "talks" },
        (payload) => {
          setTalks((current) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id?: string };
              return current.filter((t) => t.id !== old.id);
            }
            const row = payload.new as Talk;
            const idx = current.findIndex((t) => t.id === row.id);
            if (idx === -1) return [...current, row];
            const next = [...current];
            next[idx] = { ...next[idx], ...row };
            return next;
          });
          setUpdatedBanner(true);
          setTimeout(() => setUpdatedBanner(false), 4000);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const toggleSave = useCallback(
    async (talk: Talk) => {
      hapticTap();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const isSaved = savedIds.has(talk.id);
      setSavedIds((s) => {
        const next = new Set(s);
        if (isSaved) next.delete(talk.id);
        else next.add(talk.id);
        return next;
      });

      if (isSaved) {
        await supabase
          .from("saved_talks")
          .delete()
          .eq("user_id", user.id)
          .eq("talk_id", talk.id);
      } else {
        if (savedIds.size === 0) setJustSavedFirst(true);
        await supabase.from("saved_talks").upsert(
          { user_id: user.id, talk_id: talk.id },
          { onConflict: "user_id,talk_id", ignoreDuplicates: true },
        );
      }
    },
    [savedIds],
  );

  // Día seleccionado.
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
  const firstWithTalks = DAYS.find((d) => talks.some((t) => t.day === d)) ?? 1;
  const [day, setDay] = useState<number>(() => todayDay ?? firstWithTalks);

  const auditoriums = useMemo(
    () =>
      [...new Set(talks.map((t) => t.auditorium).filter(Boolean))] as string[],
    [talks],
  );
  const tracks = useMemo(
    () => [...new Set(talks.map((t) => t.track).filter(Boolean))] as string[],
    [talks],
  );

  const savedTalks = useMemo(
    () =>
      talks
        .filter((t) => savedIds.has(t.id))
        .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? "")),
    [talks, savedIds],
  );
  const conflicts = useMemo(() => findConflicts(savedTalks), [savedTalks]);

  const shown =
    tab === "mia"
      ? savedTalks
      : talks
          .filter((t) => t.day === day)
          .filter((t) => !auditorium || t.auditorium === auditorium)
          .filter((t) => !track || t.track === track);

  return (
    <div className="flex flex-col">
      {updatedBanner && (
        <div className="mb-2 rounded-[12px] border border-brand-lav/50 bg-brand-lav/15 px-3 py-2 text-center text-[10.5px] font-bold text-brand-white">
          Agenda actualizada en vivo
        </div>
      )}

      {/* Tabs Toda / Mía */}
      <div className="mb-2 flex gap-2">
        <FilterChip active={tab === "toda"} onClick={() => setTab("toda")}>
          Toda la agenda
        </FilterChip>
        <FilterChip active={tab === "mia"} onClick={() => setTab("mia")}>
          ★ Mi Agenda ({savedIds.size})
        </FilterChip>
      </div>

      {tab === "toda" && (
        <>
          <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {DAYS.map((d) => (
              <FilterChip key={d} active={day === d} onClick={() => setDay(d)}>
                {todayDay === d ? `Hoy · Día ${d}` : `Día ${d}`}
              </FilterChip>
            ))}
          </div>
          {(auditoriums.length > 1 || tracks.length > 0) && (
            <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {auditoriums.map((a) => (
                <FilterChip
                  key={`a-${a}`}
                  active={auditorium === a}
                  onClick={() => setAuditorium(auditorium === a ? null : a)}
                >
                  {a}
                </FilterChip>
              ))}
              {tracks.map((tr) => (
                <FilterChip
                  key={`t-${tr}`}
                  active={track === tr}
                  onClick={() => setTrack(track === tr ? null : tr)}
                >
                  {tr}
                </FilterChip>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mia" && justSavedFirst && (
        <div className="mb-2">
          <PushOptIn reason="Te recordamos cada charla guardada 15 minutos antes, y te avisamos si cambia de sala u horario." />
        </div>
      )}

      {tab === "mia" && conflicts.size > 0 && (
        <p className="mb-2 text-[10.5px] font-semibold text-amber-300">
          Tienes charlas que se cruzan en horario.
        </p>
      )}

      {shown.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={
              tab === "mia" ? (
                <Star className="h-6 w-6" aria-hidden />
              ) : (
                <CalendarDays className="h-6 w-6" aria-hidden />
              )
            }
            title={
              tab === "mia" ? "Tu agenda está vacía" : "Sin charlas para este día"
            }
            subtitle={
              tab === "mia"
                ? "Toca la estrella ☆ de cualquier charla para armar tu itinerario personal."
                : "Aún no hay conferencias programadas en la agenda de este día. Vuelve pronto."
            }
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          {shown.map((t) => (
            <TalkCard
              key={t.id}
              talk={t}
              nowMs={nowMs}
              saved={savedIds.has(t.id)}
              conflicted={tab === "mia" && conflicts.has(t.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[10.5px] font-medium text-brand-muted">
        {tab === "mia"
          ? "Te recordamos cada charla 15 minutos antes por notificación"
          : "Toca una charla para ver el detalle del ponente · ☆ la guarda en Mi Agenda"}
      </p>
    </div>
  );
}
