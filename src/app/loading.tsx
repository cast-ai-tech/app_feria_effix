/**
 * Skeleton global de carga (Fase 24): se muestra en cada navegación
 * mientras el server component de la ruta resuelve sus datos.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-3.5 w-56" />
      </div>
      <div className="skeleton h-32 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24 md:hidden" />
      </div>
      <div className="skeleton h-16 w-full" />
      <div className="skeleton h-16 w-full" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
