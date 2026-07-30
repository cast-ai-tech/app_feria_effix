-- ============================================================
-- App Feria Effix — FASE 28: Sistema de roles
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase27 (intro de apertura). Idempotente.
--
-- Roles DERIVADOS + membresías contextuales (no enum monolítico):
--   · Visitante G/VIP/Black → tickets.ticket_type (ya existe)
--   · Expositor             → stand_staff (ya existe, F15)
--   · Ponente               → speakers.user_id (nuevo)
--   · Patrocinador          → sponsors + sponsor_staff (nuevo)
--   · Equipo interno Effix  → team_members (nuevo)
-- Un usuario puede tener varios roles a la vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ponente ↔ cuenta. El admin vincula por email (como el
--    staff de stands). Un user solo puede ser UNA ficha de
--    ponente por edición.
-- ------------------------------------------------------------
alter table public.speakers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists speakers_user_idx
  on public.speakers (user_id) where user_id is not null;

create unique index if not exists speakers_user_edition_unique
  on public.speakers (user_id, edition) where user_id is not null;

create or replace function public.is_speaker_user(sid uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.speakers s
     where s.id = sid and s.user_id = auth.uid()
  );
$$;
revoke execute on function public.is_speaker_user(uuid) from public;
grant execute on function public.is_speaker_user(uuid) to authenticated, anon;

-- El ponente ve TAMBIÉN las preguntas pendientes de su charla.
-- (Condiciones originales de phase18_qa_polls.sql + OR final.)
drop policy if exists "preguntas: lectura moderada" on public.speaker_questions;
create policy "preguntas: lectura moderada"
  on public.speaker_questions for select
  using (
    status in ('approved', 'answered')
    or auth.uid() = user_id
    or public.is_admin()
    or public.is_speaker_user(speaker_id)
  );

-- NOTA: sin política de UPDATE sobre speakers/speaker_questions para
-- el ponente. Postgres no restringe columnas por política; toda
-- escritura del ponente pasa por server actions con service key
-- (mismo criterio que el portal del expositor en la Fase 19).

-- ------------------------------------------------------------
-- 2. Patrocinadores: la entidad que el equipo comercial vende.
--    Mismo vocabulario de niveles que stands.tier (F19) y
--    banners.sponsor_tier (F24).
-- ------------------------------------------------------------
create table if not exists public.sponsors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  website    text,
  tier       text not null default 'basico'
               check (tier in ('basico', 'plata', 'oro', 'diamante')),
  edition    int  not null references public.editions(year),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsors_edition_idx on public.sponsors (edition, active);

drop trigger if exists sponsors_set_updated_at on public.sponsors;
create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at();

alter table public.sponsors enable row level security;

drop policy if exists "sponsors: activos públicos" on public.sponsors;
create policy "sponsors: activos públicos"
  on public.sponsors for select
  using (active or public.is_admin());

drop policy if exists "sponsors: admin escribe" on public.sponsors;
create policy "sponsors: admin escribe"
  on public.sponsors for all
  using (public.is_admin()) with check (public.is_admin());

-- Staff del patrocinador (lo asigna el admin, como stand_staff).
create table if not exists public.sponsor_staff (
  id         uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sponsor_id, user_id)
);

create index if not exists sponsor_staff_user_idx on public.sponsor_staff (user_id);

alter table public.sponsor_staff enable row level security;

drop policy if exists "sponsor_staff: ve sus asignaciones" on public.sponsor_staff;
create policy "sponsor_staff: ve sus asignaciones"
  on public.sponsor_staff for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "sponsor_staff: admin gestiona" on public.sponsor_staff;
create policy "sponsor_staff: admin gestiona"
  on public.sponsor_staff for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_sponsor_staff(sp uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.sponsor_staff ss
     where ss.sponsor_id = sp and ss.user_id = auth.uid()
  );
$$;
revoke execute on function public.is_sponsor_staff(uuid) from public;
grant execute on function public.is_sponsor_staff(uuid) to authenticated, anon;

-- Unificación: banners y stands pueden apuntar a su sponsor.
alter table public.banners
  add column if not exists sponsor_id uuid references public.sponsors(id) on delete set null;
alter table public.stands
  add column if not exists sponsor_id uuid references public.sponsors(id) on delete set null;

create index if not exists banners_sponsor_idx
  on public.banners (sponsor_id) where sponsor_id is not null;

-- El staff del sponsor ve sus banners aunque estén inactivos.
-- (Condición original de phase24_banners.sql + OR final.)
drop policy if exists "banners: activos públicos" on public.banners;
create policy "banners: activos públicos"
  on public.banners for select
  using (
    active or public.is_admin()
    or (sponsor_id is not null and public.is_sponsor_staff(sponsor_id))
  );

-- El staff del sponsor lee las métricas de SUS banners.
-- (Reemplaza a "banner_events: lee admin" de phase24_banners.sql.)
drop policy if exists "banner_events: lee admin" on public.banner_events;
drop policy if exists "banner_events: lee admin o sponsor" on public.banner_events;
create policy "banner_events: lee admin o sponsor"
  on public.banner_events for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.banners b
       where b.id = banner_events.banner_id
         and b.sponsor_id is not null
         and public.is_sponsor_staff(b.sponsor_id)
    )
  );

-- ------------------------------------------------------------
-- 3. Equipo de trabajo interno (Effix). Tabla aparte y NO una
--    columna en profiles: el usuario edita su propia fila de
--    profiles vía RLS y Postgres no restringe columnas por
--    política — una columna sería auto-escalable.
-- ------------------------------------------------------------
create table if not exists public.team_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'staff'
               check (role in ('staff', 'logistica', 'comercial', 'acreditacion')),
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "team: ve su fila" on public.team_members;
create policy "team: ve su fila"
  on public.team_members for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "team: admin gestiona" on public.team_members;
create policy "team: admin gestiona"
  on public.team_members for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_staff()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.is_admin() or exists (
    select 1 from public.team_members where user_id = auth.uid()
  );
$$;
revoke execute on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, anon;

-- ------------------------------------------------------------
-- 4. Beneficios por tier de boleta (editables en /admin/config;
--    nada hardcodeado en la app). Listas separadas por "|".
-- ------------------------------------------------------------
insert into public.app_config (key, value, description) values
  ('benefits_general',
   'Acceso días 2 a 4|Agenda completa de charlas|Zona comercial y stands',
   'Beneficios visibles en /beneficios para boleta General. Separados por "|".'),
  ('benefits_vip',
   'Acceso días 1 a 5|Fila preferencial de ingreso|Zona VIP',
   'Beneficios visibles en /beneficios para boleta VIP. Separados por "|".'),
  ('benefits_black',
   'Acceso días 1 a 5|Soporte directo por WhatsApp|Experiencias exclusivas Black',
   'Beneficios visibles en /beneficios para boleta Black. Separados por "|".')
on conflict (key) do nothing;
