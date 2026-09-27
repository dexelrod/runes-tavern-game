const CACHE = 'elder-taki-v38';
const CORE = ['./','./index.html','./styles.css?v=38','./audio.css?v=35','./app.js?v=38','./assets/tavern-environment-v37.jpg','./assets/table-wood-v37.jpg','./assets/model-viewer.min.js','./assets/stylized_beer_mug.glb','./assets/duel-opponents.png','./duel/opponents.js','./game-engine/cards.js','./game-engine/engine.js','./game-engine/match.js','./game-ai/bot.js','./platform/audio.js','./platform/storage.js','./platform/transport.js','./ui/card.js','./manifest.webmanifest','./favicon.svg'];

const remember = async request => {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const needsFreshCode = ['document', 'script', 'style'].includes(event.request.destination);
  if (needsFreshCode) {
    event.respondWith(
      remember(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(hit => hit || remember(event.request).catch(() => caches.match('./index.html')))
  );
});
