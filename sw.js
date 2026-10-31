// Офлайн-кэш приложения. При каждом изменении файлов меняйте версию CACHE.
const CACHE = 'bus-v10';
const TILES = 'bus-tiles';
const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const LIBS = ['https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css', 'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js'];
const ASSETS = ['./', './index.html', './data.json', './places.json', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' — берём файлы прямо с сайта, мимо памяти браузера
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))),
    c.addAll([LIB + 'leaflet.min.js', LIB + 'leaflet.min.css', ...LIBS])
  ])).then(() => self.skipWaiting()));
});
// На этом же адресе живут другие приложения — удаляем только свои старые версии
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('bus-v') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Кусочки карты: что уже видели — из памяти телефона, новое — из сети и сохраняем
  if (url.startsWith('https://tiles.openfreemap.org/')) {
    e.respondWith(caches.open(TILES).then(c => c.match(url).then(r => r || fetch(e.request).then(res => {
      if (res.ok) c.put(url, res.clone());
      return res;
    }))));
    return;
  }
  // Живые автобусы — только из сети
  if (url.endsWith('/buses')) return;
  // Файлы приложения и библиотеки карты — из кэша; если кэш стёрт, при интернете он восстановится
  if (!url.startsWith(self.registration.scope) && !url.startsWith(LIB) && !LIBS.some(u => url === u)) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
