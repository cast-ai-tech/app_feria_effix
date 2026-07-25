-- ============================================================
-- App Feria Effix — FASE 20: Academia 2.0
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase15_pasaporte.sql. Idempotente.
--
-- Contenido:
--   1. watch_progress — "continuar viendo" (apertura + marcada como vista).
--   2. collections / collection_items — colecciones curadas en admin.
--   3. recordings.is_free — teaser para el anillo gratis.
--   4. Pipeline de publicación: recordings.status (borrador→revision→publicada);
--      `approved` queda como columna derivada (compat) sincronizada por trigger.
--   5. Fix seed duplicador (hallazgo #4): dedup + UNIQUE(title, edition).
--   6. Privacidad de ratings (hallazgo #15): la tabla ya no expone user_id;
--      los agregados salen de la vista recording_rating_stats.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Progreso de reproducción.
--    LIMITACIÓN DOCUMENTADA: los videos son URLs externas (YouTube),
--    sin player propio, así que no hay tracking fino de segundos.
--    Hoy se registra: apertura del video (upsert) y "Marcar como vista"
--    (completed). `seconds` queda listo para cuando haya player propio
--    (Mux/Cloudflare Stream, fase 2 del roadmap).
-- ------------------------------------------------------------
create table if not exists public.watch_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recording_id uuid not null references public.recordings(id) on delete cascade,
  seconds      int  not null default 0,
  completed    boolean not null default false,
  updated_at   timestamptz not null default now(),
  unique (user_id, recording_id)
);

create index if not exists watch_progress_user_idx on public.watch_progress (user_id);

drop trigger if exists watch_progress_set_updated_at on public.watch_progress;
create trigger watch_progress_set_updated_at
  before update on public.watch_progress
  for each row execute function public.set_updated_at();

alter table public.watch_progress enable row level security;

drop policy if exists "progreso: usuario gestiona el suyo" on public.watch_progress;
create policy "progreso: usuario gestiona el suyo"
  on public.watch_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. Colecciones curadas (por tema y/o edición).
--    edition NULL = colección transversal (se muestra en todas).
-- ------------------------------------------------------------
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  edition     int references public.editions(year),
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  recording_id  uuid not null references public.recordings(id) on delete cascade,
  sort_order    int not null default 100,
  unique (collection_id, recording_id)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "colecciones: lectura autenticados" on public.collections;
create policy "colecciones: lectura autenticados"
  on public.collections for select
  using (auth.uid() is not null);

drop policy if exists "colecciones: admin escribe" on public.collections;
create policy "colecciones: admin escribe"
  on public.collections for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "items: lectura autenticados" on public.collection_items;
create policy "items: lectura autenticados"
  on public.collection_items for select
  using (auth.uid() is not null);

drop policy if exists "items: admin escribe" on public.collection_items;
create policy "items: admin escribe"
  on public.collection_items for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. Teaser gratuito + 4. pipeline de publicación.
-- ------------------------------------------------------------
alter table public.recordings
  add column if not exists is_free boolean not null default false;

alter table public.recordings
  add column if not exists status text not null default 'borrador';

-- CHECK del pipeline (nombrado para poder re-crearlo idempotente).
alter table public.recordings drop constraint if exists recordings_status_check;
alter table public.recordings
  add constraint recordings_status_check
  check (status in ('borrador', 'revision', 'publicada'));

-- Backfill una sola vez: lo aprobado pasa a 'publicada'. La condición
-- approved=true AND status='borrador' evita re-publicar algo que el admin
-- haya devuelto a borrador después (el trigger de abajo mantiene
-- approved=false en ese caso).
update public.recordings
   set status = 'publicada'
 where approved = true and status = 'borrador';

-- DECISIÓN: `status` es la fuente de verdad; `approved` queda como columna
-- DERIVADA por compatibilidad (código viejo que la lea sigue funcionando).
-- Este trigger la sincroniza siempre; escribirla directo no tiene efecto.
create or replace function public.sync_recording_approved()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.approved := (new.status = 'publicada');
  return new;
end;
$$;

drop trigger if exists recordings_sync_approved on public.recordings;
create trigger recordings_sync_approved
  before insert or update on public.recordings
  for each row execute function public.sync_recording_approved();

-- Visibilidad pública = status 'publicada' (o admin).
drop policy if exists "grabaciones: lectura aprobadas" on public.recordings;
drop policy if exists "grabaciones: lectura publicadas" on public.recordings;
create policy "grabaciones: lectura publicadas"
  on public.recordings for select
  using (status = 'publicada' or public.is_admin());

-- Teaser del seed (el admin puede cambiarlo): 1 charla destacada gratis.
update public.recordings
   set is_free = true
 where title = 'Growth con IA para e-commerce' and edition = 2026;

-- ------------------------------------------------------------
-- 5. Fix hallazgo #4: el seed duplicaba filas al re-ejecutar
--    (on conflict do nothing sin índice único). Dedup conservando la
--    fila más antigua y UNIQUE para que no vuelva a pasar.
-- ------------------------------------------------------------
delete from public.recordings a
 using public.recordings b
 where a.title = b.title
   and a.edition = b.edition
   and a.created_at > b.created_at;

create unique index if not exists recordings_title_edition_unique
  on public.recordings (title, edition);

-- ------------------------------------------------------------
-- 6. Privacidad de calificaciones (hallazgo #15): nadie ve el user_id
--    de otros. Cada quien lee SOLO su fila; los promedios salen de la
--    vista agregada (sin user_id).
-- ------------------------------------------------------------
drop policy if exists "ratings: lectura pública" on public.recording_ratings;

-- "ratings: usuario gestiona la suya" (FOR ALL, ya existente en Fase 8)
-- cubre el select de la fila propia; se re-crea por si este script corre
-- sobre una base sin la Fase 8 completa.
drop policy if exists "ratings: usuario gestiona la suya" on public.recording_ratings;
create policy "ratings: usuario gestiona la suya"
  on public.recording_ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.recording_rating_stats as
  select
    recording_id,
    round(avg(stars)::numeric, 2) as avg_stars,
    count(*)::int as votes
  from public.recording_ratings
  group by recording_id;

-- La vista corre con permisos del dueño (postgres) para poder agregar
-- sobre todas las filas sin exponer user_id.
alter view public.recording_rating_stats set (security_invoker = false);
revoke select on public.recording_rating_stats from anon;
grant select on public.recording_rating_stats to authenticated;

-- Higiene: las tablas nuevas no deben ser visibles para anon ni siquiera
-- a nivel de grant (RLS ya bloquea, esto es cinturón y tirantes).
revoke all on public.watch_progress from anon;
revoke all on public.collections from anon;
revoke all on public.collection_items from anon;
