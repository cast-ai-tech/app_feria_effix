"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import { Field } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { translateAuthError } from "@/lib/authErrors";

/**
 * Pantalla a la que llega el usuario tras el enlace de recuperación
 * (el callback ya estableció una sesión temporal de recovery).
 * Fase 21 (#18): guardia de sesión — sin sesión de recovery no hay form.
 */
export default function ClaveNuevaPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionState, setSessionState] = useState<
    "checking" | "ok" | "missing"
  >("checking");

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionState(user ? "ok" : "missing");
    });
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
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
        {sessionState === "checking" ? (
          <p className="text-center text-[11px] text-brand-muted">
            Verificando el enlace…
          </p>
        ) : sessionState === "missing" ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-[12px] font-extrabold text-brand-white">
              El enlace expiró o no es válido
            </p>
            <p className="text-[10.5px] leading-relaxed text-brand-muted">
              Por seguridad, los enlaces de recuperación caducan. Pide uno
              nuevo y ábrelo desde este mismo dispositivo.
            </p>
            <Link
              href="/recuperar"
              className="text-[11px] font-bold text-brand-lav underline"
            >
              Pedir un enlace nuevo →
            </Link>
          </div>
        ) : done ? (
          <p className="text-center text-[12px] font-bold text-brand-white">
            Contraseña actualizada ✓ Redirigiendo…
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
