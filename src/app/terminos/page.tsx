import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";

export const metadata = {
  title: "Términos de servicio — Feria Effix",
};

/** Página pública, sin autenticación — mismo criterio que /privacidad. */
export default function TerminosPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Términos de servicio" backHref="/perfil" />
      <GlassCard className="flex flex-col gap-4 p-5 text-[12px] leading-relaxed text-brand-dim">
        <p className="text-brand-muted">
          Última actualización: agosto de 2026.
        </p>

        <p>
          Al crear una cuenta o usar la app <strong>Feria Effix</strong> aceptas
          estos términos. Si no estás de acuerdo, no uses la app.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Qué es Feria Effix
        </h2>
        <p>
          Es la app oficial del evento Feria Effix: gestión de tu boleta,
          agenda, Comunidad (red de contactos), Academia (contenido de
          formación), directorio de expositores y patrocinadores.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Tu cuenta
        </h2>
        <p>
          Eres responsable de la información que registras y de mantener tu
          acceso seguro. Un rol de administrador puede validar o revocar accesos
          vinculados a boletas, stands o patrocinios según las reglas del
          evento.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Uso aceptable
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No suplantes a otra persona ni uses datos de boleta ajenos.</li>
          <li>
            No uses la Credencial, el Pasaporte de stands ni la mensajería de
            Comunidad para spam o acoso a otros asistentes.
          </li>
          <li>
            No intentes vulnerar la seguridad de la app ni acceder a datos de
            otros usuarios.
          </li>
        </ul>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Contenido de Academia
        </h2>
        <p>
          El contenido de Academia (videos, materiales) es para tu uso personal
          como asistente; no está autorizada su redistribución.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Boletas, stands y patrocinios
        </h2>
        <p>
          La compra y validez de boletas, así como los acuerdos comerciales de
          stands y patrocinios, se rigen por los términos comerciales acordados
          directamente con la organización del evento; esta app es la
          herramienta operativa para gestionarlos, no sustituye esos acuerdos.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Disponibilidad
        </h2>
        <p>
          Hacemos lo posible por mantener la app disponible durante el evento,
          pero no garantizamos operación ininterrumpida (mantenimiento, fallas
          de terceros como Supabase o Vercel, u otras causas fuera de nuestro
          control).
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Cuenta y datos
        </h2>
        <p>
          Puedes eliminar tu cuenta en cualquier momento desde{" "}
          <span className="text-brand-white">Mi perfil</span>. Consulta el
          detalle de qué datos recolectamos y cómo los tratamos en la{" "}
          <a href="/privacidad" className="text-brand-white underline">
            Política de privacidad
          </a>
          .
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">Cambios</h2>
        <p>
          Podemos actualizar estos términos cuando cambie la app o el evento. El
          uso continuado después de un cambio implica aceptación.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Contacto
        </h2>
        <p>
          <a
            href="mailto:jacsolucionesgraficas@gmail.com"
            className="text-brand-white underline"
          >
            jacsolucionesgraficas@gmail.com
          </a>
        </p>
      </GlassCard>
    </div>
  );
}
