/**
 * Cache local de la Credencial Effix (Fase 14) — para renderizarla OFFLINE.
 * Igual que ticketStore: pasa por el adaptador de plataforma.
 */

import { storage } from "@/lib/platform/storage";

const KEY = "efx.credencial.v1";

export type CachedCredencial = {
  connectCode: string;
  fullName: string;
  role: string | null;
  country: string | null;
  /** Tier visual si hay boleta vigente ('general'|'vip'|'black'|'diaria'). */
  tier: string | null;
  tierLabel: string | null;
  cachedAt: number;
};

export async function cacheCredencial(
  data: Omit<CachedCredencial, "cachedAt">,
): Promise<void> {
  await storage.set(KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
}

export async function loadCachedCredencial(): Promise<CachedCredencial | null> {
  const raw = await storage.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedCredencial;
  } catch {
    return null;
  }
}

export async function clearCachedCredencial(): Promise<void> {
  await storage.remove(KEY);
}
