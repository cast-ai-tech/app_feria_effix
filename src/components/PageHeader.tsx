import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Muestra flecha de volver hacia esta ruta (ej. "/"). */
  backHref?: string;
};

/**
 * Encabezado de página — título en Montserrat Black + subtítulo apagado,
 * con flecha de volver opcional. Fiel a `.page-title` / `.page-sub`.
 */
export default function PageHeader({
  title,
  subtitle,
  backHref,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-2 text-[16px] font-black text-brand-white"
          aria-label="Volver"
        >
          ←
        </Link>
      )}
      <h1 className="text-title text-brand-white">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-[13px] font-medium text-brand-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
