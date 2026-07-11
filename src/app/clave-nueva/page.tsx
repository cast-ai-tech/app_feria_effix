"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import { Field } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Pantalla a la que llega el usuario tras el enlace de recuperación
 * (el callback ya estableció una sesión temporal de recovery).
 */
export default function ClaveNuevaPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/perfil"), 1200);
  }

  if (!configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Nueva contraseña" backHref="/ingresar" />
        <SupabaseNotice />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Nueva contraseña"
        subtitle="Elige una contraseña nueva para tu cuenta"
      />
      <GlassCard className="p-5">
        {done ? (
          <p className="text-center text-[12px] font-bold text-brand-white">
            ✅ Contraseña actualizada. Redirigiendo…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Nueva contraseña"
              name="password"
              type="password"
              required
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            {error && (
              <p className="text-[11px] font-semibold text-red-300">{error}</p>
            )}
            <Button type="submit" fullWidth size="md" disabled={loading}>
              {loading ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
