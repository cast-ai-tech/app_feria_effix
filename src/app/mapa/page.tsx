import PageHeader from "@/components/PageHeader";
import LockedModule from "@/components/LockedModule";
import VenueMap from "@/components/mapa/VenueMap";
import { getAccess } from "@/lib/access";
import { formatEditionRange } from "@/lib/editions";

const TITLE = "Mapa del recinto";
const SUBTITLE = "Plaza Mayor, Medellín · plano por zonas";

/**
 * MAPA (Fase 5) — plano simplificado del recinto.
 * Acceso: requiere boleta vigente de la edición en curso (o admin).
 */
export default async function MapaPage() {
  const a = await getAccess();

  if (!a.configured) {
    return <LockedModule title={TITLE} reason="ticket" configured={false} />;
  }
  if (!a.user) {
    return <LockedModule title={TITLE} reason="login" />;
  }
  if (!a.hasCurrentTicket && !a.isAdmin) {
    return <LockedModule title={TITLE} reason="ticket" />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={TITLE} subtitle={SUBTITLE} backHref="/" />
      <VenueMap dateRange={formatEditionRange(a.edition)} />
    </div>
  );
}
