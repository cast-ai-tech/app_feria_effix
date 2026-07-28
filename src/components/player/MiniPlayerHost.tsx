"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadYoutubeIframeApi } from "@/lib/youtubePlayerLoader";
import {
  buildWatchProgressPayload,
  formatTime,
  shouldPersistTick,
} from "@/lib/watchProgress";
import { cn } from "@/lib/cn";
import type {
  MiniPlayerVideo,
  PlayerUiState,
} from "@/components/player/MiniPlayerProvider";

const STATE_MAP: Record<number, PlayerUiState> = {
  [-1]: "idle",
  0: "ended",
  1: "playing",
  2: "paused",
  3: "buffering",
  5: "idle",
};

/**
 * Única instancia de YT.Player de toda la app. El <div> del mount NUNCA se
 * desmonta al alternar expandido/minimizado — solo cambian las clases del
 * contenedor que lo envuelve. Al abrir un video distinto mientras ya hay uno
 * cargado, reutiliza la misma instancia (loadVideoById) en vez de recrearla.
 *
 * Regla dura: este archivo NUNCA llama router.refresh() — vive en el layout
 * raíz y refrescaría lo que sea que esté activo en ese momento.
 */
export default function MiniPlayerHost({
  video,
  mode,
  uiState,
  onMinimize,
  onExpand,
  onClose,
  onUiStateChange,
}: {
  video: MiniPlayerVideo;
  mode: "expanded" | "minimized";
  uiState: PlayerUiState;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  onUiStateChange: (state: PlayerUiState) => void;
}) {
  const mountElRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const loadedRecordingIdRef = useRef<string | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastPersistedAtRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const videoRef = useRef(video);
  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  const [displayTime, setDisplayTime] = useState(video.initialSeconds);
  const [duration, setDuration] = useState(video.durationSeconds);
  const [muted, setMuted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  // No cambia durante la vida del componente (siempre se monta client-side,
  // nunca en el HTML del servidor) — se puede leer directo, sin efecto/estado.
  const fullscreenAvailable =
    typeof document !== "undefined" && document.fullscreenEnabled;

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });
  }, []);

  const persistNow = useCallback((opts?: { completed?: boolean }) => {
    const userId = userIdRef.current;
    const recordingId = loadedRecordingIdRef.current;
    if (!userId || !recordingId) return;
    const payload = buildWatchProgressPayload({
      userId,
      recordingId,
      seconds: currentTimeRef.current,
      durationSeconds: durationRef.current,
      completed: opts?.completed,
    });
    lastPersistedAtRef.current = Date.now();
    const supabase = createClient();
    void supabase
      .from("watch_progress")
      .upsert(payload, { onConflict: "user_id,recording_id" });
  }, []);

  // Crea la instancia (una vez) o cambia de video (loadVideoById).
  useEffect(() => {
    let cancelled = false;

    async function ensurePlayer() {
      const YTApi = await loadYoutubeIframeApi();
      if (cancelled || !mountElRef.current) return;

      if (!playerRef.current) {
        playerRef.current = new YTApi.Player(mountElRef.current, {
          videoId: videoRef.current.videoId,
          playerVars: {
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            autoplay: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              const player = playerRef.current;
              if (!player) return;
              const dur = player.getDuration();
              durationRef.current = dur;
              setDuration(dur);
              loadedRecordingIdRef.current = videoRef.current.recordingId;
              currentTimeRef.current = videoRef.current.initialSeconds;
              const resumeAt = videoRef.current.initialSeconds;
              if (resumeAt > 0 && dur > 0 && resumeAt < dur - 5) {
                player.seekTo(resumeAt, true);
              }
              persistNow();
            },
            onStateChange: (event) => {
              const next = STATE_MAP[event.data] ?? "idle";
              onUiStateChange(next);
              if (next === "paused") persistNow();
              if (next === "ended") persistNow({ completed: true });
            },
          },
        });
      } else if (
        loadedRecordingIdRef.current !== videoRef.current.recordingId
      ) {
        // Cambiar de video: primero flush del que sale, luego cargar el nuevo.
        persistNow();
        loadedRecordingIdRef.current = videoRef.current.recordingId;
        currentTimeRef.current = videoRef.current.initialSeconds;
        durationRef.current = videoRef.current.durationSeconds;
        setDisplayTime(videoRef.current.initialSeconds);
        setDuration(videoRef.current.durationSeconds);
        playerRef.current.loadVideoById(
          videoRef.current.videoId,
          videoRef.current.initialSeconds > 5
            ? videoRef.current.initialSeconds
            : undefined,
        );
      }
    }

    void ensurePlayer();
    return () => {
      cancelled = true;
    };
  }, [video.recordingId, onUiStateChange, persistNow]);

  // Poll de progreso mientras reproduce (1x/seg): actualiza UI y persiste
  // (con throttle) sin nunca llamar router.refresh().
  useEffect(() => {
    if (uiState !== "playing") return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      const d = player.getDuration();
      currentTimeRef.current = t;
      if (d > 0) durationRef.current = d;
      if (!dragging) {
        setDisplayTime(t);
        if (d > 0) setDuration(d);
      }
      if (shouldPersistTick(lastPersistedAtRef.current, Date.now())) {
        persistNow();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [uiState, dragging, persistNow]);

  // Flush inmediato si la app pasa a segundo plano (más confiable que
  // beforeunload en iOS Safari).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) persistNow();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [persistNow]);

  // Flush final + destruir la instancia solo al desmontar (close()).
  useEffect(() => {
    return () => {
      persistNow();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (uiState === "playing") player.pauseVideo();
    else player.playVideo();
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }

  function requestFullscreen() {
    playerRef.current
      ?.getIframe()
      ?.requestFullscreen?.()
      .catch(() => {});
  }

  function commitSeek(value: number) {
    playerRef.current?.seekTo(value, true);
    currentTimeRef.current = value;
    setDisplayTime(value);
    setDragging(false);
  }

  const shownTime = dragging ? dragValue : displayTime;

  const wrapperClasses =
    mode === "expanded"
      ? "fixed inset-0 z-50 flex flex-col bg-black/95"
      : cn(
          "fixed z-40 h-[104px] w-[176px] overflow-hidden rounded-[14px]",
          "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4",
          "border border-white/[0.12] bg-gradient-to-br from-white/[0.07] to-brand-lav/10",
          "backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
        );

  return createPortal(
    <div className={wrapperClasses}>
      <div
        className="relative h-full w-full"
        onClick={mode === "minimized" ? onExpand : undefined}
        role={mode === "minimized" ? "button" : undefined}
        tabIndex={mode === "minimized" ? 0 : undefined}
        aria-label={
          mode === "minimized" ? `Expandir: ${video.title}` : undefined
        }
      >
        <div ref={mountElRef} className="absolute inset-0 h-full w-full" />

        {mode === "expanded" && (
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400",
                    uiState === "playing" && "live-dot",
                  )}
                  aria-hidden
                />
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {video.title}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onMinimize}
                  aria-label="Minimizar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-white active:scale-95"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-white active:scale-95"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex flex-col gap-2 p-4">
              {duration > 0 && (
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={1}
                  value={shownTime}
                  onChange={(e) => {
                    setDragging(true);
                    setDragValue(Number(e.target.value));
                  }}
                  onMouseUp={(e) => commitSeek(Number(e.currentTarget.value))}
                  onTouchEnd={(e) => commitSeek(Number(e.currentTarget.value))}
                  aria-label="Buscar en el video"
                  className="w-full accent-brand-white"
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={uiState === "playing" ? "Pausar" : "Reproducir"}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-white text-black active:scale-95"
                  >
                    {uiState === "playing" ? (
                      <Pause className="h-5 w-5" aria-hidden />
                    ) : (
                      <Play className="ml-0.5 h-5 w-5" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={muted ? "Activar sonido" : "Silenciar"}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-white active:scale-95"
                  >
                    {muted ? (
                      <VolumeX className="h-4 w-4" aria-hidden />
                    ) : (
                      <Volume2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <span className="text-[10.5px] font-medium text-brand-muted">
                    {formatTime(shownTime)} / {formatTime(duration)}
                  </span>
                </div>
                {fullscreenAvailable && (
                  <button
                    type="button"
                    onClick={requestFullscreen}
                    aria-label="Pantalla completa"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-white active:scale-95"
                  >
                    <Maximize className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "minimized" && (
          <div className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Cerrar"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-brand-white active:scale-95"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
            <div className="flex items-center justify-between gap-1">
              <p className="line-clamp-1 flex-1 text-[9.5px] font-bold text-brand-white">
                {video.title}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={uiState === "playing" ? "Pausar" : "Reproducir"}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-white text-black active:scale-95"
              >
                {uiState === "playing" ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
