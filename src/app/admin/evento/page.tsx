import Badge from "@/components/Badge";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import AutoRefresh from "./AutoRefresh";

const TZ = "America/Bogota";

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

/**
 * DASHBOARD DÍA-DEL-EVENTO (Fase 21): lo que el equipo Effix mira en vivo
 * el 15-19 de octubre. Se refresca solo cada 30s.
 */
export default async function AdminEventoPage() {
  const a = await getAccess();
  const supabase = await createClient();

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [
    { data: connToday },
    { data: scansToday },
    { data: liveTalks },
    { data: lastPush },
    { count: subsCount },
    { count: completions },
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("created_at")
      .gte("created_at", dayStart.toISOString())
      .limit(5000),
    supabase
      .from("stand_scans")
      .select("created_at, stands(name)")
      .gte("created_at", dayStart.toISOString())
      .limit(5000),
    supabase
      .from("talks")
      .select("title,auditorium,starts_at,ends_at")
      .eq("edition", a.currentEdition)
      .eq("status", "active")
      .lte("starts_at", now.toISOString())
      .gte("ends_at", now.toISOString()),
    supabase
      .from("notifications")
      .select("title,category,sent_at,sent_count")
      .order("sent_at", { ascending: false })
      .limit(5),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("passport_completions")
      .select("id", { count: "exact", head: true }),
  ]);

  // Conexiones (escaneos de credencial) por hora, hoy.
  const byHour = new Map<string, number>();
  for (const c of connToday ?? []) {
    const h = hourLabel(c.created_at);
    byHour.set(h, (byHour.get(h) ?? 0) + 1);
  }
  const hours = [...byHour.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  const maxHour = Math.max(1, ...hours.map(([, n]) => n));

  // Sellos por stand, hoy.
  const byStand = new Map<string, number>();
  for (const s of scansToday ?? []) {
    const stand = s.stands as unknown as { name: string } | null;
    const name = stand?.name ?? "—";
    byStand.set(name, (byStand.get(name) ?? 0) + 1);
  }
  const standRank = [...byStand.entries()].sort((x, y) => y[1] - x[1]);

  return (
    <div className="flex flex-col">
      <AutoRefresh />
      <PageHeader
        title="Día del evento"
        subtitle={`En vivo · edición ${a.currentEdition} · se actualiza cada 30s`}
        backHref="/admin"
      />

      {/* Números del día */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4 text-center">
          <p className="text-[24px] font-black text-brand-white">
            {(connToday ?? []).length}
          </p>
          <p className="text-[10px] text-brand-muted">conexiones hoy</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-[24px] font-black text-brand-white">
            {(scansToday ?? []).length}
          </p>
          <p className="text-[10px] text-brand-muted">sellos de stand hoy</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-[24px] font-black text-brand-white">
            {subsCount ?? 0}
          </p>
          <p className="text-[10px] text-brand-muted">dispositivos con push</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-[24px] font-black text-brand-white">
            {completions ?? 0}
          </p>
          <p className="text-[10px] text-brand-muted">pasaportes completados</p>
        </GlassCard>
      </div>

      {/* Sesión en curso por auditorio */}
      <SectionTitle>En el escenario ahora</SectionTitle>
      {(liveTalks ?? []).length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Ninguna charla en curso en este momento.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {(liveTalks ?? []).map((t, i) => (
            <GlassCard key={i} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-brand-white">
                  {t.title}
                </p>
                <p className="text-[10px] text-brand-muted">{t.auditorium ?? "—"}</p>
              </div>
              <Badge dot>En vivo</Badge>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Escaneos por hora */}
      <SectionTitle>Conexiones por hora (hoy)</SectionTitle>
      {hours.length === 0 ? (
        <p className="text-[11px] text-brand-muted">Sin escaneos todavía.</p>
      ) : (
        <GlassCard className="flex flex-col gap-1.5 p-4">
          {hours.map(([h, n]) => (
            <div key={h} className="flex items-center gap-2">
              <span className="w-8 text-[10px] font-bold text-brand-muted">
                {h}h
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-lav"
                  style={{ width: `${(n / maxHour) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-extrabold text-brand-white">
                {n}
              </span>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Sellos por stand */}
      <SectionTitle>Sellos por stand (hoy)</SectionTitle>
      {standRank.length === 0 ? (
        <p className="text-[11px] text-brand-muted">Sin sellos todavía.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {standRank.slice(0, 10).map(([name, n], i) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-2"
            >
              <span className="truncate text-[11px] font-bold text-brand-white">
                {i + 1}. {name}
              </span>
              <span className="text-[11px] font-extrabold text-brand-lav">{n}</span>
            </div>
          ))}
        </div>
      )}

      {/* Últimas push */}
      <SectionTitle>Últimas notificaciones</SectionTitle>
      {(lastPush ?? []).length === 0 ? (
        <p className="text-[11px] text-brand-muted">Nada enviado aún.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(lastPush ?? []).map((n, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-2"
            >
              <span className="min-w-0 truncate text-[11px] font-bold text-brand-white">
                {n.title}
              </span>
              <span className="flex-shrink-0 text-[9.5px] text-brand-muted">
                {n.sent_at.slice(11, 16)} · {n.sent_count ?? 0} push
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[9.5px] leading-relaxed text-brand-muted">
        Nota: las colas offline viven en cada dispositivo (staff y asistentes)
        y se sincronizan solas al recuperar señal — aquí se refleja su
        resultado, no su tamaño.
      </p>
    </div>
  );
}
