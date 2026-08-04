-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 7: Módulo de Ponentes (perfiles, calificaciones, preguntas, seguir)
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql
-- y de phase3_tickets.sql (asume que ya existen public.is_admin(),
-- public.set_updated_at() y public.profiles).
-- Es idempotente en lo posible (usa "if not exists" / "or replace").
--
-- El acceso al MÓDULO (requiere boleta vigente del año en curso) se controla
-- en la PÁGINA, no en la base de datos. Aquí la lectura de ponentes es pública
-- para que la vitrina y el panel funcionen sin fricción; la escritura de
-- ponentes queda solo para admin. Cada usuario gestiona SUS calificaciones,
-- preguntas y seguimientos.
--
-- NOTA DE ACOPLAMIENTO: NO hay FK hacia public.talks (la agenda la construye
-- otro agente). Guardamos talk_title / talk_starts_at sueltos en el ponente
-- para poder mostrar "su charla" y decidir si ya ocurrió (para habilitar la
-- calificación) sin depender de ese módulo. El directorio ROTA por edición.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ponentes / speakers.
-- ------------------------------------------------------------
create table if not exists public.speakers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  photo_url      text,
  bio            text,
  role           text,                          -- tema / especialidad
  talk_title     text,                          -- charla asociada (suelto)
  talk_starts_at timestamptz,                   -- inicio de su charla (suelto)
  instagram      text,
  linkedin       text,
  website        text,
  edition        int  not null default 2026,    -- el directorio rota por edición
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists speakers_edition_idx on public.speakers (edition);
create index if not exists speakers_starts_idx  on public.speakers (talk_starts_at);

drop trigger if exists speakers_set_updated_at on public.speakers;
create trigger speakers_set_updated_at
  before update on public.speakers
  for each row execute function public.set_updated_at();

alter table public.speakers enable row level security;

drop policy if exists "ponentes: lectura pública" on public.speakers;
create policy "ponentes: lectura pública"
  on public.speakers for select using (true);

drop policy if exists "ponentes: escribe admin" on public.speakers;
create policy "ponentes: escribe admin"
  on public.speakers for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Calificaciones por estrellas (1 a 5).
--    Lectura pública (para poder mostrar el promedio a todos).
--    Cada usuario gestiona SOLO la suya (una por ponente).
-- ------------------------------------------------------------
create table if not exists public.speaker_ratings (
  id         uuid primary key default gen_random_uuid(),
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      int  not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (speaker_id, user_id)
);

create index if not exists speaker_ratings_speaker_idx on public.speaker_ratings (speaker_id);

alter table public.speaker_ratings enable row level security;

drop policy if exists "calificaciones: lectura pública" on public.speaker_ratings;
create policy "calificaciones: lectura pública"
  on public.speaker_ratings for select using (true);

drop policy if exists "calificaciones: usuario inserta la suya" on public.speaker_ratings;
create policy "calificaciones: usuario inserta la suya"
  on public.speaker_ratings for insert
  with check (auth.uid() = user_id);

drop policy if exists "calificaciones: usuario actualiza la suya" on public.speaker_ratings;
create policy "calificaciones: usuario actualiza la suya"
  on public.speaker_ratings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calificaciones: usuario borra la suya" on public.speaker_ratings;
create policy "calificaciones: usuario borra la suya"
  on public.speaker_ratings for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Preguntas en vivo para el ponente.
