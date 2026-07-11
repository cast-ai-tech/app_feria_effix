"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import GoogleButton from "@/components/GoogleButton";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import { Field } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function IngresarPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/perfil");
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Iniciar sesión" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Iniciar sesión"
        subtitle="Bienvenido de nuevo"
        backHref="/"
      />

      <GlassCard className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            required
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {error && (
            <p className="text-[11px] font-semibold text-red-300">{error}</p>
          )}

          <Button type="submit" fullWidth size="md" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <div className="mt-3 text-right">
          <Link
            href="/recuperar"
            className="text-[10.5px] font-semibold text-brand-muted"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-bold text-brand-muted">o</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleButton label="Continuar con Google" />

        <p className="mt-5 text-center text-[11px] text-brand-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-brand-white">
            Regístrate
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
