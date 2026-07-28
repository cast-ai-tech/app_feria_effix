"use client";

import { createContext, useCallback, useContext, useReducer } from "react";
import MiniPlayerHost from "@/components/player/MiniPlayerHost";

/**
 * Primer Context/Provider global de la app (Fase 27). Mantiene UNA sola
 * instancia de reproductor viva en todo momento (ver MiniPlayerHost), para
 * que minimizar/expandir/navegar entre pantallas nunca reinicie el video.
 *
 * IMPORTANTE: ningún consumidor de este contexto debe llamar
 * router.refresh() — está montado en el layout raíz y refrescaría la ruta
 * activa que sea, incluso con el video sonando minimizado en otra sección.
 */

export type MiniPlayerVideo = {
  recordingId: string;
  videoId: string;
  title: string;
  speakerName?: string | null;
  initialSeconds: number;
  durationSeconds: number;
};

export type PlayerUiState =
  | "idle"
  | "buffering"
  | "playing"
  | "paused"
  | "ended";

type Mode = "closed" | "expanded" | "minimized";

type State = {
  mode: Mode;
  current: MiniPlayerVideo | null;
  uiState: PlayerUiState;
};

type Action =
  | { type: "OPEN"; payload: MiniPlayerVideo }
  | { type: "MINIMIZE" }
  | { type: "EXPAND" }
  | { type: "CLOSE" }
  | { type: "SET_UI_STATE"; uiState: PlayerUiState };

const initialState: State = { mode: "closed", current: null, uiState: "idle" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { mode: "expanded", current: action.payload, uiState: "idle" };
    case "MINIMIZE":
      return state.current ? { ...state, mode: "minimized" } : state;
    case "EXPAND":
      return state.current ? { ...state, mode: "expanded" } : state;
    case "CLOSE":
      return initialState;
    case "SET_UI_STATE":
      return { ...state, uiState: action.uiState };
    default:
      return state;
  }
}

type MiniPlayerContextValue = {
  mode: Mode;
  current: MiniPlayerVideo | null;
  uiState: PlayerUiState;
  open: (video: MiniPlayerVideo) => void;
  minimize: () => void;
  expand: () => void;
  close: () => void;
  setUiState: (uiState: PlayerUiState) => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

export function useMiniPlayer(): MiniPlayerContextValue {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) {
    throw new Error("useMiniPlayer debe usarse dentro de <MiniPlayerProvider>");
  }
  return ctx;
}

export default function MiniPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const open = useCallback((video: MiniPlayerVideo) => {
    dispatch({ type: "OPEN", payload: video });
  }, []);
  const minimize = useCallback(() => dispatch({ type: "MINIMIZE" }), []);
  const expand = useCallback(() => dispatch({ type: "EXPAND" }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const setUiState = useCallback(
    (uiState: PlayerUiState) => dispatch({ type: "SET_UI_STATE", uiState }),
    [],
  );

  // Sin useMemo manual: el React Compiler del proyecto memoiza esto solo,
  // y evita el conflicto entre exhaustive-deps (quiere `state` completo) y
  // preserve-manual-memoization (quiere los campos sueltos).
  const value: MiniPlayerContextValue = {
    mode: state.mode,
    current: state.current,
    uiState: state.uiState,
    open,
    minimize,
    expand,
    close,
    setUiState,
  };

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
      {/* Montado solo mientras haya un video abierto; se mantiene vivo
          entre minimizar/expandir/cambiar de video, se desmonta en close(). */}
      {state.current && (
        <MiniPlayerHost
          video={state.current}
          mode={state.mode as "expanded" | "minimized"}
          uiState={state.uiState}
          onMinimize={minimize}
          onExpand={expand}
          onClose={close}
          onUiStateChange={setUiState}
        />
      )}
    </MiniPlayerContext.Provider>
  );
}
