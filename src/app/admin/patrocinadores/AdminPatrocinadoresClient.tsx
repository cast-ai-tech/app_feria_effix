"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField } from "@/components/Field";
import {
  upsertSponsor,
  deleteSponsor,
  addSponsorStaff,
  removeSponsorStaff,
  linkBannerToSponsor,
} from "./actions";

export type AdminSponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  tier: string;
  edition: number;
  active: boolean;
};

export type SponsorStaffRow = {
  id: string;
  sponsor_id: string;
  label: string;
};

export type BannerOption = {
  id: string;
  title: string;
  placement: string;
  sponsor_id: string | null;
  edition: number;
};

type Runner = (
  fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
  fd: FormData,
  reset?: () => void,
) => void;

const TIER_OPTIONS = [
  { value: "basico", label: "Básico" },
  { value: "plata", label: "Plata" },
  { value: "oro", label: "Oro" },
  { value: "diamante", label: "Diamante" },
  { value: "black", label: "Black" },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

function SponsorRow({
  sponsor,
  staff,
  linkedBanners,
  run,
  pending,
}: {
  sponsor: AdminSponsor;
  staff: SponsorStaffRow[];
  linkedBanners: BannerOption[];
  run: Runner;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sponsor.name);
  const [logoUrl, setLogoUrl] = useState(sponsor.logo_url ?? "");
  const [website, setWebsite] = useState(sponsor.website ?? "");
  const [tier, setTier] = useState(sponsor.tier);
  const [active, setActive] = useState(sponsor.active ? "true" : "false");
  const [staffEmail, setStaffEmail] = useState("");

  function save() {
    const fd = new FormData();
    fd.set("id", sponsor.id);
    fd.set("name", name);
    fd.set("logo_url", logoUrl);
    fd.set("website", website);
    fd.set("tier", tier);
    fd.set("active", active);
    fd.set("edition", String(sponsor.edition));
    run(upsertSponsor, fd);
  }

  function addStaff() {
    const fd = new FormData();
    fd.set("sponsor_id", sponsor.id);
    fd.set("email", staffEmail);
    run(addSponsorStaff, fd, () => setStaffEmail(""));
  }

  return (
    <GlassCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold text-brand-white">
            {sponsor.name}
          </p>
          <p className="truncate text-[10px] text-brand-muted">
            {TIER_OPTIONS.find((t) => t.value === sponsor.tier)?.label ??
              sponsor.tier}{" "}
            · Ed. {sponsor.edition}
            {linkedBanners.length > 0 && ` · ${linkedBanners.length} banner(s)`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge dot={sponsor.active}>
            {sponsor.active ? "Activo" : "Inactivo"}
          </Badge>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full border border-white/25 px-3 py-1 text-[9.5px] font-bold text-brand-dim"
          >
            {open ? "Cerrar" : "Gestionar"}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
          <Field
            label="Nombre"
            name={`name-${sponsor.id}`}
            value={name}
            onChange={setName}
          />
          <Field
            label="Logo (URL)"
            name={`logo-${sponsor.id}`}
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://…"
          />
          <Field
            label="Sitio web"
            name={`website-${sponsor.id}`}
            value={website}
            onChange={setWebsite}
            placeholder="https://…"
          />
          <SelectField
            label="Nivel"
            name={`tier-${sponsor.id}`}
            value={tier}
            onChange={setTier}
            options={TIER_OPTIONS}
          />
          <SelectField
            label="Estado"
            name={`active-${sponsor.id}`}
            value={active}
            onChange={setActive}
            options={ACTIVE_OPTIONS}
          />
          <Button variant="ghost" onClick={save} disabled={pending}>
            Guardar cambios
          </Button>

          {/* Staff del patrocinador */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
            <p className="text-[11px] font-bold text-brand-dim">
              Staff autorizado ({staff.length}) — usa /mi-patrocinio
            </p>
            {staff.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2"
              >
                <p className="truncate text-[10.5px] text-brand-white">
                  {m.label}
                </p>
                <form action={(fd) => run(removeSponsorStaff, fd)}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9px] font-bold text-red-300">
                    Quitar
                  </button>
                </form>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="correo@delpatrocinador.com"
                className="w-full rounded-[14px] border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] text-brand-white placeholder:text-brand-muted outline-none focus:border-brand-lav"
              />
              <Button
                variant="ghost"
                onClick={addStaff}
                disabled={pending || !staffEmail}
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Banners vinculados */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
            <p className="text-[11px] font-bold text-brand-dim">
              Banners vinculados ({linkedBanners.length})
            </p>
            {linkedBanners.length === 0 ? (
              <p className="text-[10px] text-brand-muted">
                Sin banners vinculados todavía (vincula abajo o desde
                /admin/banners).
              </p>
            ) : (
              linkedBanners.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2"
                >
                  <p className="truncate text-[10.5px] text-brand-white">
                    {b.title}
                  </p>
                  <form action={(fd) => run(linkBannerToSponsor, fd)}>
                    <input type="hidden" name="banner_id" value={b.id} />
                    <input type="hidden" name="sponsor_id" value="" />
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9px] font-bold text-red-300">
                      Desvincular
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>

          <form
            action={(fd) => run(deleteSponsor, fd)}
            onSubmit={(e) => {
              if (
                !confirm(
                  "¿Eliminar este patrocinador? Se desvinculan sus banners y stands. Esta acción no se puede deshacer.",
                )
              )
                e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={sponsor.id} />
            <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
              Eliminar patrocinador
            </button>
          </form>
        </div>
      )}
    </GlassCard>
  );
}

function BannerLinkRow({
  banner,
  sponsors,
  run,
  pending,
}: {
  banner: BannerOption;
  sponsors: AdminSponsor[];
  run: Runner;
  pending: boolean;
}) {
  const [sponsorId, setSponsorId] = useState(banner.sponsor_id ?? "");

  function save() {
    const fd = new FormData();
    fd.set("banner_id", banner.id);
    fd.set("sponsor_id", sponsorId);
    run(linkBannerToSponsor, fd);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <SelectField
          label={`${banner.title} (${banner.placement})`}
          name={`banner-sponsor-${banner.id}`}
          value={sponsorId}
          onChange={setSponsorId}
          options={[
            { value: "", label: "Sin patrocinador" },
            ...sponsors.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </div>
      <Button
        variant="ghost"
        onClick={save}
        disabled={pending || sponsorId === (banner.sponsor_id ?? "")}
      >
        Guardar
      </Button>
    </div>
  );
}

export default function AdminPatrocinadoresClient({
  sponsors,
  staff,
  banners,
  currentEdition,
}: {
  sponsors: AdminSponsor[];
  staff: SponsorStaffRow[];
  banners: BannerOption[];
  currentEdition: number;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [tier, setTier] = useState("basico");

  const run: Runner = (fn, fd, reset) => {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Crear patrocinador */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Nuevo patrocinador</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(upsertSponsor, new FormData(form), () => {
              form.reset();
              setTier("basico");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label="Nombre"
            name="name"
            placeholder="Nombre del patrocinador"
            required
          />
          <Field label="Logo (URL)" name="logo_url" placeholder="https://…" />
          <Field label="Sitio web" name="website" placeholder="https://…" />
          <SelectField
            label="Nivel"
            name="tier"
            value={tier}
            onChange={setTier}
            options={TIER_OPTIONS}
          />
          <input type="hidden" name="active" value="true" />
          <input type="hidden" name="edition" defaultValue={currentEdition} />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Crear patrocinador"}
          </Button>
        </form>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Patrocinadores ({sponsors.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {sponsors.map((s) => (
          <SponsorRow
            key={s.id}
            sponsor={s}
            staff={staff.filter((m) => m.sponsor_id === s.id)}
            linkedBanners={banners.filter((b) => b.sponsor_id === s.id)}
            run={run}
            pending={pending}
          />
        ))}
      </div>

      <SectionTitle>Vincular banners a patrocinadores</SectionTitle>
      {banners.length === 0 ? (
        <p className="text-[11px] text-brand-muted">
          Sin banners en esta edición. Créalos en /admin/banners.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {banners.map((b) => (
            <BannerLinkRow
              key={b.id}
              banner={b}
              sponsors={sponsors}
              run={run}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
