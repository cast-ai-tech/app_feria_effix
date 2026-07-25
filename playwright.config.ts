import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de los flujos críticos (Fase 13).
 *
 * Requisitos para correr en local:
 *   1. Supabase local arriba (npx supabase start) con las migraciones aplicadas.
 *   2. Usuario de prueba: asistente@test.local / prueba123 con boleta activa
 *      de la edición en curso (ver README / seed de pruebas).
 *   3. App corriendo (npm run dev) — o Playwright la levanta solo.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Pixel 5"], // la app es una PWA móvil (max 440px); Chromium
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
