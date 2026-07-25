-- ============================================================
-- App Feria Effix — FASE 14: Credencial Effix (scan-to-connect)
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase12b_grants.sql. Idempotente.
--
-- Contexto 2026: La Tiquetera valida el ingreso físico; el QR de la app
-- es la IDENTIDAD del asistente dentro de la feria. Dos asistentes se
-- escanean mutuamente → contacto guardado en ambos sentidos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles: connect_code (único e inmutable) + flags de compartir redes.
--    Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L).
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists connect_code text unique,
  add column if not exists share_whatsapp  boolean not null default true,
  add column if not exists share_instagram boolean not null default true,
  add column if not exists share_linkedin  boolean not null default true;

create or replace function public.generate_connect_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where connect_code = code);
  end loop;
  return code;
end;
$$;

-- Asigna el código al crear el perfil y lo hace INMUTABLE en updates.
create or replace function public.set_connect_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.connect_code is null then
      new.connect_code := public.generate_connect_code();
    end if;
  elsif tg_op = 'UPDATE' then
    new.connect_code := old.connect_code; -- nadie lo cambia, ni el dueño
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_connect_code on public.profiles;
create trigger profiles_connect_code
  before insert or update on public.profiles
  for each row execute function public.set_connect_code();

-- Backfill de perfiles existentes.
update public.profiles
   set connect_code = public.generate_connect_code()
 where connect_code is null;

-- ------------------------------------------------------------
-- 2. Conexiones (libreta de contactos del evento).
--    Una fila por dirección: el RPC crea SIEMPRE ambos sentidos.
-- ------------------------------------------------------------
create table if not exists public.connections (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users(id) on delete cascade,
  connected_profile_id uuid not null references public.profiles(id) on delete cascade,
  note                 text,
  created_at           timestamptz not null default now(),
  unique (owner_id, connected_profile_id),
  check (owner_id <> connected_profile_id)
);

create index if not exists connections_owner_idx on public.connections (owner_id);

alter table public.connections enable row level security;

drop policy if exists "conexiones: dueño lee" on public.connections;
create policy "conexiones: dueño lee"
  on public.connections for select
  using (auth.uid() = owner_id);

drop policy if exists "conexiones: dueño edita nota" on public.connections;
create policy "conexiones: dueño edita nota"
  on public.connections for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "conexiones: dueño borra" on public.connections;
create policy "conexiones: dueño borra"
  on public.connections for delete
  using (auth.uid() = owner_id);

-- El INSERT solo ocurre vía el RPC (SECURITY DEFINER) para garantizar la
-- bidireccionalidad; no hay política de insert para usuarios.

-- ------------------------------------------------------------
-- 3. RPC scan-to-connect: A escanea el QR de B.
--    Crea la conexión EN AMBOS SENTIDOS en una transacción.
--    Devuelve jsonb: { status, profile } donde status es
--    'connected' | 'already' | 'not_found' | 'self'.
--    El perfil devuelto respeta los flags share_* de B.
-- ------------------------------------------------------------
create or replace function public.connect_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  already boolean;
  my_note text;
begin
  if me is null then
    raise exception 'No autenticado';
  end if;

  select * into target
    from public.profiles
   where connect_code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if target.id = me then
    return jsonb_build_object('status', 'self');
  end if;

  select exists (
    select 1 from public.connections
     where owner_id = me and connected_profile_id = target.id
  ) into already;

  if not already then
    insert into public.connections (owner_id, connected_profile_id)
    values (me, target.id), (target.id, me)
    on conflict (owner_id, connected_profile_id) do nothing;
  end if;

  select note into my_note
    from public.connections
   where owner_id = me and connected_profile_id = target.id;

  return jsonb_build_object(
    'status', case when already then 'already' else 'connected' end,
    'note', my_note,
    'profile', jsonb_build_object(
      'id', target.id,
      'full_name', target.full_name,
      'country', target.country,
      'role', target.role,
      'bio', target.bio,
      'whatsapp',  case when target.share_whatsapp  then target.whatsapp  end,
      'instagram', case when target.share_instagram then target.instagram end,
      'linkedin',  case when target.share_linkedin  then target.linkedin  end
    )
  );
end;
$$;

revoke execute on function public.connect_by_code(text) from anon, public;
grant execute on function public.connect_by_code(text) to authenticated;

-- ------------------------------------------------------------
-- 4. El directorio de Comunidad ahora respeta los flags share_*.
-- ------------------------------------------------------------
create or replace view public.community_directory as
  select
    id, full_name, country, role, bio,
    case when share_whatsapp  then whatsapp  end as whatsapp,
    case when share_instagram then instagram end as instagram,
    case when share_linkedin  then linkedin  end as linkedin
  from public.profiles;

alter view public.community_directory set (security_invoker = false);
revoke select on public.community_directory from anon;
grant select on public.community_directory to authenticated;
