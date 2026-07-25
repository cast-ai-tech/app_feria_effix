import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import MiStandClient, {
  type MyStand,
  type StandLead,
  type StandMeetingRow,
} from "@/components/mistand/MiStandClient";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

/**
 * PORTAL DEL EXPOSITOR (Fase 19) — /mi-stand.
 * Gate real: estar en stand_staff (lo asigna el admin). Requiere login;
 * no requiere boleta (el staff del expositor entra con su cuenta).
 */
export default async function MiStandPage() {
  const a = await getAccess();

  if (!a.configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi stand" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }
  if (!a.user) redirect("/ingresar");

  const supabase = await createClient();

  // Stands donde el usuario es staff (RLS: solo ve sus asignaciones).
  const { data: staffRows } = await supabase
    .from("stand_staff")
    .select(
      "stand_id, stands(id,name,category,stand_number,description,logo_url,tier,gallery_urls,video_url,catalog_url,whatsapp_url,zone,edition)",
    )
    .eq("user_id", a.user.id);

  const myStands = (staffRows ?? [])
    .map((r) => r.stands as unknown as MyStand | null)
    .filter(Boolean) as MyStand[];

  if (myStands.length === 0) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Mi stand"
          subtitle="Portal del expositor"
          backHref="/"
        />
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] font-extrabold text-brand-white">
            Tu cuenta no está vinculada a ningún stand
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            Este portal es para el equipo de los expositores de la feria. Si tu
            marca tiene stand, pídele al organizador que agregue tu correo como
            staff del stand — y desde aquí podrás editar el perfil, gestionar
            reuniones y descargar tus leads.
          </p>
        </GlassCard>
      </div>
    );
  }

  const standIds = myStands.map((s) => s.id);

  // Leads (stand_scans de la Fase 15) + reuniones. RLS: el staff ve ambos.
  const [{ data: scans }, { data: meetings }] = await Promise.all([
    supabase
      .from("stand_scans")
      .select("stand_id,profile_id,created_at")
      .in("stand_id", standIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("stand_meetings")
      .select("id,stand_id,user_id,message,intent,status,slot_note,created_at")
      .in("stand_id", standIds)
      .order("created_at", { ascending: false }),
  ]);

  // Perfiles públicos (community_directory respeta share_* de privacidad).
  const profileIds = [
    ...new Set([
      ...(scans ?? []).map((s) => s.profile_id),
      ...(meetings ?? []).map((m) => m.user_id),
    ]),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("community_directory")
        .select("id,full_name,country,role,whatsapp,instagram,linkedin")
        .in("id", profileIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const leads: StandLead[] = (scans ?? []).map((s) => {
    const p = byId.get(s.profile_id);
    return {
      standId: s.stand_id,
      profileId: s.profile_id,
      fullName: p?.full_name ?? null,
      role: p?.role ?? null,
      country: p?.country ?? null,
      whatsapp: p?.whatsapp ?? null,
      instagram: p?.instagram ?? null,
      linkedin: p?.linkedin ?? null,
      createdAt: s.created_at,
    };
  });

  const meetingRows: StandMeetingRow[] = (meetings ?? []).map((m) => {
    const p = byId.get(m.user_id);
    return {
      id: m.id,
      standId: m.stand_id,
      requesterName: p?.full_name ?? "Asistente",
      requesterRole: p?.role ?? null,
      requesterCountry: p?.country ?? null,
      message: m.message,
      intent: m.intent,
      status: m.status,
      slotNote: m.slot_note,
      createdAt: m.created_at,
    };
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi stand"
        subtitle="Portal del expositor · perfil, reuniones y leads"
        backHref="/"
      />
      <MiStandClient stands={myStands} leads={leads} meetings={meetingRows} />
    </div>
  );
}
