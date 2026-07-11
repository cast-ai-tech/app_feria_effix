import Link from "next/link";
import { cn } from "@/lib/cn";

type ListItemProps = {
  /** Emoji o nodo para el thumbnail cuadrado con degradado. */
  thumb?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Contenido alineado a la derecha (badge, botón, estrellas). */
  right?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/**
 * Fila de lista reutilizable — fiel a `.list-item` del prototipo:
 * thumb con degradado lavanda + título + subtítulo + zona derecha opcional.
 * Envuélvela en <GlassCard> cuando quieras la superficie de vidrio.
 */
export default function ListItem({
  thumb,
  title,
  subtitle,
  right,
  href,
  onClick,
  className,
}: ListItemProps) {
  const inner = (
    <>
      {thumb !== undefined && (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand-lav to-[#23222b] text-[16px]">
          {thumb}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-extrabold text-brand-white">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[10.5px] font-medium text-brand-muted">
            {subtitle}
          </div>
        )}
      </div>
      {right !== undefined && (
        <div className="ml-auto flex-shrink-0 text-right">{right}</div>
      )}
    </>
  );

  const classes = cn(
    "flex items-center gap-3 px-[14px] py-[13px]",
    (href || onClick) &&
      "cursor-pointer transition-transform active:scale-[0.98]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={classes} onClick={onClick}>
      {inner}
    </div>
  );
}
