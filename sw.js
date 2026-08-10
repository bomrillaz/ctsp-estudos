/* Service Worker — Prontidão · CBMRS (Fase 2 + hotfix v1.106)
   REGRA DE OURO: só o APP (same-origin: index, data.js, assets) e os SCRIPTS ESTATICOS
   do Firebase SDK (gstatic /firebasejs/) passam pelo cache. TUDO que e Firebase DINAMICO
   (RTDB firebaseio.com, Auth googleapis.com, reCAPTCHA) passa DIRETO, sem intercept —
   senao o SW cacheava as chamadas do banco e o app abria zerado / "sem conexao".
   - navegacao (HTML): network-first (offline cai no cache).
   - demais GET elegiveis: stale-while-revalidate.
   Atualizacao: skipWaiting no install (hotfix chega automatico); no controllerchange
   o app recarrega UMA vez (guard de 1a instalacao no index).
   OBS: ao mudar o ?v= do data.js, atualizar a URL abaixo. */

/* ── Fase 4: FCM em background (SW ÚNICO, sem guerra de escopo) ──
   Importamos SÓ app+messaging (NUNCA database) — a regra de ouro continua valendo:
   este SW não toca o RTDB dinâmico. onBackgroundMessage usa o evento 'push', não
   intercepta o fetch handler abaixo. Se o gstatic estiver fora do ar no start do SW,
   o try/catch evita que a falha derrube o resto (cache/offline seguem funcionando). */
try {
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey: 'AIzaSyCnwg94KLWwyFB2-bzJOqRotsaSICdFtoM',
    authDomain: 'ctsp-estudos.firebaseapp.com',
    projectId: 'ctsp-estudos',
    messagingSenderId: '267159679171',
    appId: '1:267159679171:web:1ffb1853f07aff3ae2b276'
  });
  // DATA-ONLY (bloco 50): o remetente manda tudo em `data` e SEM `notification`, então o FCM
  // não exibe nada sozinho — este handler é a ÚNICA exibição. Fim da notificação duplicada.
  firebase.messaging().onBackgroundMessage((payload) => {
    const d = (payload && payload.data) || {};
    self.registration.showNotification(d.title || 'Prontidão · CBMRS', {
      body: d.body || '',
      icon: d.icon || 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      data: { link: d.link || '/ctsp-estudos/' }
    });
  });
} catch (_) {}

// Clique na notificação: foca uma aba já aberta do app ou abre o link (data-only precisa disto,
// que antes vinha de graça pelo fcmOptions.link do payload notification).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '/ctsp-estudos/';
  e.waitUntil((async () => {
    const cl = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cl) { if (c.url.indexOf('/ctsp-estudos') !== -1 && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(link);
  })());
});

const CACHE = 'ctsp-cache-v10';
const SAME = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
  'data.js?v=185'
];
const CROSS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SAME.map((u) => cache.add(u)));
    await Promise.allSettled(CROSS.map(async (u) => {
      try { const r = await fetch(u, { mode: 'no-cors' }); await cache.put(u, r); } catch (_) {}
    }));
    await self.skipWaiting();
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
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  const sameOrigin = url.origin === self.location.origin;
  const sdkEstatico = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') !== -1;
  // Firebase dinamico / terceiros: NAO intercepta, vai direto ao servidor.
  if (!sameOrigin && !sdkEstatico) return;

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
