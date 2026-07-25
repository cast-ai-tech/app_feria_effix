-- ============================================================
-- App Feria Effix — FASE 19: Exhibitor Hub (Stands 2.0)
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase15_pasaporte.sql. Idempotente.
--
-- Stands deja de ser un directorio y se vuelve producto de ingresos:
-- niveles de patrocinio, portal self-service del expositor (/mi-stand),
-- leads (stand_scans de la Fase 15) y reuniones con intención.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Niveles de patrocinio y campos por nivel.
--    básico   = descripción + logo
--    plata    = + galería y video
--    oro      = + catálogo y botón de WhatsApp directo
--    diamante = + posición destacada (primero en el listado, badge)
-- ------------------------------------------------------------
alter table public.stands
  add column if not exists tier text not null default 'basico',
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists video_url text,
  add column if not exists catalog_url text,
  add column if not exists whatsapp_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stands_tier_check'
  ) then
    alter table public.stands
      add constraint stands_tier_check
      check (tier in ('basico', 'plata', 'oro', 'diamante'));
  end if;
end $$;

create index if not exists stands_tier_idx on public.stands (edition, tier);

-- ------------------------------------------------------------
-- 2. Reuniones con intención (Brella) + fix hallazgo #11.
--    - intent: qué busca el asistente (el expositor prioriza su agenda).
--    - slot_note: franja horaria que propone el expositor al aceptar.
--    - updated_at + trigger: rastro de cuándo se aceptó/rechazó (hallazgo #31).
--    - UNIQUE(user_id, stand_id): una solicitud por asistente por stand.
-- ------------------------------------------------------------
alter table public.stand_meetings
  add column if not exists intent text,
  add column if not exists slot_note text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stand_meetings_intent_check'
  ) then
    alter table public.stand_meetings
      add constraint stand_meetings_intent_check
      check (intent is null or intent in ('comprar', 'proveedor', 'alianza', 'otro'));
  end if;
end $$;

drop trigger if exists stand_meetings_set_updated_at on public.stand_meetings;
create trigger stand_meetings_set_updated_at
  before update on public.stand_meetings
  for each row execute function public.set_updated_at();

-- Deduplicar ANTES del índice único: conserva la fila más reciente
-- de cada (user_id, stand_id).
delete from public.stand_meetings m
 using public.stand_meetings dup
 where m.user_id = dup.user_id
   and m.stand_id = dup.stand_id
   and m.created_at < dup.created_at;

create unique index if not exists stand_meetings_user_stand_unique
  on public.stand_meetings (user_id, stand_id);

-- ------------------------------------------------------------
-- 3. RLS del portal del expositor.
--    El staff LEE las reuniones de su stand (los leads ya son legibles
--    por la política de stand_scans de la Fase 15).
--
--    NOTA de seguridad: NO se agrega política de UPDATE sobre stands ni
--    stand_meetings para el staff. Postgres no restringe columnas por
--    política y una política amplia dejaría al staff cambiarse su propio
--    tier vía el API REST. Todas las escrituras del portal pasan por
--    server actions (src/app/mi-stand/actions.ts) que validan la
--    membresía en stand_staff y el tier ANTES de escribir con la
--    service key.
-- ------------------------------------------------------------
drop policy if exists "citas: staff de stand lee" on public.stand_meetings;
create policy "citas: staff de stand lee"
  on public.stand_meetings for select
  using (
    exists (
      select 1 from public.stand_staff s
       where s.stand_id = stand_meetings.stand_id
         and s.user_id = auth.uid()
    )
  );
