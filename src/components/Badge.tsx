import { cn } from "@/lib/cn";

type BadgeProps = {
  children: React.ReactNode;
  /** Muestra un punto pulsante (estado "en vivo"/tiempo real). */
  dot?: boolean;
  className?: string;
};

/**
 * Chip/badge de estado — ej. "Modo offline activo", "Ahora",
 * "Acceso permanente". Fiel al `.badge` del prototipo.
 */
export default function Badge({ children, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-lav/50",
        "bg-brand-lav-glass px-[11px] py-[5px] text-[9.5px] font-bold text-brand-dim",
        className,
      )}
    >
      {dot && (
        <span className="live-dot inline-block h-[7px] w-[7px] rounded-full bg-brand-dim" />
      )}
      {children}
    </span>
  );
}
