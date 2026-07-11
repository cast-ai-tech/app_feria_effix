import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Cliente de Supabase con SERVICE ROLE — SOLO servidor.
 * Salta la RLS: úsalo únicamente en server actions / route handlers del panel
 * admin (importar CSV, asignar Black, reembolsos, transferencias), y SIEMPRE
 * después de verificar que quien llama es admin.
 *
 * NUNCA importar este módulo desde un componente cliente.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "Supabase service role no configurado (SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
