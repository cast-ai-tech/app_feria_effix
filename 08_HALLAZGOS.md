# 08 · Hallazgos: bugs, riesgos y pendientes

Detectados durante el barrido completo del código. Ordenados por severidad.

## 🔴 Bugs reales

1. **Textareas del admin no aceptan texto.** `TextAreaField` es siempre controlado, pero en 4 pantallas se pasa `value="" onChange={() => {}}`: `AdminStandsClient` (descripción), `AdminPonentesClient` (bio), `AdminAcademiaClient` (descripción), `AdminAlianzasClient` (descripción). El usuario no puede escribir; esos campos llegan siempre vacíos. Fix: replicar el patrón de `AdminAgendaClient` (`useState` real) o hacer `TextAreaField` no-controlado con `defaultValue`.
2. **`toEventTimestamp` hardcodeado a octubre 2026** (`admin/agenda/actions.ts`): día 1→`2026-10-16`, etc. Ignora `edition`; romperá en la próxima edición.
3. **`recordings.edition` con CHECK `in (2024, 2025, 2026)`**: bloqueará la edición 2027 sin un `ALTER TABLE`. Igual las constantes hardcodeadas `EDITIONS=[2026,2025,2024]` en `AcademiaClient` y `DAYS=[1,2,3]` en `AgendaClient`.
4. **Seeds de `recordings` y `offers` duplican filas al re-ejecutar** (`on conflict do nothing` sin índice único; talks/stands/speakers usan el patrón correcto `where not exists`).
5. **`importTiquetera` reporta mal:** cuenta `inserted++` aunque `ignoreDuplicates` descartara la fila; filas sin `order_number` no chocan con el UNIQUE parcial → duplicados posibles por email.

## 🟠 Funcionalidad incompleta

6. **Sin escáner QR de check-in** — `verifyTotp()` listo pero sin ruta/action que lo use. Check-in hoy: botón manual "Marcar usada". Imprescindible antes del evento.
7. **4 server actions `update*` sin UI** (stands, ponentes, academia, alianzas): no hay forma de editar, solo crear/borrar/toggle. Además `admin/ponentes/page.tsx` no trae bio/foto/redes, así que faltarían datos para prellenar.
8. **PWA no instalable:** `manifest.icons` vacío; el SW cachea `/icons/` pero el directorio no existe.
9. **`/ingresar` ignora `?error=auth`** que le envía el callback; el usuario vuelve al login sin explicación.
10. **Sin `next`/redirect de retorno en login:** bloqueado en `/alianzas` → tras ingresar aterriza en `/perfil`.
11. **`StandsClient` no lee citas previas:** al recargar, una cita ya solicitada vuelve a mostrar "Agendar" (y `stand_meetings` no tiene constraint única user+stand → duplicados).
12. **Hard deletes sin confirmación** en stands, speakers, recordings, offers.

## 🟡 Seguridad / privacidad (mayormente por diseño, documentar)

13. **Secret TOTP persistente en el dispositivo** (localStorage + cache SW + payload RSC) y **nada se limpia al cerrar sesión** — `clearCachedTickets()` es código muerto. Mínimo: invocarla en logout.
14. **Catálogos con lectura pública vía anon key** (talks, stands, speakers, offers): el "bloqueo" de módulos es solo de UI. Intencional y comentado en el SQL, pero conviene tenerlo presente.
15. **`recording_ratings` expone `user_id`** con lectura pública: cualquier autenticado puede ver quién calificó qué.
16. **Middleware sin gating:** módulo nuevo sin `getAccess()` nace abierto. La RLS es la única red de seguridad.
17. **Errores crudos de Supabase mostrados al usuario** en todos los forms de auth.
18. **`/clave-nueva` sin guardia de sesión de recovery.**
19. **`assertAdmin()` lanza excepción no capturada** por los clients del admin (UX de error rota para no-admins o service key ausente).

## 🔵 Placeholders de producción sin reemplazar

20. `black_whatsapp_url` = `https://wa.me/573000000000`.
21. Los 5 `referral_url` de ofertas = `https://example.com/ref/...`.
22. Los `video_url` del seed de Academia apuntan al mismo video de YouTube.
23. `refund_full_days_before_event` = 30, marcado **TBD** (definir con La Tiquetera).
24. **Falta `.env.example`** aunque el README manda copiarlo.

## ⚪ Deuda técnica / limpieza

25. **README raíz desactualizado**: dice "Fase 0 completada" con estructura vieja; el repo cubre Fases 0–11.
26. `assertAdmin()` duplicada literal en 6 archivos → extraer a `src/lib/`.
27. Acoplamiento suelto `talks` ↔ `speakers` sin sincronización: editar una charla en Agenda no actualiza `talk_title`/`talk_starts_at` del ponente (duplicados manuales).
28. `claim_my_tickets()` se ejecuta en **cada** render de `/tickets`, tenga o no boletas.
29. `academia/page.tsx` trae todas las grabaciones de todas las ediciones y filtra en cliente.
30. Comentario desactualizado en `totp.ts` ("IndexedDB" → es localStorage).
31. `stand_meetings` sin `updated_at`/trigger: no queda rastro de cuándo se aceptó/rechazó.
32. Listados admin sin paginación ni buscador (límites 300–500).
33. Sin tests de ningún tipo; `npm audit` reporta 3 vulnerabilidades high en dependencias.
34. Copy "en tiempo real"/"en vivo" sin realtime implementado — decidir si se implementa (Supabase Realtime) o se ajusta el copy.
35. Inconsistencia de numeración en docs: Comunidad aparece como Fase 9 y Fase 10 según el documento (el SQL usa 10). `BRANDBOOK_FERIA_EFFIX_2026.pdf` referenciado pero no está en el repo.

## Checklist mínimo pre-evento

- [ ] Fix textareas del admin (bug 1)
- [ ] Construir escáner de check-in con `verifyTotp` (6)
- [ ] Iconos PWA (8)
- [ ] Reemplazar placeholders: WhatsApp Black, referral URLs, videos (20–22)
- [ ] Definir ventana de reembolso real (23)
- [ ] Crear `.env.example` y actualizar README raíz (24, 25)
- [ ] Limpiar cache de boletas en logout (13)
