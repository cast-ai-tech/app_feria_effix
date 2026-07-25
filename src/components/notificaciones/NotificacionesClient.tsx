"use client";

import { BellOff } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import GlassCard from "@/components/GlassCard";
import PushOptIn from "@/components/PushOptIn";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  category: string;
  sentAt: string;
  read: boolean;
};

export default function NotificacionesClient({
  items,
}: {
  items: NotificationItem[];
}) {
  const [list, setList] = useState(items);

  // Al abrir el centro, todo lo visible queda marcado como leído.
  useEffect(() => {
    const unread = items.filter((i) => !i.read);
    if (unread.length === 0) return;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notification_reads").upsert(
        unread.map((i) => ({ notification_id: i.id, user_id: user.id })),
        { onConflict: "notification_id,user_id", ignoreDuplicates: true },
      );
      setList((l) => l.map((i) => ({ ...i, read: true })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <PushOptIn reason="Entérate al instante de cambios de agenda, nuevas conexiones y avisos del evento — incluso con la app cerrada." />

      {list.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" aria-hidden />}
          title="Sin notificaciones"
          subtitle="Aquí verás los avisos del evento: cambios de agenda, conexiones nuevas y novedades."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2">
          {list.map((n) => {
            const inner = (
              <GlassCard
                className={cn(
                  "flex flex-col gap-1 p-4",
                  !n.read && "border-brand-lav/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-extrabold text-brand-white">
                    
                    {n.title}
                  </p>
                  <span className="flex-shrink-0 text-[9px] text-brand-muted">
                    {n.sentAt.slice(5, 16).replace("T", " ")}
                  </span>
                </div>
                {n.body && (
                  <p className="text-[10.5px] leading-relaxed text-brand-muted">
                    {n.body}
                  </p>
                )}
                {n.url && (
                  <span className="text-[10px] font-bold text-brand-lav">
                    Abrir →
                  </span>
                )}
              </GlassCard>
            );
            return n.url ? (
              <Link key={n.id} href={n.url}>
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
