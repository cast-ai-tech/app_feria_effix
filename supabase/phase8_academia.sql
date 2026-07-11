-- ============================================================
-- App Feria Effix — Esquema de base de datos
-- FASE 8: Módulo ACADEMIA (ponencias grabadas, acceso de por vida)
-- ------------------------------------------------------------
-- Ejecuta este script en Supabase → SQL Editor DESPUÉS de schema.sql
-- y de phase3_tickets.sql (de donde vienen public.is_admin() y
-- public.set_updated_at()). Es idempotente en lo posible.
--
-- Modelo de acceso (Master Prompt §5): Academia está disponible DE POR
-- VIDA para quien haya tenido boleta válida en CUALQUIER edición (alumni).
-- Ese gate se resuelve en la app (src/lib/access.ts → isAlumni). Aquí solo
-- controlamos qué grabaciones son visibles: SOLO las aprobadas (o admin).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Grabaciones (ponencias en video de las distintas ediciones).
--    approved = false → borrador; NO se muestra a los usuarios,
--    solo el admin la ve (en el panel) hasta aprobarla.
-- ------------------------------------------------------------
create table if not exists public.recordings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  speaker_name text,
  description  text,
  video_url    text,
  edition      int  not null default 2026
                 check (edition in (2024, 2025, 2026)),
  approved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists recordings_edition_idx  on public.recordings (edition);
create index if not exists recordings_approved_idx on public.recordings (approved);

drop trigger if exists recordings_set_updated_at on public.recordings;
create trigger recordings_set_updated_at
  before update on public.recordings
  for each row execute function public.set_updated_at();

alter table public.recordings enable row level security;

-- Lectura: cualquiera ve las aprobadas; el admin ve todas (incl. borradores).
drop policy if exists "grabaciones: lectura aprobadas" on public.recordings;
create policy "grabaciones: lectura aprobadas"
  on public.recordings for select
  using (approved = true or public.is_admin());

-- Escritura: solo admin (crear/editar/aprobar/borrar).
drop policy if exists "grabaciones: admin escribe" on public.recordings;
create policy "grabaciones: admin escribe"
  on public.recordings for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. Calificación por estrellas (1-5), una por usuario y grabación.
-- ------------------------------------------------------------
create table if not exists public.recording_ratings (
  id           uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  stars        int  not null check (stars between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (recording_id, user_id)
);

create index if not exists recording_ratings_rec_idx  on public.recording_ratings (recording_id);
create index if not exists recording_ratings_user_idx on public.recording_ratings (user_id);

alter table public.recording_ratings enable row level security;

-- Lectura pública (para poder calcular el promedio de cada grabación).
drop policy if exists "ratings: lectura pública" on public.recording_ratings;
create policy "ratings: lectura pública"
  on public.recording_ratings for select using (true);

-- Cada usuario gestiona ÚNICAMENTE su propia calificación.
drop policy if exists "ratings: usuario gestiona la suya" on public.recording_ratings;
create policy "ratings: usuario gestiona la suya"
  on public.recording_ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Seed — grabaciones de ejemplo de varias ediciones.
--    Algunas aprobadas (visibles) y una en borrador (approved=false)
--    para probar el filtro de visibilidad.
-- ------------------------------------------------------------
insert into public.recordings (title, speaker_name, description, video_url, edition, approved) values
  ('Growth con IA para e-commerce', 'Camila Restrepo',
    'Cómo usar IA generativa para escalar adquisición y retención en tiendas online.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2026, true),
  ('Escalar con embajadores y afiliados', 'Feria Effix',
    'El modelo de embajadores que multiplicó las ventas de la feria.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2026, true),
  ('Meta Ads: lo que cambió en 2025', 'Laura Jiménez',
    'Actualización de la plataforma de anuncios y estrategias que siguen funcionando.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2025, true),
  ('Logística de última milla para tiendas pequeñas', 'Andrés Gómez',
    'Reducir costos de envío sin sacrificar la experiencia del cliente.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2025, true),
  ('Fundamentos de marca para emprendedores', 'María Fernanda Ruiz',
    'La charla que abrió la primera edición de la Feria Effix.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2024, true),
  ('Borrador — Automatización de WhatsApp (sin revisar)', 'Por confirmar',
    'Grabación aún en revisión; no debe verse en la app hasta ser aprobada.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2026, false)
on conflict do nothing;

-- ============================================================
-- Nota: la creación/edición y la aprobación de grabaciones se hacen desde
-- el panel admin (Fase 8) usando la SERVICE_ROLE_KEY del servidor, tras
-- verificar rol admin. Ver src/app/admin/academia.
-- ============================================================
