/* Service Worker — Bombeiro CTSP (Fase 2)
   Estrategia:
   - navegacao (HTML): NETWORK-FIRST -> online sempre pega o app novo; offline cai no cache.
   - demais GET (same e cross-origin): STALE-WHILE-REVALIDATE (rapido + atualiza em 2o plano).
   - PRECACHE no install: shell + data.js + os 3 scripts do Firebase (gstatic, via no-cors).
     Sem isso o app QUEBRAVA offline em `firebase.auth()` (SDK cross-origin nao cacheado).
   Atualizacao: NAO faz skipWaiting sozinho — espera o usuario confirmar no aviso da UI
   (SKIP_WAITING); no controllerchange o app recarrega UMA vez.
   OBS: ao mudar o ?v= do data.js, atualizar a URL abaixo e bumpar CACHE. */
const CACHE = 'ctsp-cache-v2';
const SAME = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
  'data.js?v=180'
];
const CROSS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SAME.map((u) => cache.add(u)));
    // cross-origin (SDK): no-cors -> resposta opaque, mas cacheavel e executavel como <script>
    await Promise.allSettled(CROSS.map(async (u) => {
      try { const r = await fetch(u, { mode: 'no-cors' }); await cache.put(u, r); } catch (_) {}
    }));
  })());
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

function cachePut(req, res) {
  if (res && (res.status === 200 || res.status === 0)) {
    caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {});
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req).then((res) => { cachePut(req, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    })
  );
});
