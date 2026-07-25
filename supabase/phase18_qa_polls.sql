-- ============================================================
-- App Feria Effix — FASE 18: Q&A en vivo + encuestas
-- ------------------------------------------------------------
-- Ejecutar DESPUÉS de phase15_pasaporte.sql. Idempotente.
--
-- Contenido:
--   1. Q&A moderado: estado en speaker_questions + upvotes.
--   2. Charla "finalizada" (talks.status gana 'finished').
--   3. Encuesta flash post-charla (talk_feedback).
--   4. Votaciones en vivo (live_polls + poll_votes + vista agregada).
--   5. NPS del evento (nps_responses).
--   6. Realtime para moderación/proyector.
--
-- Nota de modelo: el Q&A cuelga de speaker_questions (por PONENTE, que en
-- este repo es 1:1 con su charla); la encuesta flash y los polls cuelgan
-- de talks. Las tablas nuevas heredan los GRANTs de phase12b (default
-- privileges) — aquí solo van políticas RLS y permisos de vistas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Q&A moderado.
--    Estados: pending (recién enviada) → approved (visible y votable)
--    → answered (respondida en vivo) | discarded (descartada).
--    Al agregar la columna por primera vez, las preguntas históricas
--    quedan 'approved' (antes todas eran visibles).
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'speaker_questions'
       and column_name = 'status'
  ) then
    alter table public.speaker_questions
      add column status text not null default 'pending';
    update public.speaker_questions set status = 'approved';
  end if;
end $$;

alter table public.speaker_questions
  drop constraint if exists speaker_questions_status_check;
alter table public.speaker_questions
  add constraint speaker_questions_status_check
  check (status in ('pending', 'approved', 'answered', 'discarded'));

create index if not exists speaker_questions_status_idx
  on public.speaker_questions (speaker_id, status);

-- La lectura deja de ser totalmente pública: se ven las aprobadas y
-- respondidas; cada quien ve además las suyas (para saber que están en
-- revisión); admin ve todas.
drop policy if exists "preguntas: lectura pública" on public.speaker_questions;
drop policy if exists "preguntas: lectura moderada" on public.speaker_questions;
create policy "preguntas: lectura moderada"
  on public.speaker_questions for select
  using (
    status in ('approved', 'answered')
    or auth.uid() = user_id
    or public.is_admin()
  );

drop policy if exists "preguntas: admin modera" on public.speaker_questions;
create policy "preguntas: admin modera"
  on public.speaker_questions for update
  using (public.is_admin()) with check (public.is_admin());

-- Upvotes: uno por usuario por pregunta, SOLO sobre aprobadas/respondidas.
create table if not exists public.question_votes (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.speaker_questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists question_votes_question_idx
  on public.question_votes (question_id);

alter table public.question_votes enable row level security;

drop policy if exists "votos pregunta: usuario ve los suyos" on public.question_votes;
create policy "votos pregunta: usuario ve los suyos"
  on public.question_votes for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "votos pregunta: usuario vota" on public.question_votes;
create policy "votos pregunta: usuario vota"
  on public.question_votes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.speaker_questions q
       where q.id = question_id and q.status in ('approved', 'answered')
    )
  );

drop policy if exists "votos pregunta: usuario retira el suyo" on public.question_votes;
create policy "votos pregunta: usuario retira el suyo"
  on public.question_votes for delete
  using (auth.uid() = user_id);

-- Conteo agregado de votos (para lista y proyector) SIN exponer quién votó.
create or replace view public.question_vote_counts as
  select question_id, count(*)::int as votes
    from public.question_votes
   group by question_id;

alter view public.question_vote_counts set (security_invoker = false);
grant select on public.question_vote_counts to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Charla finalizada (dispara la encuesta flash desde el admin).
-- ------------------------------------------------------------
alter table public.talks drop constraint if exists talks_status_check;
alter table public.talks
  add constraint talks_status_check
  check (status in ('active', 'cancelled', 'finished'));

