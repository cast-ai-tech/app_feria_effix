import { cn } from "@/lib/cn";

type FilterChipProps = {
  children: React.ReactNode;
  /** Estado seleccionado (relleno blanco). */
  active?: boolean;
  onClick?: React.MouseEventHandler;
  className?: string;
};

/**
 * Chip de filtro seleccionable — ej. días (Día 1/2/3), ediciones,
 * categorías. Fiel al `.filter-chip` del prototipo.
 */
export default function FilterChip({
  children,
  active = false,
  onClick,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "whitespace-nowrap rounded-full px-[13px] py-[7px] text-[10.5px] font-bold transition-colors",
        active
          ? "border border-brand-white bg-brand-white text-black"
          : "border border-white/15 text-brand-dim",
        className,
      )}
    >
      {children}
    </button>
  );
}
