-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 3: Módulo de Tickets
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql.
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
--
-- Modela dos escenarios con el MISMO modelo de datos:
--   a) Import manual de CSV de La Tiquetera (panel admin, Fase 3).
--   b) Un futuro endpoint/API que inserte los mismos campos.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Helper: ¿el usuario actual es admin?
--    SECURITY DEFINER para poder leer public.profiles sin chocar
--    con su propia RLS. Se usa en las políticas de abajo.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------
-- 1. Configuración de la app (clave/valor, editable por admin).
--    Aquí vive la ventana de reembolso (queda TBD hasta definirla)
--    para poder cambiarla SIN tocar código.
-- ------------------------------------------------------------
create table if not exists public.app_config (
  key         text primary key,
  value       text,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('refund_full_days_before_event', '30',
    'TBD — Días antes del evento hasta los que se permite reembolso completo. Ajustar cuando La Tiquetera/Effix lo definan.'),
  ('event_start_date', '2026-10-16',
    'Primer día del evento (para calcular la ventana de reembolso y el badge "Ahora").'),
  ('event_end_date', '2026-10-18', 'Último día del evento.'),
  ('current_edition', '2026', 'Edición en curso (usada por Alianzas y por el badge de acceso).'),
  ('black_whatsapp_url', 'https://wa.me/573000000000',
    'Enlace de WhatsApp para solicitar la boleta Black (venta 100% manual). Reemplazar por el número real.')
on conflict (key) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "config: lectura pública" on public.app_config;
create policy "config: lectura pública"
  on public.app_config for select using (true);

drop policy if exists "config: escribe admin" on public.app_config;
create policy "config: escribe admin"
  on public.app_config for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Tipos de boleta (referencia). El precio es informativo:
--    la app NO cobra General/VIP (lo hace La Tiquetera) y Black
--    se vende manual por WhatsApp.
-- ------------------------------------------------------------
create table if not exists public.ticket_types (
  slug          text primary key,
  label         text not null,
  price_cop     bigint,
  sale_channel  text not null,        -- 'tiquetera' | 'whatsapp'
  sort_order    int not null default 100
);

insert into public.ticket_types (slug, label, price_cop, sale_channel, sort_order) values
  ('general', 'General', 183000,   'tiquetera', 10),
  ('vip',     'VIP',     1050000,  'tiquetera', 20),
  ('black',   'Black',   3997000,  'whatsapp',  30)
on conflict (slug) do nothing;

alter table public.ticket_types enable row level security;
drop policy if exists "tipos: lectura pública" on public.ticket_types;
create policy "tipos: lectura pública"
  on public.ticket_types for select using (true);

-- ------------------------------------------------------------
-- 3. Boletas.
--    - user_id NULL = importada pero aún sin cuenta que la reclame
--      (el correo no coincide con ningún usuario registrado todavía).
--    - secret = semilla TOTP (base32). Solo el dueño puede leerla,
--      para generar el código rotativo OFFLINE en su dispositivo.
--    - edition = año; Academia (Fase 8) da acceso de por vida a quien
--      tuvo boleta válida en CUALQUIER edición.
-- ------------------------------------------------------------
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  ticket_email      text not null,                 -- correo de compra (cruce)
  holder_name       text,
  ticket_type       text not null references public.ticket_types(slug),
  order_number      text,                          -- número de orden Tiquetera
  purchase_date     timestamptz,
  edition           int  not null default 2026,
  status            text not null default 'active'
                      check (status in ('active','used','cancelled')),
  secret            text not null,                 -- semilla TOTP (base32)
  totp_step         int  not null default 30,      -- segundos por rotación
  totp_digits       int  not null default 8,       -- longitud del código
  source            text not null default 'tiquetera_csv'
                      check (source in ('tiquetera_csv','manual_black','api')),
  original_owner_id uuid references auth.users(id) on delete set null,
  refunded_at       timestamptz,
  refund_full       boolean,                       -- true = dentro de la ventana
  used_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Evita duplicar la misma orden en re-imports del CSV.
create unique index if not exists tickets_order_unique
  on public.tickets (order_number) where order_number is not null;
create index if not exists tickets_user_idx  on public.tickets (user_id);
create index if not exists tickets_email_idx on public.tickets (lower(ticket_email));

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

alter table public.tickets enable row level security;

-- El dueño ve su(s) boleta(s), incluida la semilla (para el QR offline).
drop policy if exists "boletas: dueño lee" on public.tickets;
create policy "boletas: dueño lee"
  on public.tickets for select
  using (auth.uid() = user_id or public.is_admin());

-- Admin puede todo desde el panel (además del service_role del server).
drop policy if exists "boletas: admin escribe" on public.tickets;
create policy "boletas: admin escribe"
  on public.tickets for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. Transferencias de titular (registro histórico).
-- ------------------------------------------------------------
create table if not exists public.ticket_transfers (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references public.tickets(id) on delete cascade,
  from_user_id   uuid references auth.users(id) on delete set null,
  from_email     text,
  to_user_id     uuid references auth.users(id) on delete set null,
  to_email       text not null,
  note           text,
  transferred_at timestamptz not null default now()
);

create index if not exists transfers_ticket_idx on public.ticket_transfers (ticket_id);

alter table public.ticket_transfers enable row level security;
drop policy if exists "transferencias: admin" on public.ticket_transfers;
create policy "transferencias: admin"
  on public.ticket_transfers for all
  using (public.is_admin()) with check (public.is_admin());
-- El involucrado puede ver su propio historial.
drop policy if exists "transferencias: involucrado lee" on public.ticket_transfers;
create policy "transferencias: involucrado lee"
  on public.ticket_transfers for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id or public.is_admin());

