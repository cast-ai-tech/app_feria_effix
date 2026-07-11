import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AppBackground from "@/components/AppBackground";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feria Effix 2026",
  description:
    "App oficial de Feria Effix — la feria de e-commerce y marketing digital. Plaza Mayor, Medellín · 16–18 de octubre de 2026.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        <AppBackground />
        {/* Shell tipo app movil: contenido centrado y limitado en desktop */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[440px] flex-col">
          <main className="no-scrollbar flex-1 px-5 pt-10 pb-28">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
