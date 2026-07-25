# 02 · Modelo de datos (Supabase / Postgres)

Scripts en `supabase/`, todos idempotentes. **Orden de ejecución:** `schema.sql` → `phase3_tickets.sql` → `phase4_agenda.sql` → `phase6_stands.sql` → `phase7_ponentes.sql` → `phase8_academia.sql` → `phase9_alianzas.sql` → `phase10_comunidad.sql`. No hay SQL para Fase 5 (Mapa, estático) ni Fases 11/12.

## Diagrama de relaciones

```
auth.users ──1:1── profiles (trigger handle_new_user)
auth.users ──1:N── tickets ──N:1── ticket_types
                   tickets ──1:N── ticket_transfers
                   tickets ──1:N── commissions (panel embajadores, externo)
speakers ──1:N── speaker_ratings / speaker_questions / speaker_follows
stands ──1:N── stand_meetings ──N:1── auth.users
recordings ──1:N── recording_ratings
talks (sin FK a speakers — acoplamiento suelto deliberado: speaker_id uuid sin constraint)
offers, roles, app_config (independientes)
community_directory = VISTA sobre profiles (columnas públicas)
```

## Tablas

### `profiles` (schema.sql) — 1:1 con auth.users
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name`, `country`, `role`, `bio` | text | `role` = slug de `roles` o texto libre (sin FK) |
| `ticket_email` | text | Correo de cruce con La Tiquetera |
| `whatsapp`, `instagram`, `linkedin` | text | Para el botón "conectar" de Comunidad |
| `is_admin` | boolean not null default false | **Única noción de privilegio en toda la app** |
| `created_at`, `updated_at` | timestamptz | |

Índice funcional: `lower(ticket_email)`.

### `roles` (schema.sql) — catálogo de roles de perfil
`slug` PK · `label` · `sort_order`. Seed: trafficker, agencia, marca, mentor, asistente. Es taxonomía del perfil, **no** un sistema de permisos.

### `app_config` (phase3) — clave/valor de configuración
`key` PK · `value` · `description` · `updated_at`. Seeds:
- `current_edition` = '2026' (la lee `getAccess()`)
- `event_start_date` = '2026-10-16', `event_end_date` = '2026-10-18'
- `refund_full_days_before_event` = '30' (**marcado TBD**)
- `black_whatsapp_url` = 'https://wa.me/573000000000' (**placeholder**)

### `ticket_types` (phase3)
`slug` PK · `label` · `price_cop` bigint · `sale_channel` ('tiquetera'|'whatsapp', sin CHECK) · `sort_order`.
Seed: general $183.000 (tiquetera) · vip $1.050.000 (tiquetera) · black $3.997.000 (whatsapp).

### `tickets` (phase3) — tabla central
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users ON DELETE SET NULL | **NULL = importada sin reclamar** |
| `ticket_email` | text not null | Correo de compra (clave de cruce) |
| `holder_name` | text | |
| `ticket_type` | text not null FK → ticket_types(slug) | |
| `order_number` | text | Orden de La Tiquetera |
| `purchase_date` | timestamptz | |
| `edition` | int not null default 2026 | |
| `status` | text CHECK (active\|used\|cancelled) | default 'active' |
| `secret` | text not null | **Semilla TOTP base32 — el dato más sensible** |
| `totp_step` | int default 30 | Segundos por rotación del QR |
| `totp_digits` | int default 8 | |
| `source` | text CHECK (tiquetera_csv\|manual_black\|api) | |
| `original_owner_id` | uuid | Se preserva en transferencias |
| `refunded_at`, `refund_full`, `used_at` | | Reembolso y check-in |

Índices: **UNIQUE parcial** `(order_number) WHERE order_number IS NOT NULL` (evita duplicados en re-imports CSV) · `(user_id)` · `lower(ticket_email)`.

### `ticket_transfers` (phase3) — auditoría de transferencias
`ticket_id` FK CASCADE · `from_user_id`/`to_user_id` FK SET NULL · `from_email` · `to_email` not null · `note` · `transferred_at`.

### `commissions` (phase3) — para el Panel de Embajadores (externo)
`ticket_id` FK SET NULL · `order_number` (respaldo) · `ambassador_ref` (id externo) · `amount_cop` · `status` CHECK (calculated|paid|to_deduct) · `edition`. Regla: al reembolsar una boleta la comisión NO se borra, pasa a `to_deduct`.

### `talks` (phase4) — agenda
`title` not null · `description` · `speaker_id` uuid **sin FK** · `speaker_name` · `auditorium` · `day` CHECK (1|2|3) · `starts_at`/`ends_at` timestamptz (offset -05 Medellín) · `edition` · `status` CHECK (active|cancelled). Seed: 6 charlas.

### `stands` (phase6)
`name` not null · `category` · `stand_number` · `description` · `logo_url` · `edition`. Seed: 6 expositores.

### `stand_meetings` (phase6) — solicitudes de cita
`stand_id` FK CASCADE · `user_id` FK CASCADE · `message` · `status` CHECK (pending|accepted|declined) · `created_at`. ⚠️ Sin `updated_at` ni trigger; sin constraint única user+stand (se pueden duplicar solicitudes).

### `speakers` (phase7)
`full_name` not null · `photo_url` · `bio` · `role` · `talk_title` · `talk_starts_at` (**duplicados de talks, sin FK — sin sincronización**) · `instagram` · `linkedin` · `website` · `edition`. Seed: 5 ponentes.

### `speaker_ratings` / `speaker_questions` / `speaker_follows` (phase7)
- `speaker_ratings`: `stars` CHECK 1–5, **UNIQUE (speaker_id, user_id)**.
- `speaker_questions`: `text` not null; `user_id` ON DELETE **SET NULL** (la pregunta sobrevive anónima).
- `speaker_follows`: **UNIQUE (speaker_id, user_id)**.

### `recordings` (phase8) — Academia
`title` not null · `speaker_name` · `description` · `video_url` · `edition` **CHECK in (2024, 2025, 2026)** ⚠️ (bloqueará 2027 sin ALTER) · `approved` boolean default false. Seed: 6 (5 aprobadas + 1 borrador).

### `recording_ratings` (phase8)
`stars` CHECK 1–5, **UNIQUE (recording_id, user_id)**.

### `offers` (phase9) — Alianzas
`title` not null · `partner_name` · `description` · `discount` (texto libre) · `referral_url` (**el link lo administra Feria Effix; la comisión es de Effix**) · `edition` · `active` boolean default true. Seed: 5 con URLs `example.com` (**placeholders**).

### `community_directory` (phase10) — VISTA, no tabla
```sql
select id, full_name, country, role, bio, whatsapp, instagram, linkedin from profiles
```
Con `security_invoker = false` (corre como owner → elude la RLS de `profiles`) exponiendo solo columnas públicas. Excluye `ticket_email` e `is_admin`. `REVOKE` a `anon`, `GRANT SELECT` a `authenticated` (sin login no se ven los WhatsApp del directorio).

## Políticas RLS (resumen)

Todas las tablas tienen RLS activa. Patrón dominante: **lectura pública / escritura admin** (el gate de módulo vive en la página, no en la BD).

| Tabla | SELECT | Escritura |
|---|---|---|
| `profiles` | solo dueño | solo dueño (sin DELETE) |
| `roles`, `ticket_types` | público | solo service_role |
| `app_config` | público | admin |
| `tickets` | dueño o admin | admin |
| `ticket_transfers` | involucrado o admin | admin |
| `commissions` | **solo admin** | admin |
| `talks`, `stands`, `speakers` | **público** ⚠️ | admin |
| `stand_meetings` | solicitante o admin | INSERT solicitante · UPDATE solo admin · DELETE solicitante o admin |
| `speaker_ratings` | público (promedios) | el propio usuario |
| `speaker_questions` | público | INSERT autenticado propio · DELETE autor |
| `speaker_follows` | **solo el propio usuario** | propio |
| `recordings` | `approved = true OR is_admin()` | admin |
| `recording_ratings` | público ⚠️ (expone user_id) | propio |
| `offers` | `active = true OR is_admin()` | admin |

⚠️ Lectura pública de catálogos = cualquiera con la anon key puede leer talks/stands/speakers/offers aunque la UI los muestre "bloqueados". Documentado como intencional en el SQL.

## Funciones SQL

| Función | Tipo | Propósito |
|---|---|---|
| `set_updated_at()` | trigger | `updated_at = now()` en BEFORE UPDATE (8 tablas) |
| `handle_new_user()` | trigger, SECURITY DEFINER | AFTER INSERT en `auth.users`: crea `profiles` copiando `raw_user_meta_data` (full_name, country, role, bio) y usa `new.email` como `ticket_email`. Execute solo para `supabase_auth_admin` |
| `is_admin()` | sql stable, SECURITY DEFINER | Lee `profiles.is_admin` del `auth.uid()`; base de casi todas las policies de escritura |
| `claim_my_tickets()` → int | plpgsql, SECURITY DEFINER | Vincula boletas con `user_id IS NULL` cuyo `lower(ticket_email)` coincide con el email del usuario o su `profiles.ticket_email`. Grant solo `authenticated` |
| `link_ticket_by_order(p_order, p_email)` → boolean | plpgsql, SECURITY DEFINER | Vinculación manual por número de orden + correo. Grant solo `authenticated` |

## Storage

**No hay buckets ni una sola llamada a `supabase.storage`** en el proyecto. Imágenes/videos = URLs de texto (`stands.logo_url`, `speakers.photo_url`, `recordings.video_url`). El README menciona Storage como parte del stack pero aún no se usa.
