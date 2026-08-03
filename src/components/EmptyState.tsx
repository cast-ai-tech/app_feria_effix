import { Sparkles } from "lucide-react";
import Image from "next/image";
import GlassCard from "@/components/GlassCard";

type EmptyStateProps = {
  /** Icono lucide (ReactNode). Nunca emojis (regla Fase 24). */
  icon?: React.ReactNode;
  /** Ilustración opcional (Fase 30) — reemplaza el círculo de icono cuando
   * el contexto pide algo más evocador (p. ej. "sin contactos aún"). */
  image?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

/** Estado vacío reutilizable (sin resultados, sin datos aún, etc.). */
export default function EmptyState({
  icon = <Sparkles className="h-7 w-7 text-brand-lav" aria-hidden />,
  image,
  title,
  subtitle,
  children,
}: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center p-6 text-center">
      {image ? (
        <div className="relative h-20 w-20">
          <Image
            src={image}
            alt=""
            fill
            sizes="80px"
            className="object-contain"
          />
        </div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-brand-lav/20">
          {icon}
        </div>
      )}
      <p className="mt-2 text-[13px] font-extrabold text-brand-white">
        {title}
      </p>
      {subtitle && (
        <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
