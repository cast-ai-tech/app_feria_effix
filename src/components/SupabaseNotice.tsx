import GlassCard from "@/components/GlassCard";

/**
 * Aviso que se muestra cuando Supabase aún no está configurado
 * (faltan credenciales en .env.local). Evita pantallas rotas.
 */
export default function SupabaseNotice() {
  return (
    <GlassCard className="p-5">
      <p className="text-[13px] font-extrabold text-brand-white">
        Conecta Supabase para activar las cuentas
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-brand-muted">
        El registro y el inicio de sesión necesitan un proyecto de Supabase.
        Crea uno gratis en supabase.com, copia la <b>URL</b> y la{" "}
        <b>anon key</b> a tu archivo <code>.env.local</code>, ejecuta el script{" "}
        <code>supabase/schema.sql</code> y reinicia el servidor.
      </p>
    </GlassCard>
  );
}
