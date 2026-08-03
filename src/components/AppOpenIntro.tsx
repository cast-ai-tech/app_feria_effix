"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { playSound } from "@/lib/platform/sound";

/** Una vez por apertura de la app (se resetea con una recarga completa). */
let introShown = false;

/**
 * Intro de apertura de la app (Fase 27): logo cromado de Feria EffiX +
 * sonido épico, ~2.8s o toca para saltar. Es la PRIMERA pantalla que se ve
 * (z-[70], por encima incluso del splash de patrocinio) — independiente de
 * SplashSponsor.tsx, que sigue su propia lógica (patrocinador, condicional
 * a que haya un banner activo).
 *
 * `visible` arranca SIEMPRE en false (server y cliente coinciden en el
 * primer render, sin esto el SSR no tiene forma de saber si ya se mostró
 * en esta pestaña — decidirlo en el render inicial causa un mismatch de
 * hidratación). La decisión real ocurre en un efecto, solo en el cliente.
 */
export default function AppOpenIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (introShown) return;
    introShown = true;
    // Deliberado: "ya se mostró" es estado solo del cliente, no se puede
    // resolver en el render (mismatch server/cliente) — debe ir en el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const stopSound = playSound("/sounds/app-open-epic.mp3");
    const timer = window.setTimeout(() => setVisible(false), 2800);
    return () => {
      window.clearTimeout(timer);
      stopSound();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <button
      aria-label="Continuar"
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[70] flex w-full items-center justify-center overflow-hidden bg-black"
    >
      <Image
        src="/brand/intro-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div className="intro-logo relative h-40 w-72">
        <Image
          src="/brand/logo-cromado-v2.png"
          alt="Feria EffiX"
          fill
          sizes="288px"
          className="intro-logo-img object-contain"
          priority
        />
      </div>
    </button>
  );
}
