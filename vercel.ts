import type { VercelConfig } from "@vercel/config/v1";

/**
 * Vercel Crons de la app:
 *  - reminders: push 15 min antes de cada charla guardada (Fase 17).
 *  - tiquetera-sync: relee ventas del día vía API de La Tiquetera y
 *    hace upsert de compradores en `tickets` (no hay webhooks, ver
 *    src/lib/tiquetera.ts).
 * Ambos exigen Authorization: Bearer ${CRON_SECRET}, que Vercel Cron
 * añade automáticamente si la variable CRON_SECRET está definida.
 */
export const config: VercelConfig = {
  crons: [
    { path: "/api/cron/reminders", schedule: "*/5 * * * *" },
    { path: "/api/cron/tiquetera-sync", schedule: "0 * * * *" },
  ],
};
