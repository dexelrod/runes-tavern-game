const CACHE = 'runes-v62';
const PROP_ASSETS = ['./assets/props/drinks/ceramic-cup.png','./assets/props/drinks/dark-glass-bottle.png','./assets/props/drinks/medieval-flask.png','./assets/props/drinks/pewter-goblet.png','./assets/props/drinks/pewter-tankard.png','./assets/props/drinks/wooden-tankard.png','./assets/props/gambling/carved-betting-token.png','./assets/props/gambling/coin-pile-small.png','./assets/props/gambling/dice-pair.png','./assets/props/gambling/loose-coins.png','./assets/props/gambling/scattered-coins.png','./assets/props/gambling/stacked-coins.png','./assets/props/food/bread-chunk.png','./assets/props/food/cheese-wedge.png','./assets/props/food/dried-meat.png','./assets/props/food/half-eaten-snack.png','./assets/props/food/nuts-group.png','./assets/props/food/rustic-loaf.png','./assets/props/personal/iron-key.png','./assets/props/personal/leather-coin-pouch.png','./assets/props/personal/small-cork.png','./assets/props/personal/smoking-pipe.png','./assets/props/personal/worn-metal-ring.png','./assets/props/mystical/carved-rune-token.png','./assets/props/mystical/ritual-token.png','./assets/props/mystical/small-amulet.png','./assets/props/tavern/parchment-scrap.png','./assets/props/bonus/carved-figurine.png','./assets/props/bonus/map-scrap.png'];
const CARD_ASSETS = ['number-1.svg','number-3.svg','number-4.svg','number-5.svg','number-6.svg','number-7.svg','number-8.svg','number-9.svg','crossbow.svg','runed-crossbow.svg','rune.svg','king.svg','shield.svg','curse-plus-2.svg','quickstep.svg','riposte.svg'].map(name=>`./assets/cards/${name}`);
const BRAND_ASSETS = ['./assets/brand/runes-wordmark.svg','./assets/brand/runes-white.svg?v=60','./assets/brand/runes-seal.svg'];
const CORE = ['./','./index.html','./styles.css?v=62','./audio.css?v=35','./app.js?v=62','./assets/tavern-environment-v37.jpg','./assets/table-wood-v37.jpg','./assets/duel-opponents.png','./duel/opponents.js','./duel/bramm.js','./game-engine/cards.js','./game-engine/engine.js','./game-engine/match.js','./game-ai/bot.js','./platform/audio.js','./platform/storage.js','./platform/transport.js','./ui/card.js','./ui/hand-layout.js','./manifest.webmanifest','./favicon.svg',...PROP_ASSETS,...CARD_ASSETS,...BRAND_ASSETS];

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
