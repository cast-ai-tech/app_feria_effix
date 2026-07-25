import { Store, Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import BannerSlot from "@/components/BannerSlot";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function PerfilPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Mi perfil" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/ingresar");
  }

  const [{ data: profile }, { data: staffRows }, { data: activeEd }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name,country,role,bio,ticket_email,whatsapp,instagram,linkedin,share_whatsapp,share_instagram,share_linkedin,optout_marketing_push,is_admin",
      )
      .eq("id", user.id)
      .single(),
    supabase.from("stand_staff").select("id").eq("user_id", user.id).limit(1),
    supabase.from("editions").select("year").eq("is_active", true).maybeSingle(),
  ]);
  const isStandStaff = (staffRows ?? []).length > 0;
  const currentEdition = activeEd?.year ?? 2026;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Mi perfil"
        subtitle="Estos datos alimentan tu tarjeta en Comunidad"
        backHref="/"
      />
      {profile?.is_admin && (
        <a
          href="/admin"
          className="mb-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-brand-lav-glass px-5 py-3 text-[12px] font-extrabold text-brand-white"
        >
          <span className="flex items-center gap-2"><Wrench className="h-4 w-4" aria-hidden /> Panel de administrador</span>
          <span className="text-brand-muted">›</span>
        </a>
      )}
      {isStandStaff && (
        <a
          href="/mi-stand"
          className="mb-4 flex items-center justify-between rounded-[18px] border border-white/15 bg-brand-lav-glass px-5 py-3 text-[12px] font-extrabold text-brand-white"
        >
          <span className="flex items-center gap-2"><Store className="h-4 w-4" aria-hidden /> Mi stand (portal del expositor)</span>
          <span className="text-brand-muted">›</span>
        </a>
      )}

      <ProfileForm
        email={user.email ?? ""}
        initial={{
          full_name: profile?.full_name ?? "",
          country: profile?.country ?? "",
          role: profile?.role ?? "",
          bio: profile?.bio ?? "",
          ticket_email: profile?.ticket_email ?? user.email ?? "",
          whatsapp: profile?.whatsapp ?? "",
          instagram: profile?.instagram ?? "",
          linkedin: profile?.linkedin ?? "",
          share_whatsapp: profile?.share_whatsapp ?? true,
          share_instagram: profile?.share_instagram ?? true,
          share_linkedin: profile?.share_linkedin ?? true,
          optout_marketing_push: profile?.optout_marketing_push ?? false,
        }}
      />

      {/* Franja de patrocinadores (Fase 24) */}
      <BannerSlot
        placement="footer_strip"
        edition={currentEdition}
        className="mt-8"
      />
    </div>
  );
}
