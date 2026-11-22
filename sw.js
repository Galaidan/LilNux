/* LilNux service worker: keeps the game playable offline once it has been opened.
 * Bump VERSION whenever any file changes so phones pick up the new copy. */
const VERSION = 'lilnux-v6';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'js/terminal.js', 'js/content.js', 'js/game.js', 'css/ck.css',
  'js/ck/state.js', 'js/ck/world.js', 'js/ck/rules.js', 'js/ck/story.js', 'js/ck/puzzle.js', 'js/ck/combat.js',
  'js/ck/engine.js', 'js/ck/art.js', 'js/ck/scenes.js', 'js/ck/ui.js', 'js/ck/main.js',
  'assets/lilnux.svg', 'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (so updates arrive), falling back to the cached copy when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
