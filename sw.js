// APEX — l'app funziona senza rete; mappe, caratteri e dati già visti restano in memoria
const CACHE = 'apex-v5';
const FILES = ['./', 'index.html', 'css/base.css', 'core/pacenotes.js', 'core/util.js', 'core/voice.js', 'core/map.js', 'core/engine.js', 'core/ui.js', 'core/boot.js',
  'styles/rally/rally.js', 'styles/rally/rally.css', 'styles/rally/cars.js', 'styles/gta/gta.js', 'styles/gta/gta.css', 'styles/rdr/rdr.js', 'styles/rdr/rdr.css', 'styles/minecraft/minecraft.js', 'styles/minecraft/minecraft.css',
  'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css', 'vendor/jszip.min.js', 'manifest.webmanifest', 'icon-192.png', 'nosleep.mp4'];
const TILES = 'apex-mappe';
const TILE_HOSTS = /^tiles\.openfreemap\.org$|^server\.arcgisonline\.com$|^fonts\.(googleapis|gstatic)\.com$/;
const MAX_TILES = 6000;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))); self.clients.claim(); });
let puts = 0;
async function trim(c) { const keys = await c.keys(); if (keys.length > MAX_TILES) for (const k of keys.slice(0, keys.length - MAX_TILES + 400)) await c.delete(k); }
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (TILE_HOSTS.test(u.hostname)) {
    // stile della mappa: prima la rete (aggiornamenti), il resto prima la memoria
    const styleDoc = /\/styles\//.test(u.pathname);
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit && !styleDoc) return hit;
      try { const r = await fetch(e.request); if (r.ok) { c.put(e.request, r.clone()); if (++puts % 100 === 0) trim(c); } return r; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
