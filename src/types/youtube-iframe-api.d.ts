/**
 * Tipos ambientales mínimos de la YouTube IFrame Player API (Fase 27).
 * Solo cubre la superficie que usa src/components/player/MiniPlayerHost.tsx.
 * No existe @types/youtube instalado a propósito (el repo no usa @types/*
 * de terceros hoy) — se declara a mano lo que se necesita.
 * https://developers.google.com/youtube/iframe_api_reference
 */

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface OnStateChangeEvent {
    data: PlayerState;
    target: Player;
  }

  interface PlayerEvent {
    target: Player;
  }

  interface PlayerVars {
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    iv_load_policy?: 1 | 3;
    autoplay?: 0 | 1;
    origin?: string;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: PlayerEvent & { data: number }) => void;
    };
  }

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    getDuration(): number;
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    getIframe(): HTMLIFrameElement;
    loadVideoById(videoId: string, startSeconds?: number): void;
    destroy(): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
