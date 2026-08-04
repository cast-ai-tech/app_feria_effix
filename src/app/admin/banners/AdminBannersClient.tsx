"use client";

import { useRef, useState, useTransition } from "react";
import { Download, ImageUp, TriangleAlert } from "lucide-react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { ctr } from "@/lib/banners";
import { createBanner, toggleBanner, deleteBanner } from "./actions";

export type AdminBanner = {
  id: string;
  placement: string;
  module_key: string | null;
  sponsor_tier: string | null;
  sponsor_id: string | null;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  active: boolean;
  edition: number;
  impressions: number;
  clicks: number;
};

export type SponsorOption = { id: string; name: string };

const PLACEMENT_OPTIONS = [
  {
    value: "splash_sponsor",
    label: 'Splash al abrir — "Con el apoyo de" (logo)',
  },
  { value: "home_hero", label: "Home — carrusel principal (16:7)" },
  { value: "home_inline", label: "Home — banner intermedio (4:1)" },
  { value: "module_top", label: "Módulo — banner superior (4:1)" },
  { value: "footer_strip", label: 'Franja "Patrocinan" (logos)' },
];

/** Preview visual del placement: proporción y contexto donde aparece. */
function PlacementPreview({ placement }: { placement: string }) {
  const box = "rounded-[6px] border border-white/20 bg-white/[0.08]";
  return (
    <div className="rounded-[12px] border border-white/10 bg-black/40 p-3">
      <p className="mb-2 text-[10px] font-bold text-brand-muted">
        Vista previa de la ubicación
      </p>
      <div className="mx-auto flex w-28 flex-col gap-1 rounded-[10px] border border-white/15 p-1.5">
        {placement === "splash_sponsor" ? (
          <div
            className={`${box} flex aspect-[9/16] items-center justify-center`}
          >
            <div className="h-6 w-10 rounded bg-brand-lav/60" />
          </div>
        ) : (
          <>
            <div className="h-2 w-full rounded bg-white/15" />
            {placement === "home_hero" && (
              <div className={`${box} aspect-[16/7] bg-brand-lav/50`} />
            )}
            <div className="h-4 w-full rounded bg-white/10" />
            {(placement === "home_inline" || placement === "module_top") && (
              <div className={`${box} aspect-[4/1] bg-brand-lav/50`} />
            )}
            <div className="grid grid-cols-2 gap-1">
              <div className="h-6 rounded bg-white/10" />
              <div className="h-6 rounded bg-white/10" />
            </div>
            {placement === "footer_strip" && (
              <div className="grid grid-cols-3 gap-1">
                <div className="h-3 rounded bg-brand-lav/50" />
                <div className="h-3 rounded bg-brand-lav/50" />
                <div className="h-3 rounded bg-brand-lav/50" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const MODULE_OPTIONS = [
  { value: "agenda", label: "Agenda" },
  { value: "stands", label: "Stands" },
  { value: "ponentes", label: "Ponentes" },
  { value: "academia", label: "Academia" },
  { value: "alianzas", label: "Alianzas" },
  { value: "mapa", label: "Mapa" },
  { value: "comunidad", label: "Comunidad" },
  { value: "credencial", label: "Credencial" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "tickets", label: "Mi escarapela" },
  { value: "notificaciones", label: "Avisos" },
  { value: "beneficios", label: "Beneficios" },
];

const TIER_OPTIONS = [
  { value: "", label: "Sin nivel" },
  { value: "basico", label: "Básico" },
  { value: "plata", label: "Plata" },
  { value: "oro", label: "Oro" },
  { value: "diamante", label: "Diamante" },
  { value: "black", label: "Black" },
];

export default function AdminBannersClient({
  banners,
  sponsors,
  currentEdition,
}: {
  banners: AdminBanner[];
  sponsors: SponsorOption[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [placement, setPlacement] = useState("home_hero");
  const [moduleKey, setModuleKey] = useState("agenda");
  const [tier, setTier] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sponsorName = (id: string | null) =>
    id ? sponsors.find((s) => s.id === id)?.name : undefined;

  function run(
    fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
    fd: FormData,
    reset?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  }

  /** Sube la imagen al bucket público `banners` y guarda su URL. */
  async function uploadImage(file: File) {
    setUploading(true);
    setNote(null);
    const supabase = createClient();
    const path = `${currentEdition}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage
      .from("banners")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      setNote(`Error subiendo la imagen: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  function exportCsv() {
    const header =
      "titulo,placement,modulo,nivel,patrocinador,activo,impresiones,clics,ctr_pct";
    const lines = banners.map((b) =>
      [
        b.title,
        b.placement,
        b.module_key ?? "",
        b.sponsor_tier ?? "",
        sponsorName(b.sponsor_id) ?? "",
        b.active ? "si" : "no",
        String(b.impressions),
        String(b.clicks),
        ctr(b.impressions, b.clicks).toFixed(2),
      ]
        .map((v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(","),
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banners-metricas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Crear banner */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nuevo banner</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            fd.set("image_url", imageUrl);
            run(createBanner, fd, () => {
              form.reset();
              setImageUrl("");
              setSponsorId("");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label="Patrocinador / título"
            name="title"
            placeholder="Ej. Banco Aliado — campaña stands"
            required
          />
          <SelectField
            label="Ubicación (placement)"
            name="placement"
            value={placement}
            onChange={setPlacement}
            options={PLACEMENT_OPTIONS}
          />
          <PlacementPreview placement={placement} />
          {placement === "module_top" && (
            <SelectField
              label="Módulo"
              name="module_key"
              value={moduleKey}
              onChange={setModuleKey}
              options={MODULE_OPTIONS}
            />
          )}
          <SelectField
            label="Nivel de patrocinio (opcional)"
            name="sponsor_tier"
            value={tier}
            onChange={setTier}
            options={TIER_OPTIONS}
          />
          <SelectField
            label="Patrocinador (opcional)"
            name="sponsor_id"
            value={sponsorId}
            onChange={setSponsorId}
            options={[
              { value: "", label: "Sin patrocinador" },
              ...sponsors.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Field
            label="Link al tocar (opcional)"
            name="link_url"
            placeholder="https://…"
          />
          <Field label="Orden" name="sort_order" placeholder="100" />

          {/* Subida de imagen a Supabase Storage */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-brand-dim">
              Imagen del banner
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadImage(f);
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <span className="flex items-center gap-1.5">
                  <ImageUp className="h-4 w-4" aria-hidden />
                  {uploading
                    ? "Subiendo…"
                    : imageUrl
                      ? "Cambiar imagen"
                      : "Subir imagen"}
                </span>
              </Button>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="h-12 rounded-[10px] border border-white/15 object-cover"
                />
              )}
            </div>
            {!imageUrl && (
              <p className="flex items-center gap-1 text-[9.5px] text-brand-muted">
                <TriangleAlert className="h-3 w-3" aria-hidden />
                Recomendado: 1200×525 (hero), 1200×300 (inline/módulo), logo
                cuadrado (franja).
              </p>
            )}
            {placement === "home_hero" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-brand-dim">
                  … o pega un link de YouTube (video de fondo sin controles, ej.
                  el recap de la feria):
                </p>
                <input
                  value={imageUrl.includes("youtu") ? imageUrl : ""}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
                />
              </div>
            )}
          </div>

          <input type="hidden" name="edition" value={currentEdition} />
          <Button
            type="submit"
            variant="ghost"
            fullWidth
            disabled={pending || !imageUrl}
          >
            {pending ? "Guardando…" : "Crear banner (queda inactivo)"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      {/* Métricas — lo que el equipo comercial vende y renueva */}
      <div className="flex items-center justify-between">
        <SectionTitle>Banners y métricas ({banners.length})</SectionTitle>
        {banners.length > 0 && (
          <button
            onClick={exportCsv}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/35 px-3 text-[10px] font-extrabold text-brand-white"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> CSV
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {banners.length === 0 ? (
          <p className="text-[11px] text-brand-muted">
            Sin banners todavía. Crea el primero arriba: queda inactivo hasta
            que lo actives.
          </p>
        ) : (
          banners.map((b) => (
            <GlassCard key={b.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url}
                  alt=""
                  className="h-12 w-20 flex-shrink-0 rounded-[10px] border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-extrabold text-brand-white">
                    {b.title}
                  </p>
                  <p className="truncate text-[10px] text-brand-muted">
                    {PLACEMENT_OPTIONS.find((p) => p.value === b.placement)
                      ?.label ?? b.placement}
                    {b.module_key ? ` · ${b.module_key}` : ""}
                    {b.sponsor_tier ? ` · ${b.sponsor_tier}` : ""}
                    {sponsorName(b.sponsor_id)
                      ? ` · ${sponsorName(b.sponsor_id)}`
                      : ""}{" "}
                    · Ed. {b.edition}
                  </p>
                </div>
                <Badge dot={b.active}>{b.active ? "Activo" : "Inactivo"}</Badge>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-brand-dim">
                <span>{b.impressions} impresiones</span>
                <span>{b.clicks} clics</span>
                <span className="text-brand-lav">
                  CTR {ctr(b.impressions, b.clicks).toFixed(1)}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={(fd) => run(toggleBanner, fd)}>
                  <input type="hidden" name="id" value={b.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={b.active ? "true" : "false"}
                  />
                  <button className="min-h-9 rounded-full border border-white/25 px-3 text-[9.5px] font-bold text-brand-dim">
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form
                  action={(fd) => run(deleteBanner, fd)}
                  onSubmit={(e) => {
                    if (
                      !confirm(
                        "¿Eliminar este banner y sus métricas? No se puede deshacer.",
                      )
                    )
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={b.id} />
                  <button className="min-h-9 rounded-full border border-red-400/40 px-3 text-[9.5px] font-bold text-red-300">
                    Eliminar
                  </button>
                </form>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
