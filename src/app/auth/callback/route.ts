import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de autenticación: intercambia el `code` (OAuth de Google,
 * confirmación de correo o recuperación de contraseña) por una sesión,
 * y redirige a `next` (por defecto /perfil).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/perfil";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, de vuelta al login con un aviso.
  return NextResponse.redirect(`${origin}/ingresar?error=auth`);
}
