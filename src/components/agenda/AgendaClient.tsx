"use client";

import {
  Ban,
  CalendarDays,
  CalendarPlus,
  Clock,
  Star,
  Trash2,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import GlassCard from "@/components/GlassCard";
import ListItem from "@/components/ListItem";
import PushOptIn from "@/components/PushOptIn";
import { Field, TextAreaField } from "@/components/Field";
import { cn } from "@/lib/cn";
import { editionDays, type EditionInfo } from "@/lib/editions";
import {
  bogotaDateKey,
  dateChipLabel,
  defaultDateKey,
} from "@/lib/agendaDates";
import { auditoriumColor } from "@/lib/auditoriumColors";
import { createClient } from "@/lib/supabase/client";
import { storage } from "@/lib/platform/storage";
import { hapticTap } from "@/lib/platform/haptics";
import DayCalendar from "@/components/agenda/DayCalendar";
import {
  scheduleTalkReminder,
  cancelTalkReminder,
} from "@/lib/platform/notifications";
import { createUserEvent, deleteUserEvent } from "@/app/agenda/actions";

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

/** Cita personal (networking/negocios — Fase 30). */
export type UserEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
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
                <span
                  className="live-dot h-3 w-3 rounded-full bg-red-500"
                  aria-hidden
                />
              ) : (
                <Clock
                  className="h-[18px] w-[18px] text-brand-white"
                  aria-hidden
                />
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
  reminderLeadMinutes,
  userEvents,
  isLoggedIn,
}: {
  talks: Talk[];
  edition: EditionInfo;
  savedIds: string[];
  reminderLeadMinutes: number;
  /** Citas personales del usuario (vacío sin sesión). */
  userEvents: UserEvent[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const DAYS = editionDays(edition);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [talks, setTalks] = useState<Talk[]>(serverTalks);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(initialSavedIds),
  );
  const [tab, setTab] = useState<"toda" | "mia">("toda");
  // Vista de la agenda (Fase 30): lista clásica u horario visual (bloques
  // por hora — el "calendario de la feria" dentro de la app).
  const [view, setView] = useState<"lista" | "horario">("horario");
  const [auditorium, setAuditorium] = useState<string | null>(null);
  // Con ~13 auditorios la cuadrícula colapsa a los primeros y un "Ver
  // todos" — el filtro seleccionado siempre queda visible.
  const [showAllAuditoriums, setShowAllAuditoriums] = useState(false);
  const [track, setTrack] = useState<string | null>(null);
  const [updatedBanner, setUpdatedBanner] = useState(false);
  const [justSavedFirst, setJustSavedFirst] = useState(false);

  // Mi Agenda (Fase 30): fecha seleccionada (null = automática) y estado
  // del formulario de nueva cita personal.
  const [miaDate, setMiaDate] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evNotes, setEvNotes] = useState("");
  const [evBusy, setEvBusy] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  const savedIdsRef = useRef(savedIds);
  useEffect(() => {
    savedIdsRef.current = savedIds;
  }, [savedIds]);

  // Alarma local (no-op en web): solo tiene sentido si la charla sigue
  // activa y con hora de inicio.
  const syncReminder = useCallback(
    (talk: Talk) => {
      if (talk.status === "cancelled" || !talk.starts_at) {
        void cancelTalkReminder(talk.id);
        return;
      }
      void scheduleTalkReminder(
        {
          id: talk.id,
          title: talk.title,
          startsAt: talk.starts_at,
          auditorium: talk.auditorium,
        },
        reminderLeadMinutes,
      );
    },
    [reminderLeadMinutes],
  );

  // Al montar: re-programa la alarma de cada charla ya guardada (cubre
  // reinstalación de la app o un segundo dispositivo) — idempotente por el
  // ID determinista de talkReminderId.
  useEffect(() => {
    const savedSet = new Set(initialSavedIds);
    for (const talk of serverTalks) {
      if (savedSet.has(talk.id)) syncReminder(talk);
    }
    // Solo al montar: initialSavedIds/serverTalks son los props del server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old.id && savedIdsRef.current.has(old.id)) {
              void cancelTalkReminder(old.id);
            }
            setTalks((current) => current.filter((t) => t.id !== old.id));
            setUpdatedBanner(true);
            setTimeout(() => setUpdatedBanner(false), 4000);
            return;
          }
          const row = payload.new as Talk;
          setTalks((current) => {
            const idx = current.findIndex((t) => t.id === row.id);
            if (idx === -1) return [...current, row];
            const next = [...current];
            next[idx] = { ...next[idx], ...row };
            return next;
          });
          // Cambió hora/sala/estado de una charla guardada: re-programa su
          // alarma local (mismo criterio que notifica el push remoto en
          // admin/agenda/actions.ts para quienes la guardaron).
          if (savedIdsRef.current.has(row.id)) syncReminder(row);
          setUpdatedBanner(true);
          setTimeout(() => setUpdatedBanner(false), 4000);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSave = useCallback(
    async (talk: Talk) => {
      hapticTap();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/ingresar?next=/agenda");
        return;
      }

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
        void cancelTalkReminder(talk.id);
      } else {
        if (savedIds.size === 0) setJustSavedFirst(true);
        await supabase
          .from("saved_talks")
          .upsert(
            { user_id: user.id, talk_id: talk.id },
            { onConflict: "user_id,talk_id", ignoreDuplicates: true },
          );
        syncReminder(talk);
      }
    },
    [savedIds, router, syncReminder],
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
  const todayStr = new Date(nowMs).toLocaleDateString("en-CA", {
    timeZone: TZ,
  });
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

  // Citas personales como pseudo-charlas para reusar la vista Horario.
  // canStar del DayCalendar las excluye de la estrella (no son charlas).
  const citaIds = useMemo(
    () => new Set(userEvents.map((e) => e.id)),
    [userEvents],
  );
  const citaTalks: Talk[] = useMemo(
    () =>
      userEvents.map((e) => ({
        id: e.id,
        title: e.title,
        description: null,
        speaker_id: null,
        speaker_name: e.notes,
        auditorium: e.location,
        track: null,
        day: null,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        status: "active",
      })),
    [userEvents],
  );

  // Fechas con contenido en Mi Agenda (charlas guardadas + citas), en
  // fechas reales — post-evento incluido.
  const miaAll = useMemo(
    () =>
      [...savedTalks, ...citaTalks]
        .filter((t) => !!t.starts_at)
        .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!)),
    [savedTalks, citaTalks],
  );
  const miaDates = useMemo(
    () => [...new Set(miaAll.map((t) => bogotaDateKey(t.starts_at!)))],
    [miaAll],
  );
  const effectiveMiaDate =
    miaDate && miaDates.includes(miaDate)
      ? miaDate
      : defaultDateKey(miaDates, todayStr);
  const miaDayItems = useMemo(
    () =>
      miaAll.filter((t) => bogotaDateKey(t.starts_at!) === effectiveMiaDate),
    [miaAll, effectiveMiaDate],
  );

  async function handleCreateEvent() {
    setEvBusy(true);
    setEvError(null);
    const fd = new FormData();
    fd.set("title", evTitle);
    fd.set("date", evDate);
    fd.set("start_time", evStart);
    fd.set("end_time", evEnd);
    fd.set("location", evLocation);
    fd.set("notes", evNotes);
    const res = await createUserEvent(fd);
    setEvBusy(false);
    if (!res.ok) {
      setEvError(res.error ?? "No se pudo crear la cita.");
      return;
    }
    setShowEventForm(false);
    setEvTitle("");
    setEvDate("");
    setEvStart("");
    setEvEnd("");
    setEvLocation("");
    setEvNotes("");
    router.refresh();
  }

  async function handleDeleteEvent(id: string) {
    await deleteUserEvent(id);
    router.refresh();
  }

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
            <span aria-hidden className="my-auto h-5 w-px bg-white/15" />
            <FilterChip
              active={view === "horario"}
              onClick={() => setView("horario")}
            >
              Horario
            </FilterChip>
            <FilterChip
              active={view === "lista"}
              onClick={() => setView("lista")}
            >
              Lista
            </FilterChip>
          </div>
          {/* Filtro GRÁFICO por auditorio (Fase 30): cuadrícula fija (todos
              visibles, sin scroll oculto), cada auditorio con el color de
              su pabellón en el plano del recinto — el mismo color que pinta
              sus bloques en la vista Horario. */}
          {auditoriums.length > 1 && (
            <div className="mb-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuditorium(null)}
                className={cn(
                  "col-span-2 rounded-[12px] border px-3 py-2.5 text-[11px] font-extrabold transition-colors duration-150 active:scale-[0.98]",
                  !auditorium
                    ? "border-white bg-brand-white text-black"
                    : "border-white/20 text-brand-dim",
                )}
              >
                Todos los auditorios
              </button>
              {(showAllAuditoriums || auditoriums.length <= 6
                ? auditoriums
                : [
                    ...auditoriums.slice(0, 5),
                    // El seleccionado nunca se esconde detrás del "Ver todos".
                    ...(auditorium &&
                    !auditoriums.slice(0, 5).includes(auditorium)
                      ? [auditorium]
                      : []),
                  ]
              ).map((a) => {
                const c = auditoriumColor(a, auditoriums);
                const active = auditorium === a;
                return (
                  <button
                    key={`a-${a}`}
                    type="button"
                    onClick={() => setAuditorium(active ? null : a)}
                    className={cn(
                      "flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left text-[10.5px] font-bold leading-tight transition-colors duration-150 active:scale-[0.98]",
                      active ? "text-brand-white" : "text-brand-dim",
                    )}
                    style={
                      active
                        ? { borderColor: c, backgroundColor: `${c}2e` }
                        : { borderColor: `${c}55` }
                    }
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: c }}
                    />
                    <span className="min-w-0 truncate">{a}</span>
                  </button>
                );
              })}
              {auditoriums.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllAuditoriums((s) => !s)}
                  className="col-span-2 rounded-[12px] border border-dashed border-white/25 px-3 py-2 text-[10.5px] font-bold text-brand-muted active:scale-[0.98]"
                >
                  {showAllAuditoriums
                    ? "Ver menos"
                    : `Ver los ${auditoriums.length} auditorios`}
                </button>
              )}
            </div>
          )}
          {tracks.length > 0 && (
            <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
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

      {/* Mi Agenda (Fase 30): calendario personal DENTRO de la app —
          charlas guardadas + citas propias, navegable por fecha real
          (post-evento incluido). Sin sincronización externa. */}
      {tab === "mia" && (
        <>
          <div className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {view === "horario" &&
              miaDates.map((k) => (
                <FilterChip
                  key={k}
                  active={k === effectiveMiaDate}
                  onClick={() => setMiaDate(k)}
                >
                  {k === todayStr
                    ? `Hoy · ${dateChipLabel(k)}`
                    : dateChipLabel(k)}
                </FilterChip>
              ))}
            {miaDates.length > 0 && (
              <span aria-hidden className="my-auto h-5 w-px bg-white/15" />
            )}
            <FilterChip
              active={view === "horario"}
              onClick={() => setView("horario")}
            >
              Horario
            </FilterChip>
            <FilterChip
              active={view === "lista"}
              onClick={() => setView("lista")}
            >
              Lista
            </FilterChip>
          </div>

          {isLoggedIn && !showEventForm && (
            <button
              type="button"
              onClick={() => setShowEventForm(true)}
              className="mb-2 flex items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 py-2.5 text-[11px] font-extrabold text-brand-white active:scale-95"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Nueva cita (networking / negocios)
            </button>
          )}

          {showEventForm && (
            <GlassCard className="mb-2 flex flex-col gap-3 p-4">
              <p className="text-[12px] font-extrabold text-brand-white">
                Nueva cita
              </p>
              <Field
                label="Título"
                name="ev_title"
                value={evTitle}
                onChange={setEvTitle}
                placeholder="Reunión con proveedor…"
              />
              <Field
                label="Fecha"
                name="ev_date"
                type="date"
                value={evDate}
                onChange={setEvDate}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Field
                    label="Inicio"
                    name="ev_start"
                    type="time"
                    value={evStart}
                    onChange={setEvStart}
                  />
                </div>
                <div className="flex-1">
                  <Field
                    label="Fin (opcional)"
                    name="ev_end"
                    type="time"
                    value={evEnd}
                    onChange={setEvEnd}
                  />
                </div>
              </div>
              <Field
                label="Lugar (opcional)"
                name="ev_location"
                value={evLocation}
                onChange={setEvLocation}
                placeholder="Stand 42, café del hall…"
              />
              <TextAreaField
                label="Notas (opcional)"
                name="ev_notes"
                value={evNotes}
                onChange={setEvNotes}
                placeholder="Con quién, de qué…"
              />
              {evError && (
                <p className="text-[11px] font-semibold text-red-300">
                  {evError}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setShowEventForm(false);
                    setEvError(null);
                  }}
                  disabled={evBusy}
                >
                  Cancelar
                </Button>
                <Button fullWidth onClick={handleCreateEvent} disabled={evBusy}>
                  {evBusy ? "Guardando…" : "Guardar cita"}
                </Button>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {tab === "mia" ? (
        <>
          {miaAll.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Star className="h-6 w-6" aria-hidden />}
                title="Tu agenda está vacía"
                subtitle="Guarda charlas con la estrella ☆ o crea una cita de networking — este es tu calendario personal de la feria, durante y después del evento."
              />
            </div>
          ) : view === "horario" ? (
            <div className="mt-2">
              <DayCalendar
                talks={miaDayItems}
                nowMs={nowMs}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                canStar={(t) => !citaIds.has(t.id)}
              />
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2.5">
              {savedTalks.map((t) => (
                <TalkCard
                  key={t.id}
                  talk={t}
                  nowMs={nowMs}
                  saved={savedIds.has(t.id)}
                  conflicted={conflicts.has(t.id)}
                  onToggleSave={toggleSave}
                />
              ))}
              {userEvents.map((e) => (
                <GlassCard
                  key={e.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-extrabold text-brand-white">
                      {e.title}
                    </p>
                    <p className="text-[10px] font-semibold tabular-nums text-brand-muted">
                      {dateChipLabel(bogotaDateKey(e.starts_at))} ·{" "}
                      {new Date(e.starts_at).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: TZ,
                      })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    {e.notes && (
                      <p className="truncate text-[10px] text-brand-dim">
                        {e.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(e.id)}
                    aria-label={`Eliminar cita: ${e.title}`}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-brand-muted active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      ) : shown.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
            title="Sin charlas para este día"
            subtitle="Aún no hay conferencias programadas en la agenda de este día. Vuelve pronto."
          />
        </div>
      ) : view === "horario" && shown.some((t) => !!t.starts_at) ? (
        <div className="mt-2">
          <DayCalendar
            talks={shown}
            nowMs={nowMs}
            savedIds={savedIds}
            onToggleSave={toggleSave}
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
              conflicted={false}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[10.5px] font-medium text-brand-muted">
        {tab === "mia"
          ? "Te recordamos charlas y citas 15 minutos antes por notificación"
          : "Toca una charla para ver el detalle del ponente · ☆ la guarda en Mi Agenda"}
      </p>
    </div>
  );
}
