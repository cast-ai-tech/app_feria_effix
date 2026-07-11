/**
 * Lectura y validación de las credenciales de Supabase.
 *
 * Mientras no exista un proyecto Supabase configurado (variables vacías en
 * .env.local), `isSupabaseConfigured()` devuelve false y la app evita tocar
 * Supabase — así el resto de la app sigue funcionando sin romperse.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
