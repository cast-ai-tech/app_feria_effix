/**
 * Traducción de errores de Supabase Auth a mensajes HUMANOS en español
 * (Fase 21, hallazgo #17). Los mensajes crudos ("Invalid login credentials")
 * no ayudan a un asistente de la feria.
 */

const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos. Revisa e intenta de nuevo."],
  [/email not confirmed/i, "Tu correo aún no está confirmado. Busca el mensaje de confirmación en tu bandeja (y en spam)."],
  [/user already registered/i, "Ya existe una cuenta con este correo. Intenta iniciar sesión o recuperar tu contraseña."],
  [/password should be at least/i, "La contraseña es muy corta: usa al menos 6 caracteres."],
  [/rate limit|too many requests/i, "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar."],
  [/for security purposes.*only request this/i, "Por seguridad solo se puede pedir un correo por minuto. Espera un momento."],
  [/unable to validate email|invalid email/i, "Ese correo no parece válido. Revísalo."],
  [/new password should be different/i, "La nueva contraseña debe ser diferente a la anterior."],
  [/auth session missing|session.*expired|refresh token/i, "Tu sesión expiró. Vuelve a iniciar sesión."],
  [/signup.*disabled/i, "El registro está deshabilitado temporalmente."],
  [/fetch failed|network|failed to fetch/i, "Sin conexión. Revisa tu internet e intenta de nuevo."],
];

export function translateAuthError(raw: string | null | undefined): string {
  const msg = raw ?? "";
  for (const [pattern, human] of MAP) {
    if (pattern.test(msg)) return human;
  }
  return "Algo salió mal. Intenta de nuevo en un momento.";
}
