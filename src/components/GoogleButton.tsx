"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón "continuar con Google". Requiere tener habilitado el proveedor
 * Google en Supabase → Authentication → Providers. Si no está habilitado,
 * Supabase devuelve un error que mostramos sin romper la pantalla.
 */
export default function GoogleButton({ label }: { label: string }) {
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div>
      <Button variant="ghost" fullWidth size="md" onClick={handleGoogle}>
        <span className="mr-2">🇬</span> {label}
      </Button>
      {error && (
        <p className="mt-2 text-center text-[10.5px] text-red-300">{error}</p>
      )}
    </div>
  );
}
