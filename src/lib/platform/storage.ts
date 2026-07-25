/**
 * Adaptador de almacenamiento clave/valor — capa de plataforma.
 *
 * REGLA DEL REPO: ningún componente usa APIs del navegador directamente;
 * siempre pasa por estos adaptadores. Hoy la implementación es web
 * (localStorage); en la Fase 22 se sustituye por @capacitor/preferences
 * con detección de plataforma, SIN tocar la UI.
 *
 * La interfaz es async a propósito: los plugins nativos lo son.
 */

export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Implementación web sobre localStorage. Tolerante a SSR y modo privado. */
class WebStorage implements KeyValueStorage {
  private available(): boolean {
    return typeof window !== "undefined" && !!window.localStorage;
  }

  async get(key: string): Promise<string | null> {
    if (!this.available()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.available()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Cuota llena o modo privado: la app sigue funcionando online.
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.available()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  }
}

export const storage: KeyValueStorage = new WebStorage();
