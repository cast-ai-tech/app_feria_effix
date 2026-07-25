import type { LucideIcon } from "lucide-react";
import { GraduationCap, Lock, Ticket } from "lucide-react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";

type Reason = "login" | "ticket" | "alumni";

const COPY: Record<Reason, { icon: LucideIcon; title: string; sub: string; cta: string; href: string }> = {
  login: {
    icon: Lock,
    title: "Inicia sesión para continuar",
    sub: "Necesitas una cuenta para acceder a este módulo.",
    cta: "Ingresar",
    href: "/ingresar",
  },
  ticket: {
    icon: Ticket,
    title: "Requiere boleta vigente",
    sub: "Este módulo está disponible para quienes tienen una boleta activa de la edición en curso.",
    cta: "Ver mi boleta",
    href: "/tickets",
  },
  alumni: {
    icon: GraduationCap,
    title: "Acceso para asistentes",
    sub: "Academia está disponible de por vida para quienes han tenido una boleta válida en cualquier edición.",
    cta: "Ver mi boleta",
    href: "/tickets",
  },
};

/**
 * Estado "bloqueado" de un módulo con acceso restringido (Master Prompt §5).
 * Si Supabase no está configurado, muestra el aviso estándar.
 */
export default function LockedModule({
  title,
  subtitle,
  reason,
  configured = true,
  backHref = "/",
}: {
  title: string;
  subtitle?: string;
  reason: Reason;
  configured?: boolean;
  backHref?: string;
}) {
  const c = COPY[reason];
  return (
    <div className="flex flex-col">
      <PageHeader title={title} subtitle={subtitle} backHref={backHref} />
      {!configured ? (
        <SupabaseNotice />
      ) : (
        <GlassCard className="flex flex-col items-center p-7 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-brand-lav/25">
            <c.icon className="h-6 w-6 text-brand-white" aria-hidden />
          </div>
          <p className="mt-3 text-[14px] font-black text-brand-white">{c.title}</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-muted">
            {c.sub}
          </p>
          <div className="mt-5">
            <Button href={c.href} size="md">
              {c.cta}
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
