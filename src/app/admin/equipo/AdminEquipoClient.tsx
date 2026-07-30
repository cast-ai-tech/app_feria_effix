"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import SectionTitle from "@/components/SectionTitle";
import { Field, SelectField } from "@/components/Field";
import { addTeamMember, setTeamRole, removeTeamMember } from "./actions";

export type TeamMemberRow = {
  user_id: string;
  role: string;
  label: string;
};

type Runner = (
  fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>,
  fd: FormData,
  reset?: () => void,
) => void;

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "logistica", label: "Logística" },
  { value: "comercial", label: "Comercial" },
  { value: "acreditacion", label: "Acreditación" },
];

function MemberRow({
  member,
  run,
  pending,
}: {
  member: TeamMemberRow;
  run: Runner;
  pending: boolean;
}) {
  const [role, setRole] = useState(member.role);

  function saveRole() {
    const fd = new FormData();
    fd.set("user_id", member.user_id);
    fd.set("role", role);
    run(setTeamRole, fd);
  }

  return (
    <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-extrabold text-brand-white">
          {member.label}
        </p>
        <Badge className="mt-1">
          {ROLE_OPTIONS.find((r) => r.value === member.role)?.label ??
            member.role}
        </Badge>
      </div>
      <div className="flex flex-shrink-0 items-end gap-2">
        <div className="w-40">
          <SelectField
            label="Rol"
            name={`role-${member.user_id}`}
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
          />
        </div>
        <Button
          variant="ghost"
          onClick={saveRole}
          disabled={pending || role === member.role}
        >
          Guardar
        </Button>
        <form action={(fd) => run(removeTeamMember, fd)}>
          <input type="hidden" name="user_id" value={member.user_id} />
          <button className="rounded-full border border-red-400/40 px-3 py-1 text-[9.5px] font-bold text-red-300">
            Quitar
          </button>
        </form>
      </div>
    </GlassCard>
  );
}

export default function AdminEquipoClient({
  members,
}: {
  members: TeamMemberRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [role, setRole] = useState("staff");

  const run: Runner = (fn, fd, reset) => {
    startTransition(async () => {
      const res = await fn(fd);
      setNote(res?.error ? `Error: ${res.error}` : "Listo ✓");
      if (res?.ok) reset?.();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3 p-5">
        <SectionTitle className="mt-0">Agregar al equipo</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            run(addTeamMember, new FormData(form), () => {
              form.reset();
              setRole("staff");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field
            label="Correo"
            name="email"
            placeholder="correo@delequipo.com"
            required
          />
          <SelectField
            label="Rol"
            name="role"
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
          />
          <Button type="submit" variant="ghost" fullWidth disabled={pending}>
            {pending ? "Guardando…" : "Agregar"}
          </Button>
        </form>
        <p className="text-[10px] text-brand-muted">
          La persona debe haberse registrado antes en la app (se busca por su
          correo de boleta/registro).
        </p>
      </GlassCard>

      {note && (
        <GlassCard className="p-3">
          <p className="text-[11px] font-semibold text-brand-white">{note}</p>
        </GlassCard>
      )}

      <SectionTitle>Equipo ({members.length})</SectionTitle>
      {members.length === 0 ? (
        <p className="text-[11px] text-brand-muted">Sin miembros todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} run={run} pending={pending} />
          ))}
        </div>
      )}
    </div>
  );
}
