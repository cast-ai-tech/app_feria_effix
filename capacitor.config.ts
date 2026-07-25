import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de Capacitor (Fases 13 y 22).
 *
 * DECISIÓN DE EMPAQUETADO (Fase 22): la app usa Next.js con server
 * components y sesión de Supabase en cookies → NO es exportable a
 * estático. Por eso las apps de tienda cargan la URL REMOTA de
 * producción (server.url). `webDir` es solo el shell de respaldo si el
 * dispositivo no alcanza el servidor.
 *
 * Antes de publicar: descomentar server.url apuntando al dominio real
 * (https://app.feriaeffix.com) desplegado en Vercel.
 */
const config: CapacitorConfig = {
  appId: "com.feriaeffix.app",
  appName: "Feria Effix",
  webDir: "capacitor-shell",
  backgroundColor: "#000000",
  // server: {
  //   url: "https://app.feriaeffix.com",
  //   cleartext: false,
  // },
};

export default config;
