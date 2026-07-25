"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_ROLES, OTHER_ROLE_VALUE } from "@/lib/roles";
import { clearCachedTickets } from "@/lib/ticketStore";

type ProfileData = {
  full_name: string;
  country: string;
  role: string;
  bio: string;
  ticket_email: string;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  share_whatsapp: boolean;
  share_instagram: boolean;
  share_linkedin: boolean;
  optout_marketing_push: boolean;
};

type RoleOption = { value: string; label: string };

export default function ProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: ProfileData;
}) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData>(initial);
  const [roles, setRoles] = useState<RoleOption[]>([...DEFAULT_ROLES]);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿El rol guardado está fuera de la lista? -> tratarlo como "Otro".
  const knownRole = (list: RoleOption[]) =>
    list.some((r) => r.value === initial.role);
  const [useCustomRole, setUseCustomRole] = useState(
    initial.role !== "" && !knownRole([...DEFAULT_ROLES]),
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("roles")
      .select("slug,label")
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const list = data.map((r) => ({ value: r.slug, label: r.label }));
          setRoles(list);
          setUseCustomRole(initial.role !== "" && !knownRole(list));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      router.push("/ingresar");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name.trim() || null,
        country: data.country.trim() || null,
        role: data.role.trim() || null,
        bio: data.bio.trim() || null,
        ticket_email: data.ticket_email.trim() || null,
        whatsapp: data.whatsapp.trim() || null,
        instagram: data.instagram.trim() || null,
        linkedin: data.linkedin.trim() || null,
        share_whatsapp: data.share_whatsapp,
        share_instagram: data.share_instagram,
        share_linkedin: data.share_linkedin,
        optout_marketing_push: data.optout_marketing_push,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Perfil guardado ✓");
    router.refresh();
  }

  async function handleLogout() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // La semilla TOTP cacheada no debe sobrevivir al cierre de sesión
    // (hallazgo #13): sin esto, el QR de la boleta queda en el dispositivo.
    await clearCachedTickets();
    router.push("/");
    router.refresh();
  }

  const roleSelectValue = useCustomRole ? OTHER_ROLE_VALUE : data.role;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-brand-lav to-[#2a2933]">
            <UserRound className="h-5 w-5 text-brand-white" aria-hidden />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-brand-white">
              {data.full_name || "Sin nombre"}
            </p>
            <p className="text-[10.5px] text-brand-muted">{email}</p>
          </div>
        </div>

        <Field
          label="Nombre completo"
          name="full_name"
          value={data.full_name}
          onChange={(v) => set("full_name", v)}
        />
        <Field
          label="País"
          name="country"
          value={data.country}
          onChange={(v) => set("country", v)}
        />
        <SelectField
          label="Rol / categoría"
          name="role"
          value={roleSelectValue}
          onChange={(v) => {
            if (v === OTHER_ROLE_VALUE) {
              setUseCustomRole(true);
              set("role", "");
            } else {
              setUseCustomRole(false);
              set("role", v);
            }
          }}
          placeholder="Selecciona tu rol"
          options={[...roles, { value: OTHER_ROLE_VALUE, label: "Otro…" }]}
        />
        {useCustomRole && (
          <Field
            label="Especifica tu rol"
            name="custom_role"
            value={data.role}
            onChange={(v) => set("role", v)}
            placeholder="Ej. Consultor…"
          />
        )}
        <TextAreaField
          label="Bio corta"
          name="bio"
          value={data.bio}
          onChange={(v) => set("bio", v)}
          placeholder="Cuéntanos a qué te dedicas…"
        />
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-5">
        <SectionTitle className="mt-0">Vinculación de boleta</SectionTitle>
        <Field
          label="Correo de compra de la boleta"
          name="ticket_email"
          type="email"
          value={data.ticket_email}
          onChange={(v) => set("ticket_email", v)}
          placeholder="El correo con el que compraste en La Tiquetera"
        />
        <p className="-mt-1 text-[10px] leading-relaxed text-brand-muted">
          Si compraste tu boleta con un correo distinto al de tu cuenta,
          ponlo aquí para poder vincularla (Fase 3).
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-5">
        <SectionTitle className="mt-0">Redes para Comunidad</SectionTitle>
        <Field
          label="WhatsApp"
          name="whatsapp"
          value={data.whatsapp}
          onChange={(v) => set("whatsapp", v)}
          placeholder="+57 300 000 0000"
        />
        <Field
          label="Instagram"
          name="instagram"
          value={data.instagram}
          onChange={(v) => set("instagram", v)}
          placeholder="@usuario"
        />
        <Field
          label="LinkedIn"
          name="linkedin"
          value={data.linkedin}
          onChange={(v) => set("linkedin", v)}
          placeholder="linkedin.com/in/usuario"
        />
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-brand-dim">
            Qué compartes al conectar (Credencial y Comunidad)
          </p>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-white">
            <input
              type="checkbox"
              checked={data.share_whatsapp}
              onChange={(e) => set("share_whatsapp", e.target.checked)}
            />
            Compartir WhatsApp
          </label>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-white">
            <input
              type="checkbox"
              checked={data.share_instagram}
              onChange={(e) => set("share_instagram", e.target.checked)}
            />
            Compartir Instagram
          </label>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-white">
            <input
              type="checkbox"
              checked={data.share_linkedin}
              onChange={(e) => set("share_linkedin", e.target.checked)}
            />
            Compartir LinkedIn
          </label>
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Notificaciones</SectionTitle>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-white">
          <input
            type="checkbox"
            checked={!data.optout_marketing_push}
            onChange={(e) => set("optout_marketing_push", !e.target.checked)}
          />
          Recibir novedades y promociones (push de marketing)
        </label>
        <p className="-mt-1 text-[10px] leading-relaxed text-brand-muted">
          Los avisos operativos (cambios de agenda, conexiones, sellos) llegan
          siempre — son parte del servicio del evento.
        </p>
      </GlassCard>

      {error && (
        <p className="text-[11px] font-semibold text-red-300">{error}</p>
      )}
      {message && (
        <p className="text-[11px] font-semibold text-emerald-300">{message}</p>
      )}

      <Button type="submit" fullWidth size="md" disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={handleLogout}
        disabled={signingOut}
      >
        {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </form>
  );
}
