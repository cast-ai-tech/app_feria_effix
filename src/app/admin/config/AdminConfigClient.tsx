"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { isPlaceholderUrl } from "@/lib/placeholders";
import { updateConfigValue } from "./actions";

export type ConfigEntry = {
  key: string;
  value: string | null;
  description: string | null;
};

const INPUT =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-[13px] " +
  "text-brand-white placeholder:text-brand-muted outline-none " +
  "focus:border-brand-lav focus:ring-1 focus:ring-brand-lav/60";

/** ¿El valor sigue siendo un placeholder/TBD que no debe salir a producción? */
function isPending(entry: ConfigEntry): boolean {
  return (
    isPlaceholderUrl(entry.value) ||
    (entry.description ?? "").toUpperCase().includes("TBD")
  );
}

function ConfigRow({ entry }: { entry: ConfigEntry }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(entry.value ?? "");
  const [note, setNote] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("key", entry.key);
      fd.set("value", value);
      const res = await updateConfigValue(fd);
      setNote(res.error ? `Error: ${res.error}` : "Guardado ✓");
    });
  }

  return (
    <GlassCard className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="break-all text-[11.5px] font-extrabold text-brand-white">
          {entry.key}
        </p>
        {isPending(entry) && (
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-400/50 px-2 py-0.5 text-[9px] font-bold text-amber-300">
            <TriangleAlert className="h-2.5 w-2.5" aria-hidden /> placeholder
          </span>
        )}
      </div>
      {entry.description && (
        <p className="text-[10px] leading-relaxed text-brand-muted">
          {entry.description}
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT}
          placeholder="(sin valor)"
        />
        <Button variant="ghost" onClick={save} disabled={pending}>
          {pending ? "…" : "Guardar"}
        </Button>
      </div>
      {note && (
        <p className="text-[10px] font-semibold text-brand-white">{note}</p>
      )}
    </GlassCard>
  );
}

export default function AdminConfigClient({
  entries,
}: {
  entries: ConfigEntry[];
}) {
  const pendingCount = entries.filter(isPending).length;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle className="mt-0">
        Configuración operativa ({entries.length})
      </SectionTitle>
      {pendingCount > 0 && (
        <GlassCard className="p-3">
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-300">
            <TriangleAlert className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden />{" "}
            {pendingCount}{" "}
            {pendingCount === 1
              ? "valor sigue siendo placeholder/TBD"
              : "valores siguen siendo placeholder/TBD"}{" "}
            — reemplázalos antes del evento.
          </p>
        </GlassCard>
      )}
      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <ConfigRow key={e.key} entry={e} />
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-brand-muted">
        Estos valores se leen en vivo desde la tabla app_config: WhatsApp de
        boletas Black, ventana de reembolso, fechas de respaldo. Las fechas y
        días oficiales de cada edición viven en la tabla editions.
      </p>
    </div>
  );
}