--    Lectura pública (visibles para el ponente / organizador y el público).
--    Inserta cualquier autenticado (su propia autoría).
--    user_id on delete set null: si el usuario se borra, la pregunta queda
--    (anónima) para no perder el historial del organizador.
-- ------------------------------------------------------------
create table if not exists public.speaker_questions (
  id         uuid primary key default gen_random_uuid(),
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists speaker_questions_speaker_idx on public.speaker_questions (speaker_id, created_at desc);

alter table public.speaker_questions enable row level security;

drop policy if exists "preguntas: lectura pública" on public.speaker_questions;
create policy "preguntas: lectura pública"
  on public.speaker_questions for select using (true);

drop policy if exists "preguntas: autenticado inserta la suya" on public.speaker_questions;
create policy "preguntas: autenticado inserta la suya"
  on public.speaker_questions for insert
  with check (auth.uid() = user_id);

drop policy if exists "preguntas: usuario borra la suya" on public.speaker_questions;
create policy "preguntas: usuario borra la suya"
  on public.speaker_questions for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Seguir a un ponente (registro de interés, toggle).
--    Cada usuario gestiona SOLO los suyos.
-- ------------------------------------------------------------
create table if not exists public.speaker_follows (
  id         uuid primary key default gen_random_uuid(),
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (speaker_id, user_id)
);

create index if not exists speaker_follows_speaker_idx on public.speaker_follows (speaker_id);
create index if not exists speaker_follows_user_idx    on public.speaker_follows (user_id);

alter table public.speaker_follows enable row level security;

drop policy if exists "seguir: usuario lee los suyos" on public.speaker_follows;
create policy "seguir: usuario lee los suyos"
  on public.speaker_follows for select
  using (auth.uid() = user_id);

drop policy if exists "seguir: usuario inserta los suyos" on public.speaker_follows;
create policy "seguir: usuario inserta los suyos"
  on public.speaker_follows for insert
  with check (auth.uid() = user_id);

drop policy if exists "seguir: usuario borra los suyos" on public.speaker_follows;
create policy "seguir: usuario borra los suyos"
  on public.speaker_follows for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. Datos de ejemplo (edición 2026). Se insertan solo si la tabla está
--    vacía, para no duplicar en re-ejecuciones ni pisar cambios del panel.
--    Los títulos/horas de charla coinciden con el seed de la Agenda
--    (phase4_agenda.sql) para que "su charla" se vea coherente.
-- ------------------------------------------------------------
insert into public.speakers
  (full_name, role, talk_title, talk_starts_at, instagram, linkedin, website, edition)
select * from (values
  ('Camila Restrepo', 'Growth con IA',
   'Growth con IA para e-commerce',
   timestamptz '2026-10-15 10:00:00-05',
   '@camilarestrepo', 'linkedin.com/in/camilarestrepo', 'camilarestrepo.co', 2026),

  ('Andrés Gómez', 'Embajadores y afiliados',
   'Escalar con embajadores y afiliados',
   timestamptz '2026-10-15 11:15:00-05',
   '@andresgomez', 'linkedin.com/in/andresgomez', null, 2026),

  ('Laura Vélez', 'Meta Ads',
   'Meta Ads: lo que cambió en 2026',
   timestamptz '2026-10-16 12:15:00-05',
   '@lauravelez', 'linkedin.com/in/lauravelez', null, 2026),

  ('Sebastián Ríos', 'Ventas de alto ticket',
   'Cierre de ventas de alto ticket',
   timestamptz '2026-10-16 14:00:00-05',
   '@sebastianrios', 'linkedin.com/in/sebastianrios', 'sebastianrios.com', 2026),

  ('Valentina Ortiz', 'Logística y postventa',
   'Logística que enamora al cliente',
   timestamptz '2026-10-17 09:30:00-05',
   '@valentinaortiz', 'linkedin.com/in/valentinaortiz', null, 2026)
) as seed
where not exists (select 1 from public.speakers);

-- ============================================================
-- Nota: la creación/edición/borrado de ponentes se hace desde el panel admin
-- (src/app/admin/ponentes) usando la SERVICE_ROLE_KEY del servidor, que salta
-- la RLS. La página pública (src/app/ponentes) solo lee y controla el acceso
-- por boleta vigente. Calificaciones/preguntas/seguir los escribe el propio
-- usuario autenticado desde el cliente, respetando la RLS de arriba.
-- ============================================================
