// Service worker "U-Life" — v2
// Regole:
//  - intercetta SOLO richieste GET verso lo stesso dominio dell'app (HTML/CSS/JS/icone);
//  - tutto il resto (Supabase, CDN, API AI, POST...) passa direttamente alla rete e non viene mai messo in cache:
//    i dati e le risposte di autenticazione non devono mai essere serviti da una copia vecchia;
//  - i file dell'app usano "prima la rete, poi la cache": se sei online vedi sempre la versione aggiornata,
//    se sei offline si usa l'ultima copia salvata.
const CACHE_NAME = 'taccuino-cache-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/supabaseClient.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  // Un file mancante non deve far fallire l'intera installazione (cache.addAll è "tutto o niente").
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase, CDN, ecc.: solo rete
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
      )
  );
});
