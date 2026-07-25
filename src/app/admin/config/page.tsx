import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import AdminConfigClient, { type ConfigEntry } from "./AdminConfigClient";

export default async function AdminConfigPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_config")
    .select("key,value,description")
    .order("key");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Configuración"
        subtitle="Parámetros operativos de la app (app_config)"
        backHref="/admin"
      />
      <AdminConfigClient entries={(data ?? []) as ConfigEntry[]} />
    </div>
  );
}
