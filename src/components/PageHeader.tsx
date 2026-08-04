type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /**
   * Obsoleto (Fase 30): la flecha de volver se eliminó — el botón atrás
   * del teléfono y la casita del BottomNav ya cubren esa navegación. El
   * prop se conserva para no tocar las ~30 páginas que aún lo pasan.
   */
  backHref?: string;
};

/**
 * Encabezado de página — título en Montserrat Black + subtítulo apagado.
 * Fiel a `.page-title` / `.page-sub`.
 */
export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-title text-brand-white">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-[13px] font-medium text-brand-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
