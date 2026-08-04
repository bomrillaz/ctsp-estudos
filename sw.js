/* Service Worker — Bombeiro CTSP (Fase 2)
   Estrategia:
   - navegacao (HTML): NETWORK-FIRST -> online sempre pega o app novo; offline cai no cache.
     (evita o classico "preso na versao velha" do PWA).
   - demais same-origin (data.js, assets, css): STALE-WHILE-REVALIDATE (rapido + atualiza em 2o plano).
   - cross-origin (Firebase SDK, reCAPTCHA, fontes): passa direto, sem cachear.
   Atualizacao: NAO faz skipWaiting sozinho — espera o usuario confirmar no aviso da UI,
   que manda SKIP_WAITING; no controllerchange o app recarrega UMA vez. */
const CACHE = 'ctsp-cache-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // cross-origin: deixa o browser resolver

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
