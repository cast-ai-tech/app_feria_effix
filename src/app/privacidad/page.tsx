import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";

export const metadata = {
  title: "Política de privacidad — Feria Effix",
};

/**
 * Página pública y sin autenticación (a propósito: exigida por Google Play
 * y Apple App Store para poder publicar la ficha, y debe ser accesible sin
 * cuenta para revisores y usuarios). No pasa por getAccess() — regla de
 * gating de AGENTS.md aplica a módulos de producto, no a este documento legal.
 */
export default function PrivacidadPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Política de privacidad" backHref="/perfil" />
      <GlassCard className="flex flex-col gap-4 p-5 text-[12px] leading-relaxed text-brand-dim">
        <p className="text-brand-muted">
          Última actualización: agosto de 2026.
        </p>

        <p>
          Esta política aplica a la app <strong>Feria Effix</strong> (web y apps
          de Google Play / App Store), la plataforma oficial del evento Feria
          Effix para gestionar tu boleta, agenda, red de contactos y contenido
          del evento.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Quién es responsable de tus datos
        </h2>
        <p>
          Feria Effix es responsable del tratamiento de tus datos. Puedes
          escribirnos para cualquier duda o solicitud a{" "}
          <a
            href="mailto:jacsolucionesgraficas@gmail.com"
            className="text-brand-white underline"
          >
            jacsolucionesgraficas@gmail.com
          </a>
          .
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Qué datos recolectamos
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Cuenta y perfil:</strong> nombre, país, rol/categoría, bio,
            correo de compra de la boleta, WhatsApp, Instagram y LinkedIn (los
            que tú decidas llenar).
          </li>
          <li>
            <strong>Boleta:</strong> tipo de boleta (General, VIP, Black, etc.)
            y estado, vinculados a tu correo de compra.
          </li>
          <li>
            <strong>Red de contactos (Comunidad/Credencial):</strong> cuando
            conectas con otro asistente, se guarda esa conexión y los datos de
            contacto que elegiste compartir (WhatsApp/Instagram/LinkedIn).
          </li>
          <li>
            <strong>Uso dentro de la app:</strong> agenda personal, progreso en
            Academia, respuestas de encuestas/preguntas en vivo, sellos del
            Pasaporte de stands, citas solicitadas a expositores.
          </li>
          <li>
            <strong>Cámara:</strong> se usa únicamente para escanear códigos QR
            (tu Credencial y el Pasaporte de stands) dentro de la propia app. No
            grabamos ni almacenamos video.
          </li>
          <li>
            <strong>Notificaciones push:</strong> si las activas, guardamos el
            identificador técnico de tu dispositivo/navegador para poder
            enviarte avisos.
          </li>
        </ul>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Para qué usamos tus datos
        </h2>
        <p>
          Operar el evento y la app: validar tu boleta, mostrar tu perfil en
          Comunidad, conectar contactos, mostrar tu progreso en Academia,
          enviarte avisos operativos (cambios de agenda, conexiones nuevas,
          sellos) y, si lo autorizas, novedades y promociones.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Con quién compartimos datos
        </h2>
        <p>
          Con otros asistentes solo lo que tú decides compartir al conectar
          (WhatsApp/Instagram/LinkedIn — puedes desactivarlo en tu perfil). Con
          expositores/patrocinadores, solo si solicitas una cita o interactúas
          con su stand. No vendemos tus datos a terceros. Los datos se almacenan
          con Supabase (Postgres) y la app corre sobre Vercel, ambos con cifrado
          en tránsito y en reposo.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Tus derechos: acceso, corrección y borrado
        </h2>
        <p>
          Puedes editar tu perfil en cualquier momento desde{" "}
          <span className="text-brand-white">Mi perfil</span>. Desde ahí también
          puedes <strong>eliminar tu cuenta y tus datos</strong> de forma
          permanente (sección &quot;Zona de riesgo&quot;). Al eliminarla se
          borran tu perfil, conexiones, agenda, progreso de Academia, respuestas
          y sellos del Pasaporte. Registros del evento que deben conservarse por
          motivos operativos o legales (por ejemplo, historial de una boleta ya
          usada) se conservan anonimizados, sin tu nombre ni datos de contacto.
          Si no puedes acceder a la app, puedes pedir el borrado escribiendo a{" "}
          <a
            href="mailto:jacsolucionesgraficas@gmail.com"
            className="text-brand-white underline"
          >
            jacsolucionesgraficas@gmail.com
          </a>
          .
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Menores de edad
        </h2>
        <p>
          Feria Effix es una app para un evento profesional dirigida a audiencia
          general/adulta. No está diseñada para recolectar intencionalmente
          datos de menores de edad.
        </p>

        <h2 className="text-[13px] font-extrabold text-brand-white">
          Cambios a esta política
        </h2>
        <p>
          Podemos actualizar esta política cuando cambie la app o el evento.
          Publicaremos la fecha de la última actualización arriba.
        </p>
      </GlassCard>
    </div>
  );
}
