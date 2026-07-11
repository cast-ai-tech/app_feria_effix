-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 2: Autenticación y perfil de usuario
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor (una sola vez).
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
-- ============================================================

-- ------------------------------------------------------------
-- 1. Roles de usuario (lista ABIERTA y ampliable)
--    Se puede ampliar luego desde el panel admin (Fase 11) o
--    con un simple INSERT aquí.
-- ------------------------------------------------------------
create table if not exists public.roles (
  slug        text primary key,
  label       text not null,
  sort_order  int  not null default 100
);

insert into public.roles (slug, label, sort_order) values
  ('trafficker', 'Trafficker',           10),
  ('agencia',    'Agencia',              20),
  ('marca',      'Marca / Ecommerce',    30),
  ('mentor',     'Mentor / Ponente',     40),
  ('asistente',  'Asistente general',    50)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- 2. Perfiles (1:1 con auth.users)
--    Incluye desde ya los campos que reutiliza Comunidad (Fase 10):
--    país, rol, bio y redes sociales.
--    'ticket_email' es el correo usado para cruzar la boleta de
--    La Tiquetera (Fase 3); por defecto = correo de la cuenta,
--    pero se puede editar para vincular manualmente.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  country       text,
  role          text,            -- slug de public.roles o texto libre
  bio           text,
  ticket_email  text,            -- correo para vincular boleta (Fase 3)
  -- Redes para el botón "conectar" de Comunidad (Fase 10)
  whatsapp      text,
  instagram     text,
  linkedin      text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índice para el cruce por correo con La Tiquetera (Fase 3)
create index if not exists profiles_ticket_email_idx
  on public.profiles (lower(ticket_email));

-- Mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. Crear el perfil automáticamente al registrarse.
--    Copia los datos del formulario (guardados en raw_user_meta_data
--    durante signUp) y usa el correo de la cuenta como ticket_email.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, country, role, bio, ticket_email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'bio', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- El trigger dispara solo; no debe ser invocable por RPC (Supabase advisor 0028).
-- Pero el rol del servicio de Auth (supabase_auth_admin) SÍ necesita ejecutarlo
-- al insertar en auth.users durante el registro; de lo contrario no se crea el perfil.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roles    enable row level security;

-- Perfiles: cada usuario ve y edita SOLO el suyo.
-- (El directorio público de Comunidad se expondrá en la Fase 10
--  mediante una vista con columnas públicas, para no filtrar
--  ticket_email ni is_admin.)
drop policy if exists "perfil propio: leer" on public.profiles;
create policy "perfil propio: leer"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "perfil propio: insertar" on public.profiles;
create policy "perfil propio: insertar"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "perfil propio: actualizar" on public.profiles;
create policy "perfil propio: actualizar"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Roles: lectura para cualquiera (poblar el desplegable del registro).
-- La escritura queda solo para service_role / admin (Fase 11).
drop policy if exists "roles: lectura pública" on public.roles;
create policy "roles: lectura pública"
  on public.roles for select
  using (true);

-- ------------------------------------------------------------
-- Nota: para marcar a alguien como admin (usado desde la Fase 3):
--   update public.profiles set is_admin = true where id = '<uuid>';
-- ============================================================
