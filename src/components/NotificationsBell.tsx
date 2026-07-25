"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

/**
 * Campana de notificaciones (Fase 16; reposicionada en Fase 24).
 * - variant="floating": móvil/tablet — absoluta DENTRO del shell de la app
 *   (nunca flotando en la esquina de la pantalla).
 * - variant="inline": desktop — vive dentro del header del layout.
 * Se oculta sin sesión y en admin/proyector.
 */
export default function NotificationsBell({
  variant = "floating",
}: {
  variant?: "floating" | "inline";
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: notifs }, { data: reads }] = await Promise.all([
        supabase.from("notifications").select("id").limit(100),
        supabase.from("notification_reads").select("notification_id"),
      ]);
      if (cancelled) return;
      const readSet = new Set((reads ?? []).map((r) => r.notification_id));
      setUnread((notifs ?? []).filter((n) => !readSet.has(n.id)).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (
    unread === null ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/proyector")
  ) {
    return null;
  }

  return (
    <Link
      href="/notificaciones"
      aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[rgba(10,10,12,0.85)] text-brand-white backdrop-blur-md transition-colors duration-150 hover:border-white/40",
        variant === "floating" &&
          "absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 lg:hidden",
      )}
    >
      <Bell className="h-[18px] w-[18px]" aria-hidden />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
