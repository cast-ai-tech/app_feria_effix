import { cn } from "@/lib/cn";

type SectionTitleProps = {
  children: React.ReactNode;
  /** Muestra un punto pulsante "en vivo" antes del texto. */
  live?: boolean;
  className?: string;
};

/**
 * Rótulo de sección — mayúsculas, tracking amplio, apagado.
 * Fiel a `.section-title` del prototipo.
 */
export default function SectionTitle({
  children,
  live = false,
  className,
}: SectionTitleProps) {
  return (
    <p
      className={cn(
        "mt-4 mb-2.5 flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[1.3px] text-brand-dim",
        className,
      )}
    >
      {live && (
        <span className="live-dot inline-block h-[7px] w-[7px] rounded-full bg-brand-dim" />
      )}
      {children}
    </p>
  );
}
