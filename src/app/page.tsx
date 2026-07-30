import Link from "next/link";
import {
  CalendarClock,
  GraduationCap,
  Handshake,
  IdCard,
  MapPin,
  Mic,
  Stamp,
  Store,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import BannerSlot from "@/components/BannerSlot";
import Countdown from "@/components/Countdown";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import RoleSpaces from "@/components/home/RoleSpaces";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAccess } from "@/lib/access";

/**
 * HOME (rediseñada en Fase 24). Orden: header → carrusel de patrocinio →
 * countdown → banner inline → tus espacios (Fase 28) → módulos →
 * próximas charlas → franja Patrocinan.
 */
const MODULES: Array<{
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
}> = [
  {
    href: "/credencial",
    icon: IdCard,
    label: "Credencial",
    sub: "Escanea y conecta",
  },
  {
    href: "/pasaporte",
    icon: Stamp,
    label: "Pasaporte",
    sub: "Sellos y premios",
  },
  {
    href: "/tickets",
    icon: Ticket,
    label: "Mi escarapela",
    sub: "QR y acceso",
  },
  {
    href: "/agenda",
    icon: CalendarClock,
    label: "Programación",
    sub: "En tiempo real",
  },
  { href: "/mapa", icon: MapPin, label: "Mapa", sub: "Plano del recinto" },
  { href: "/stands", icon: Store, label: "Stands", sub: "Agenda tu visita" },
  {
    href: "/ponentes",
    icon: Mic,
    label: "Ponentes",
    sub: "Perfiles y charlas",
  },
  {
    href: "/academia",
    icon: GraduationCap,
    label: "Academia",
    sub: "Contenido grabado",
  },
  { href: "/alianzas", icon: Handshake, label: "Alianzas", sub: "Marketplace" },
  { href: "/comunidad", icon: Users, label: "Comunidad", sub: "Networking" },
];

const TZ = "America/Bogota";

function fmtTalkTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

export default async function HomePage() {
  const a = await getAccess();

  // Saludo con el nombre del perfil.
  let name: string | null = null;
  // Próximas charlas guardadas (solo con boleta vigente).
  let upcoming: Array<{
    id: string;
    title: string;
    auditorium: string | null;
    starts_at: string;
  }> = [];

  if (isSupabaseConfigured() && a.user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", a.user.id)
      .single();
    const trimmed = profile?.full_name?.trim();
    name = trimmed ? trimmed.split(" ")[0] : (a.user.email ?? "").split("@")[0];

    if (a.hasCurrentTicket || a.isAdmin) {
      const nowMs = new Date().getTime();
      const { data: saved } = await supabase
        .from("saved_talks")
        .select("talk_id, talks(id,title,auditorium,starts_at,status)")
        .eq("user_id", a.user.id)
        .limit(50);
      upcoming = (saved ?? [])
        .map((s) => {
          const t = s.talks as unknown as {
            id: string;
            title: string;
            auditorium: string | null;
            starts_at: string | null;
            status: string;
          } | null;
          return t;
        })
        .filter(
          (t): t is NonNullable<typeof t> & { starts_at: string } =>
            !!t &&
            t.status === "active" &&
            !!t.starts_at &&
            new Date(t.starts_at).getTime() > nowMs,
        )
        .sort((x, y) => x.starts_at.localeCompare(y.starts_at))
        .slice(0, 3)
        .map((t) => ({
          id: t.id,
          title: t.title,
          auditorium: t.auditorium,
          starts_at: t.starts_at,
        }));
    }
  }

  return (
    <div className="flex flex-col">
      {/* El logo y la campana viven en el AppHeader global (Fase 24). */}
      <h1 className="text-display mb-1 text-brand-white">
        {name ? `Hola, ${name}` : "Hola"}
      </h1>
      <p className="mb-4 text-[12.5px] font-medium text-brand-muted">
        {name
          ? "Bienvenido de nuevo a Feria Effix"
          : "Bienvenido a la app oficial de Feria Effix"}
      </p>

      {/* CTA de cuenta */}
      {name ? null : (
        <div className="mb-5 flex gap-3">
          <Button href="/ingresar" variant="ghost" className="flex-1">
            Ingresar
          </Button>
          <Button href="/registro" variant="glow" className="flex-1">
            ¡Crea tu cuenta!
          </Button>
        </div>
      )}

      {/* Carrusel de patrocinio principal */}
      <BannerSlot
        placement="home_hero"
        edition={a.currentEdition}
        className="mb-5"
      />

      {/* Countdown (fecha desde `editions`) */}
      <Countdown edition={a.edition} />

      {/* Banner intermedio de patrocinio */}
      <BannerSlot
        placement="home_inline"
        edition={a.currentEdition}
        className="mb-5"
      />

      {/* Tus espacios: accesos por rol (expositor/ponente/patrocinador/staff)
          y beneficios de tier VIP/Black (Fase 28). */}
      <RoleSpaces roles={a.roles} ticketTier={a.ticketTier} />

      <p className="text-caption mb-3 text-brand-dim">Explora la feria</p>

      {/* Grilla de módulos con iconos SVG (cero emojis) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((m, i) => (
          <GlassCard
            key={m.href}
            href={m.href}
            className="flex min-h-[104px] flex-col justify-between gap-2 px-4 py-4"
          >
            <span
              className={
                i % 3 === 0
                  ? "flex h-11 w-11 items-center justify-center rounded-full border border-brand-lav/50 bg-brand-lav/30"
                  : i % 3 === 1
                    ? "flex h-11 w-11 items-center justify-center rounded-full border border-glow-cian/40 bg-glow-cian/15"
                    : "flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08]"
              }
            >
              <m.icon className="h-5 w-5 text-brand-white" aria-hidden />
            </span>
            <span>
              <span className="block text-[13px] font-extrabold leading-tight text-brand-white">
                {m.label}
              </span>
              <span className="block text-[10.5px] font-medium text-brand-dim">
                {m.sub}
              </span>
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Tus próximas charlas (Mi Agenda) */}
      {upcoming.length > 0 && (
        <>
          <p className="text-caption mb-3 mt-6 text-brand-dim">
            Tus próximas charlas
          </p>
          <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
            {upcoming.map((t) => (
              <Link key={t.id} href="/agenda">
                <GlassCard className="flex h-full flex-col gap-1 p-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-lav">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    {fmtTalkTime(t.starts_at)}
                  </span>
                  <span className="line-clamp-2 text-[12px] font-extrabold leading-snug text-brand-white">
                    {t.title}
                  </span>
                  {t.auditorium && (
                    <span className="text-[9.5px] text-brand-muted">
                      {t.auditorium}
                    </span>
                  )}
                </GlassCard>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Franja de patrocinadores */}
      <BannerSlot
        placement="footer_strip"
        edition={a.currentEdition}
        className="mt-8"
      />
    </div>
  );
}
