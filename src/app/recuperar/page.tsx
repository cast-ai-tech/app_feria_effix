"use client";

import { MailCheck } from "lucide-react";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import { Field } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { translateAuthError } from "@/lib/authErrors";

export default function RecuperarPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/clave-nueva`,
    });

    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setSent(true);
  }

  if (!configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Recuperar contraseña" backHref="/ingresar" />
        <SupabaseNotice />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Recuperar contraseña"
        subtitle="Te enviaremos un enlace para restablecerla"
        backHref="/ingresar"
      />

      {sent ? (
        <GlassCard sheen className="p-6 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-brand-white" aria-hidden />
          <p className="mt-2 text-[13px] font-extrabold text-brand-white">
            Enlace enviado
          </p>
          <p className="mt-2 text-[11.5px] text-brand-muted">
            Revisa <b className="text-brand-dim">{email}</b> y sigue el enlace
            para crear una nueva contraseña.
          </p>
        </GlassCard>
      ) : (
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
            {error && (
              <p className="text-[11px] font-semibold text-red-300">{error}</p>
            )}
            <Button type="submit" fullWidth size="md" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
          <p className="mt-5 text-center text-[11px] text-brand-muted">
            <Link href="/ingresar" className="font-bold text-brand-white">
              Volver a iniciar sesión
            </Link>
          </p>
        </GlassCard>
      )}
    </div>
  );
}
