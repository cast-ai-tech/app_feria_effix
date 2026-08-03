import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AppBackground from "@/components/AppBackground";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NativePushBootstrap from "@/components/NativePushBootstrap";
import SplashSponsor from "@/components/SplashSponsor";
import AppOpenIntro from "@/components/AppOpenIntro";
import InstallAppBanner from "@/components/InstallAppBanner";
import MiniPlayerProvider from "@/components/player/MiniPlayerProvider";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feria Effix",
  description:
    "App oficial de Feria Effix — la feria de e-commerce y marketing digital. Plaza Mayor, Medellín.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Necesario para que env(safe-area-inset-*) funcione en pantallas con
  // notch/gestos (iOS standalone y Android edge-to-edge).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full`}>
      {/* suppressHydrationWarning: extensiones del navegador (ColorZilla,
          etc.) inyectan atributos en <body> antes de hidratar y React
          descartaba el árbol client en dev. Solo suprime avisos de
          ATRIBUTOS en este nodo — no oculta errores reales. */}
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <NativePushBootstrap />
        <AppBackground />
        <AppOpenIntro />
        <SplashSponsor />

        {/*
          Shell FULL-DEVICE (Fase 24): esto es una APP, no una página web.
          La interfaz ocupa 100dvw × 100dvh en cualquier dispositivo:
          sin marcos centrados, sin franjas vacías, sin sidebars.
          Header de app sticky arriba + BottomNav abajo, siempre.
        */}
        {/* MiniPlayerProvider (Fase 27): envuelve toda la app para que el
            mini-player de Academia sobreviva la navegación entre secciones. */}
        <MiniPlayerProvider>
          <div className="relative z-10 flex min-h-dvh w-full flex-col">
            <AppHeader />
            <main className="no-scrollbar w-full flex-1 px-5 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 xl:px-12">
              {children}
            </main>
            <BottomNav />
          </div>
        </MiniPlayerProvider>
        <InstallAppBanner />
      </body>
    </html>
  );
}
