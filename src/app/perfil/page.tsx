import { redirect } from "next/navigation";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,country,role,bio,ticket_email,whatsapp,instagram,linkedin,is_admin")
    .eq("id", user.id)
    .single();

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
          <span>🛠️ Panel de administrador</span>
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
        }}
      />
    </div>
  );
}
