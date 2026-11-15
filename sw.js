/* عدسة النهار — عامل الخدمة للعمل بدون إنترنت | جميع الحقوق محفوظة © 2026 وطن النهار */
const CACHE = 'nahar-lens-v2';
const ASSETS = ['./', './index.html', './css/app.css', './manifest.webmanifest', './assets/logo.svg', './assets/icons/icon.svg', './assets/icons/icon-180.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/fonts/Cairo.ttf', './assets/fonts/ElMessiri.ttf',
  './js/util.js', './js/native.js', './privacy.html', './js/db.js', './js/store.js', './js/projects.js', './js/script.js', './js/board.js', './js/shots.js', './js/engine.js', './js/editor.js', './js/export.js', './js/app.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  // الشبكة أولاً ثم الذاكرة المؤقتة، لضمان وصول التحديثات
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