-- ------------------------------------------------------------
-- 5. Comisiones de embajadores.
--    Las CALCULA otro sistema (Panel de Embajadores, proyecto aparte).
--    Aquí solo modelamos la tabla y, al reembolsar una boleta,
--    marcamos la comisión asociada como 'to_deduct' SIN borrarla,
--    para que ese otro sistema la lea. Tabla clara con estado.
-- ------------------------------------------------------------
create table if not exists public.commissions (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid references public.tickets(id) on delete set null,
  order_number  text,                    -- respaldo si se pierde el ticket_id
  ambassador_ref text,                   -- identificador del embajador (externo)
  amount_cop    bigint,
  status        text not null default 'calculated'
                  check (status in ('calculated','paid','to_deduct')),
  edition       int not null default 2026,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists commissions_ticket_idx on public.commissions (ticket_id);
create index if not exists commissions_status_idx on public.commissions (status);

drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at
  before update on public.commissions
  for each row execute function public.set_updated_at();

alter table public.commissions enable row level security;
-- Solo admin/panel externo (service_role) accede. El resto no la ve.
drop policy if exists "comisiones: admin" on public.commissions;
create policy "comisiones: admin"
  on public.commissions for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 6. RPCs para que el usuario reclame/vincule su boleta.
--    SECURITY DEFINER: pueden tocar filas con user_id NULL que la
--    RLS del usuario no dejaría ver, pero solo para asignárselas a sí
--    mismo cruzando por correo. Nunca tocan boletas de otros usuarios.
-- ------------------------------------------------------------

-- 6a. Reclamar automáticamente las boletas cuyo correo coincide con el
--     de la cuenta o el ticket_email del perfil, y que aún no tienen dueño.
create or replace function public.claim_my_tickets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  emails text[];
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select array_remove(array[
    lower((select email from auth.users where id = auth.uid())),
    lower((select ticket_email from public.profiles where id = auth.uid()))
  ], null) into emails;

  update public.tickets t
     set user_id = auth.uid()
   where t.user_id is null
     and lower(t.ticket_email) = any (emails);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 6b. Vincular manualmente por número de orden + correo (cuando el correo
--     de compra no coincide con el de la cuenta).
create or replace function public.link_ticket_by_order(p_order text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  update public.tickets t
     set user_id = auth.uid()
   where t.user_id is null
     and t.order_number = trim(p_order)
     and lower(t.ticket_email) = lower(trim(p_email));
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- Solo autenticados; quitar a anon/public (Supabase advisor 0028).
revoke execute on function public.claim_my_tickets() from anon, public;
revoke execute on function public.link_ticket_by_order(text, text) from anon, public;
grant execute on function public.claim_my_tickets() to authenticated;
grant execute on function public.link_ticket_by_order(text, text) to authenticated;

-- ------------------------------------------------------------
-- Nota: la importación de CSV, la asignación de Black, los reembolsos
-- y las transferencias se hacen desde el panel admin (Fase 3) usando la
-- SERVICE_ROLE_KEY del servidor, que salta la RLS. Ver src/app/admin/tickets.
-- ============================================================