-- ------------------------------------------------------------
-- 3. Encuesta flash post-charla: 1 tap (1-5 estrellas) + comentario.
-- ------------------------------------------------------------
create table if not exists public.talk_feedback (
  id         uuid primary key default gen_random_uuid(),
  talk_id    uuid not null references public.talks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      int  not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (talk_id, user_id)
);

create index if not exists talk_feedback_talk_idx on public.talk_feedback (talk_id);

alter table public.talk_feedback enable row level security;

drop policy if exists "feedback: usuario ve el suyo" on public.talk_feedback;
create policy "feedback: usuario ve el suyo"
  on public.talk_feedback for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "feedback: usuario envía el suyo" on public.talk_feedback;
create policy "feedback: usuario envía el suyo"
  on public.talk_feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "feedback: usuario corrige el suyo" on public.talk_feedback;
create policy "feedback: usuario corrige el suyo"
  on public.talk_feedback for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Votaciones en vivo ("¿cuántos venden en Amazon?").
--    options = arreglo jsonb de strings; option_idx es 0-based.
-- ------------------------------------------------------------
create table if not exists public.live_polls (
  id         uuid primary key default gen_random_uuid(),
  talk_id    uuid references public.talks(id) on delete set null,
  question   text not null,
  options    jsonb not null default '[]'::jsonb,
  active     boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.live_polls enable row level security;

-- Pregunta y opciones no son sensibles: lectura pública (el proyector
-- corre sin sesión).
drop policy if exists "polls: lectura pública" on public.live_polls;
create policy "polls: lectura pública"
  on public.live_polls for select using (true);

drop policy if exists "polls: admin gestiona" on public.live_polls;
create policy "polls: admin gestiona"
  on public.live_polls for all
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.live_polls(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  option_idx int  not null check (option_idx >= 0),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);

alter table public.poll_votes enable row level security;

-- El voto individual es privado (solo el propio y admin); el proyector
-- lee los AGREGADOS por la vista poll_results.
drop policy if exists "votos poll: usuario ve el suyo" on public.poll_votes;
create policy "votos poll: usuario ve el suyo"
  on public.poll_votes for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "votos poll: usuario vota en polls activas" on public.poll_votes;
create policy "votos poll: usuario vota en polls activas"
  on public.poll_votes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.live_polls p where p.id = poll_id and p.active)
  );

drop policy if exists "votos poll: usuario cambia el suyo" on public.poll_votes;
create policy "votos poll: usuario cambia el suyo"
  on public.poll_votes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.live_polls p where p.id = poll_id and p.active)
  );

-- Resultados agregados por opción (0-based), sin exponer votantes.
create or replace view public.poll_results as
  select
    p.id as poll_id,
    (opt.ordinality - 1)::int as option_idx,
    opt.value as option_label,
    count(v.id)::int as votes
  from public.live_polls p
  cross join lateral jsonb_array_elements_text(p.options)
    with ordinality as opt(value, ordinality)
  left join public.poll_votes v
    on v.poll_id = p.id and v.option_idx = opt.ordinality - 1
  group by p.id, opt.ordinality, opt.value;

alter view public.poll_results set (security_invoker = false);
grant select on public.poll_results to anon, authenticated;

-- ------------------------------------------------------------
-- 5. NPS del evento (0-10 + comentario), uno por usuario por edición.
-- ------------------------------------------------------------
create table if not exists public.nps_responses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  edition    int  not null references public.editions(year),
  score      int  not null check (score between 0 and 10),
  comment    text,
  created_at timestamptz not null default now(),
  unique (user_id, edition)
);

alter table public.nps_responses enable row level security;

drop policy if exists "nps: usuario ve el suyo" on public.nps_responses;
create policy "nps: usuario ve el suyo"
  on public.nps_responses for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "nps: usuario responde" on public.nps_responses;
create policy "nps: usuario responde"
  on public.nps_responses for insert
  with check (auth.uid() = user_id);

drop policy if exists "nps: usuario corrige" on public.nps_responses;
create policy "nps: usuario corrige"
  on public.nps_responses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. Realtime: publica los cambios para moderación y proyector.
--    (Los suscriptores solo reciben filas que su RLS les permita ver.)
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['speaker_questions', 'question_votes', 'live_polls', 'poll_votes']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
