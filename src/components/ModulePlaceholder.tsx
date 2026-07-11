import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";

type Props = {
  title: string;
  subtitle: string;
  /** Fase del plan de desarrollo donde se construye este modulo. */
  phase: string;
  /** Regla de acceso segun el Master Prompt (seccion 5). */
  access: string;
};

/**
 * Placeholder de modulo para las fases aun no construidas. Usa el sistema
 * de diseño (PageHeader, GlassCard, Badge). Se reemplaza al construir cada modulo.
 */
export default function ModulePlaceholder({
  title,
  subtitle,
  phase,
  access,
}: Props) {
  return (
    <div className="flex flex-col">
      <PageHeader title={title} subtitle={subtitle} backHref="/" />

      <GlassCard sheen className="p-5 text-center">
        <p className="text-[13px] font-extrabold text-brand-white">
          Módulo en construcción
        </p>
        <p className="mt-1 text-[11px] font-medium text-brand-muted">
          Se implementa en la {phase}.
        </p>
        <div className="mt-4">
          <Badge>{access}</Badge>
        </div>
      </GlassCard>
    </div>
  );
}
