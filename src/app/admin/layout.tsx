import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";

/**
 * Layout del panel de administrador. Protege TODO /admin por rol admin.
 * (En la Fase 11 se le añade la navegación consolidada del panel.)
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccess();
  if (!access.configured) redirect("/");
  if (!access.user) redirect("/ingresar");
  if (!access.isAdmin) redirect("/");
  return <>{children}</>;
}
