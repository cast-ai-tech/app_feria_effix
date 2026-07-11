import { cn } from "@/lib/cn";

/**
 * Fila de estrellas de solo lectura — fiel a `.stars` del prototipo.
 * `value` es el promedio (0–5); pinta estrellas llenas/vacías redondeando
 * a la media más cercana no se soporta: usamos redondeo simple a entero
 * visual pero mostramos el número exacto aparte cuando hace falta.
 */
export default function Stars({
  value,
  count,
  className,
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  const filled = Math.round(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] tracking-[1px] text-[#e6e4ee]",
        className,
      )}
    >
      <span aria-hidden>
        {"★".repeat(filled)}
        <span className="text-brand-dim">{"★".repeat(Math.max(0, 5 - filled))}</span>
      </span>
      {count !== undefined && (
        <span className="text-[9.5px] font-semibold text-brand-muted">
          ({count})
        </span>
      )}
    </span>
  );
}
