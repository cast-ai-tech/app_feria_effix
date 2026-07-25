import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sensación de app: sin badge/indicadores de dev flotando (Fase 24).
  devIndicators: false,
  images: {
    // Imágenes de banners servidas desde Supabase Storage (local y cloud).
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "http", hostname: "localhost", port: "54321" },
      { protocol: "https", hostname: "**.supabase.co" },
      // Miniaturas de YouTube (Academia embebida).
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
    // SOLO desarrollo: Next 16 bloquea IPs privadas en el optimizador y el
    // Supabase local vive en 127.0.0.1. En producción (supabase.co) no aplica.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
