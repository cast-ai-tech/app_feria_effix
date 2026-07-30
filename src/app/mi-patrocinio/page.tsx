import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import MiPatrocinioClient from "@/components/mipatrocinio/MiPatrocinioClient";
import { getAccess } from "@/lib/access";
import { getMySponsors, getSponsorBannerMetrics } from "@/lib/sponsors";

/**
 * PORTAL DEL PATROCINADOR (Fase 28) — /mi-patrocinio.
 * Gate: estar en sponsor_staff (lo asigna el admin), o ser admin. Requiere
 * login. Solo lectura en este MVP (sin server actions).
 */
export default async function MiPatrocinioPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi patrocinio" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  if (!a.roles.isSponsor && !a.isAdmin) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Mi patrocinio"
          subtitle="Portal del patrocinador"
          backHref="/"
        />
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Este espacio es para patrocinadores
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            Aquí el equipo de las marcas que patrocinan la feria revisa sus
            espacios publicitarios y las métricas de sus banners. Si tu marca es
            patrocinadora, pídele al organizador que agregue tu correo como
            staff del patrocinador.
          </p>
        </GlassCard>
      </div>
    );
  }

  const sponsors = await getMySponsors(a.user.id);
  const sponsorIds = sponsors.map((s) => s.id);
  const metrics = await getSponsorBannerMetrics(sponsorIds);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi patrocinio"
        subtitle="Portal del patrocinador · tus espacios y métricas"
        backHref="/"
      />
      <MiPatrocinioClient sponsors={sponsors} metrics={metrics} />
    </div>
  );
}
