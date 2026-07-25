/*
  Service Worker — Feria Effix
  Objetivo principal: que "Mi boleta" (QR con clave dinámica) funcione SIN
  conexión, incluso al abrir la app en frío.

  Estrategia:
  - Navegaciones (páginas): network-first con fallback a cache. Tras una visita
    con conexión, la última versión renderizada de /tickets queda cacheada (ya
    incluye la semilla TOTP), así que offline se sirve esa copia y el código
    rotativo se sigue calculando en el dispositivo (ver src/lib/totp.ts).
  - Estáticos de Next (/_next/...): cache-first.
  - NUNCA se cachea Supabase ni otros orígenes (solo same-origin).
*/
const CACHE = "efx-v1";
const OFFLINE_FALLBACK = "/tickets";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/tickets"]).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no tocar Supabase/externos

  // Navegaciones: network-first, fallback a la copia cacheada (offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match(OFFLINE_FALLBACK) || caches.match("/")),
        ),
    );
    return;
  }

  // Estáticos de Next: cache-first.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

/* ── Web Push (Fase 16) ─────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  let payload = { title: "Feria Effix", body: "", url: "/notificaciones" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    /* payload no-JSON: se muestra el título por defecto */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/notificaciones" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const client of all) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    }),
  );
});
