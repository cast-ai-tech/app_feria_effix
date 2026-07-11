import Link from "next/link";
import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: React.ReactNode;
  /** Activa el brillo animado que recorre la tarjeta (efecto cromo/vidrio). */
  sheen?: boolean;
  className?: string;
  /** Si se pasa, la tarjeta se vuelve un enlace de navegación. */
  href?: string;
  onClick?: () => void;
};

const BASE =
  "relative overflow-hidden rounded-[18px] border border-white/[0.12] " +
  "bg-gradient-to-br from-white/[0.07] to-brand-lav/10 backdrop-blur-sm";

/**
 * Superficie de vidrio/cromo — el contenedor base de toda la app.
 * Fiel al `.glass` del prototipo. Con `sheen` añade el brillo que recorre.
 */
export default function GlassCard({
  children,
  sheen = false,
  className,
  href,
  onClick,
}: GlassCardProps) {
  const classes = cn(
    BASE,
    sheen && "glass-sheen",
    (href || onClick) && "cursor-pointer transition-transform active:scale-[0.98]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}
