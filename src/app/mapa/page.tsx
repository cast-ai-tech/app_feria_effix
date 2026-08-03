import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import VenueMap from "@/components/mapa/VenueMap";
import { getAccess } from "@/lib/access";
import { formatEditionRange } from "@/lib/editions";

const TITLE = "Mapa del recinto";
const SUBTITLE = "Plaza Mayor, Medellín · plano por zonas";

/**
 * MAPA (Fase 5) — plano simplificado del recinto.
 * Abierto sin sesión (Fase 30) — solo depende del modo vitrina.
 */
export default async function MapaPage() {
  const a = await getAccess();

  if (!a.configured) {
    return <LockedModule title={TITLE} reason="ticket" configured={false} />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={TITLE} subtitle={SUBTITLE} backHref="/" />
      <VenueMap dateRange={formatEditionRange(a.edition)} />
    </div>
  );
}
