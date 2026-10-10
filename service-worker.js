// Service worker: guarda los archivos de la app para que funcione sin conexión.
// Estrategia: primero red (así ves los cambios al actualizar) y, si no hay red, la copia guardada.
// Si añades un archivo nuevo, apúntalo en ARCHIVOS y sube el número de VERSION.
const VERSION = 'pasalista-v2';
const ARCHIVOS = [
  './', 'index.html', 'manifest.json', 'icons/icon.svg',
  'css/base.css', 'css/layout.css', 'css/components.css',
  'js/app.js', 'js/asistencia.js', 'js/router.js', 'js/storage.js', 'js/state.js', 'js/i18n.js', 'js/theme.js',
  'js/utils/dates.js', 'js/utils/dom.js', 'js/logic/periods.js', 'js/logic/sessions.js',
  'js/views/hoy.js', 'js/views/calendario.js', 'js/views/especiales.js', 'js/views/mas.js',
  'js/views/participantes.js', 'js/views/grupos.js',
  'js/views/temporadas.js', 'js/views/ajustes.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});
