// RUNES service worker. Bump CACHE (and the ?v= query in index.html) on every publish.
const CACHE = 'runes-v118';
const ASSET_VERSION = '118';
const PROP_ASSETS = ['drinks/ceramic-cup.webp','drinks/dark-glass-bottle.webp','drinks/medieval-flask.webp','drinks/pewter-goblet.webp','drinks/pewter-tankard.webp','drinks/wooden-tankard.webp','gambling/carved-betting-token.webp','gambling/dice-pair.webp','gambling/stacked-coins.webp','food/bread-chunk.webp','food/cheese-wedge.webp','food/nuts-group.webp','personal/iron-key.webp','personal/smoking-pipe.webp','personal/worn-metal-ring.webp','mystical/carved-rune-token.webp','mystical/small-amulet.webp','bonus/map-scrap.webp','personal/coin-purse.webp','personal/arrowhead-herbs.webp','personal/wooden-flute.webp','personal/whetstone.webp','personal/inkpot-quill.webp','drinks/drinking-horn.webp'].map(name => `./assets/props/${name}`);
const CARD_ASSETS = ['number-1.svg','number-3.svg','number-4.svg','number-5.svg','number-6.svg','number-7.svg','number-8.svg','number-9.svg','crossbow.svg','runed-crossbow.svg','rune.svg','king.svg','shield.svg','curse-plus-2.svg','quickstep.svg','turnabout.svg'].map(name => `./assets/cards/${name}`);
const BRAND_ASSETS = ['./assets/brand/runes-wordmark.svg','./assets/brand/tavern-sign.webp','./assets/brand/runes-seal.svg',...['favicon-32','favicon-48','apple-touch-icon','icon-192','icon-512','icon-maskable-512'].map(name => `./assets/brand/icons/${name}.png`)];
const CHARACTER_ASSETS = [...['ron','aila','bran','sela','roderic','lio','mograth','harrow','rusk'].map(name => `./assets/characters/table/${name}-seated.webp`),'./assets/duel-opponents-2.webp'];
const CODE = ['./duel/opponents.js','./duel/bramm.js','./duel/edrin.js','./duel/ragna.js','./duel/kesh.js','./duel/veyra.js','./duel/gorvan.js','./duel/bounty-hunter.js','./duel/banter.js','./duel/authored-pack.js','./duel/tavern-director.js','./duel/authored-controller.js','./duel/characters.js','./duel/expression-preload.js','./game-engine/cards.js','./game-engine/engine.js','./game-engine/match.js','./game-ai/bot.js','./game-ai/veteran.js','./platform/audio.js','./platform/storage.js','./platform/transport.js','./ui/card.js','./ui/hand-layout.js','./ui/runes.js'];
const CORE = ['./','./index.html',`./styles.css?v=${ASSET_VERSION}`,`./app.js?v=${ASSET_VERSION}`,'./assets/tavern-environment-v37.jpg','./assets/table-wood-v37.jpg','./assets/duel-opponents.webp','./manifest.webmanifest',...CODE,...PROP_ASSETS,...CARD_ASSETS,...BRAND_ASSETS,...CHARACTER_ASSETS,...['ui-plank','ui-parchment','ui-brass-plate'].map(name => `./assets/${name}.webp`),...['mug-ring','scratches','ale-stain'].map(name => `./assets/table/mark-${name}.webp`)];

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

// Code and documents: network first, cache as fallback (so a publish is picked
// up on the next load). Everything else: cache first, then network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  const needsFreshCode = ['document', 'script', 'style'].includes(event.request.destination);
  if (needsFreshCode) {
    event.respondWith(
      remember(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(hit => hit || remember(event.request).catch(() => Response.error()))
  );
});
