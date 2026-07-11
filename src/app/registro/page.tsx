"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import SupabaseNotice from "@/components/SupabaseNotice";
import { Field, SelectField, TextAreaField } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_ROLES, OTHER_ROLE_VALUE } from "@/lib/roles";
import GoogleButton from "@/components/GoogleButton";

type RoleOption = { value: string; label: string };

export default function RegistroPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [bio, setBio] = useState("");

  const [roles, setRoles] = useState<RoleOption[]>([...DEFAULT_ROLES]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  // Carga la lista de roles desde la BD (ampliable); respaldo: DEFAULT_ROLES.
  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase
      .from("roles")
      .select("slug,label")
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRoles(data.map((r) => ({ value: r.slug, label: r.label })));
        }
      });
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalRole =
      role === OTHER_ROLE_VALUE ? customRole.trim() : role;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
          country: country.trim(),
          role: finalRole,
          bio: bio.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Si la confirmación por correo está activa, aún no hay sesión.
    if (data.session) {
      router.push("/perfil");
    } else {
      setCheckEmail(true);
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Crear cuenta" backHref="/" />
        <SupabaseNotice />
      </div>
    );
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Revisa tu correo" backHref="/" />
        <GlassCard sheen className="p-6 text-center">
          <p className="text-[28px]">📬</p>
          <p className="mt-2 text-[13px] font-extrabold text-brand-white">
            Te enviamos un enlace de confirmación
          </p>
          <p className="mt-2 text-[11.5px] text-brand-muted">
            Confirma tu correo <b className="text-brand-dim">{email}</b> para
            activar tu cuenta. Luego podrás iniciar sesión.
          </p>
          <div className="mt-5">
            <Button href="/ingresar" fullWidth>
              Ir a iniciar sesión
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Crear cuenta"
        subtitle="Únete a la comunidad de Feria Effix"
        backHref="/"
      />

      <GlassCard className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Nombre completo"
            name="full_name"
            required
            value={fullName}
            onChange={setFullName}
            placeholder="Juan David Carmona"
            autoComplete="name"
          />
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            required
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
          <Field
            label="País"
            name="country"
            value={country}
            onChange={setCountry}
            placeholder="Colombia"
            autoComplete="country-name"
          />
          <SelectField
            label="Rol / categoría"
            name="role"
            value={role}
            onChange={setRole}
            placeholder="Selecciona tu rol"
            options={[...roles, { value: OTHER_ROLE_VALUE, label: "Otro…" }]}
          />
          {role === OTHER_ROLE_VALUE && (
            <Field
              label="Especifica tu rol"
              name="custom_role"
              value={customRole}
              onChange={setCustomRole}
              placeholder="Ej. Consultor, Desarrollador…"
            />
          )}
          <TextAreaField
            label="Bio corta (opcional)"
            name="bio"
            value={bio}
            onChange={setBio}
            placeholder="Cuéntanos a qué te dedicas…"
          />

          {error && (
            <p className="text-[11px] font-semibold text-red-300">{error}</p>
          )}

          <Button type="submit" fullWidth size="md" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-bold text-brand-muted">o</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleButton label="Registrarme con Google" />

        <p className="mt-5 text-center text-[11px] text-brand-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-bold text-brand-white">
            Inicia sesión
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
