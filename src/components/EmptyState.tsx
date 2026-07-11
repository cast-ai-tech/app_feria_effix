import GlassCard from "@/components/GlassCard";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

/** Estado vacío reutilizable (sin resultados, sin datos aún, etc.). */
export default function EmptyState({
  icon = "✨",
  title,
  subtitle,
  children,
}: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center p-6 text-center">
      <div className="text-[26px]">{icon}</div>
      <p className="mt-2 text-[13px] font-extrabold text-brand-white">{title}</p>
      {subtitle && (
        <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
