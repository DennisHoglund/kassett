// Höj versionen vid varje ändring av appfilerna så att telefonen hämtar nya filer.
const CACHE = 'kassett-v4';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './spotify.js',
  './matare.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

const TYPSNITT = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Typsnitt: cache först
  if (TYPSNITT.includes(url.hostname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const kopia = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopia)); }
      return res;
    })));
    return;
  }

  // Spotify och omslag går alltid direkt till nätet
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rapport/')) return;

  // Egna filer: nätet först så att nya versioner alltid används
  event.respondWith(
    fetch(req)
      .then((res) => { if (res.ok) { const kopia = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopia)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
