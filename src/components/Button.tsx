import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Variantes (Fase 23 suma las de marca del sitio real, sin romper usos):
 * - solid / ghost: las históricas de la app.
 * - glow: CTA PRIMARIO — pill blanco con anillo neón cian animado
 *   (patrón del header de feriaeffix.com).
 * - tier-black | tier-vip | tier-general: degradado metálico del tier
 *   (plata/oro/lavanda), texto negro Montserrat Bold — solo para acciones
 *   ligadas a un tier (comprar/solicitar/mostrar escarapela).
 */
type Variant =
  | "solid"
  | "ghost"
  | "glow"
  | "tier-black"
  | "tier-vip"
  | "tier-general";
type Size = "sm" | "md";

type ButtonProps = {
  children: React.ReactNode;
  /** solid = blanco con texto negro · ghost = borde blanco translúcido */
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  /** Si se pasa, el botón se renderiza como enlace de navegación (<Link>). */
  href?: string;
  onClick?: React.MouseEventHandler;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "aria-label"?: string;
};

const VARIANTS: Record<Variant, string> = {
  solid: "bg-brand-white text-black border border-transparent",
  ghost: "bg-transparent text-brand-white border border-white/35",
  glow: "bg-brand-white text-black border border-transparent btn-glow",
  "tier-black": "tier-black-bg text-black border border-transparent",
  "tier-vip": "tier-vip-bg text-black border border-transparent",
  "tier-general": "tier-general-bg text-black border border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "px-[13px] py-[7px] text-[10px]",
  md: "px-5 py-3 text-[12px]",
};

/**
 * Botón de marca. Renderiza <button> por defecto, o <Link> si recibe `href`.
 * Variantes: `solid` (relleno blanco) y `ghost` (borde translúcido).
 */
export default function Button({
  children,
  variant = "solid",
  size = "sm",
  fullWidth = false,
  className,
  href,
  onClick,
  type = "button",
  disabled = false,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full font-extrabold",
    "transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
