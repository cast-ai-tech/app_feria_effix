import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Los 8 modulos de la App Feria Effix (Master Prompt seccion 4).
 * El home enruta a cada modulo.
 */
const MODULES = [
  { href: "/tickets", icon: "🎟️", label: "Tickets", sub: "QR y acceso" },
  { href: "/agenda", icon: "🕐", label: "Programación", sub: "En tiempo real" },
  { href: "/mapa", icon: "📍", label: "Mapa", sub: "GPS del recinto" },
  { href: "/stands", icon: "🏬", label: "Stands", sub: "Agenda tu visita" },
  { href: "/ponentes", icon: "🎤", label: "Ponentes", sub: "Perfiles y charlas" },
  { href: "/academia", icon: "🎓", label: "Academia", sub: "Contenido grabado" },
  { href: "/alianzas", icon: "🤝", label: "Alianzas", sub: "Marketplace" },
  { href: "/comunidad", icon: "🌐", label: "Comunidad", sub: "Networking" },
] as const;

async function getGreetingName(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name?.trim();
  return name ? name.split(" ")[0] : (user.email ?? "").split("@")[0];
}

export default async function HomePage() {
  const name = await getGreetingName();

  return (
    <div className="flex flex-col">
      {/* Marca */}
      <div className="mb-4 flex items-center justify-between">
        <span className="bg-gradient-to-r from-white via-brand-dim to-brand-lav bg-clip-text text-[15px] font-black tracking-wide text-transparent">
          FERIA EFFIX
        </span>
        <div className="h-[34px] w-[34px] rounded-full border border-white/25 bg-gradient-to-br from-brand-lav to-[#2a2933]" />
      </div>

      <h1 className="mb-1 text-[22px] font-bold">
        {name ? `Hola, ${name} 👋` : "Hola 👋"}
      </h1>
      <p className="mb-5 text-[12.5px] font-medium text-brand-muted">
        {name
          ? "Bienvenido de nuevo a Feria Effix"
          : "Bienvenido a la app oficial de Feria Effix"}
      </p>

      {/* CTA de cuenta */}
      {name ? (
        <div className="mb-6">
          <Button href="/perfil" variant="ghost" fullWidth>
            Ver mi perfil
          </Button>
        </div>
      ) : (
        <div className="mb-6 flex gap-3">
          <Button href="/ingresar" variant="ghost" className="flex-1">
            Ingresar
          </Button>
          <Button href="/registro" variant="solid" className="flex-1">
            Crear cuenta
          </Button>
        </div>
      )}

      <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[1.3px] text-brand-dim">
        Explora la feria
      </p>

      {/* Grid de modulos */}
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((m) => (
          <GlassCard
            key={m.href}
            href={m.href}
            className="flex min-h-[88px] flex-col justify-between gap-2 px-[13px] py-[15px]"
          >
            <span className="text-[18px] leading-none">{m.icon}</span>
            <span>
              <span className="block text-[12px] font-extrabold leading-tight text-brand-white">
                {m.label}
              </span>
              <span className="block text-[9px] font-medium text-brand-muted">
                {m.sub}
              </span>
            </span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
