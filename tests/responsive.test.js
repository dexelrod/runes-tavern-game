// Structural guards for the rebuilt presentation layer. These assert the
// layout contract (single stylesheet, shared variables, safe touch handling)
// rather than pinning individual pixel values.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL(`../dist/${path}`,import.meta.url),'utf8');
const css=read('styles.css'),app=read('app.js'),html=read('index.html'),sw=read('sw.js');

test('one stylesheet, versioned identically in index.html and the service worker',()=>{
  const version=html.match(/styles\.css\?v=(\d+)/)?.[1];
  assert.ok(version,'styles.css must be versioned');
  assert.match(html,new RegExp(`app\\.js\\?v=${version}`));
  assert.match(sw,new RegExp(`ASSET_VERSION = '${version}'`));
  assert.match(sw,new RegExp(`CACHE = 'runes-v${version}'`));
  assert.doesNotMatch(html,/audio\.css/);
  assert.equal((sw.match(/addEventListener\('install'/g)||[]).length,1,'a single install handler');
});

test('every asset the service worker precaches exists',()=>{
  const context={self:{addEventListener(){},location:{origin:''}},caches:{},fetch(){}};vm.createContext(context);
  vm.runInContext(`${sw};globalThis.__CORE=CORE;`,context);
  assert.ok(context.__CORE.length>40);
  for(const path of context.__CORE){const clean=path.replace(/\?.*$/,'').replace(/^\.\//,'');if(!clean)continue;assert.ok(existsSync(new URL(`../dist/${clean}`,import.meta.url)),`missing ${clean}`);}
});

test('layout is driven by shared table variables, not per-screen magic offsets',()=>{
  for(const variable of ['--rim','--fig-h','--seat-h','--card-w','--pile-w','--hand-lift'])assert.match(css,new RegExp(`${variable}:`),variable);
  assert.match(css,/\.table-body\{[^}]*top:var\(--rim/);
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:500px\)/,'short landscape phones have their own layout');
  assert.match(css,/@media \(min-width:600px\) and \(orientation:portrait\)/,'tablet portrait has its own layout');
  assert.ok((css.match(/@media/g)||[]).length<=14,'breakpoints stay few and named');
  assert.ok(css.length<90000,'stylesheet stays a single readable system');
});

test('cards scale as one object and stay opaque when unplayable',()=>{
  assert.match(css,/\.card\{--cw:102px;[^}]*font-size:calc\(var\(--cw\) \/ 6\.375\)/);
  const quiet=css.match(/\.card\.quiet\{([^}]*)\}/)[1];
  assert.doesNotMatch(quiet,/opacity/,'unplayable cards must not ghost the card underneath');
});

test('hand gestures: native horizontal scrolling, deliberate upward play, stable selection',()=>{
  assert.match(css,/\.hand \.card\{[^}]*touch-action:pan-x/);
  assert.doesNotMatch(css,/\.selected\+\.card/,'selecting a card must not shift its neighbours');
  assert.match(app,/if\(dy>-12\|\|Math\.abs\(dx\)>Math\.abs\(dy\)\)return;/);
  assert.match(app,/hand-frame/);
});

test('figures sit behind the table rim and seats are one shared component',()=>{
  assert.match(app,/function seatHTML\(player,position\)/);
  assert.doesNotMatch(app,/function quickOpponentHTML|function duelOpponentHTML|function opponentHTML/);
  assert.match(css,/\.seat-figure\{[^}]*overflow:hidden/);
  assert.match(app,/-seated\.webp/);
});

test('results stay on the table with a quick continue control',()=>{
  assert.match(app,/class="result-slip/);
  assert.match(app,/data-next/);
  assert.match(app,/animateCoinsToWinner/);
  assert.doesNotMatch(app,/class="result-wrap/);
});

test('pause stops the table and is a short action menu',()=>{
  assert.match(app,/const isPaused=\(\)=>view==='game'&&\(Boolean\(sheet\)\|\|document\.hidden\)/);
  assert.match(app,/if\(isPaused\(\)\|\|!state\|\|session\.phase!=='round'\|\|state\.phase==='finished'\)return;/);
  const pause=app.slice(app.indexOf('function pauseHTML()'),app.indexOf('function rulesHTML()'));
  assert.match(pause,/data-close-sheet/);assert.match(pause,/data-pause-nav="rules"/);assert.match(pause,/data-pause-nav="settings"/);assert.match(pause,/data-home/);
  assert.doesNotMatch(pause,/data-toggle|data-volume/,'pause is not settings with another title');
});

test('entry animations only run when content is new, so re-renders never flicker',()=>{
  assert.doesNotMatch(css,/\.action-strip,\.table-caption\{[^}]*animation/);
  assert.match(css,/\.speech\.enter\{animation/);
  assert.match(css,/\.result-slip\.enter\{animation/);
});

test('install icons, favicons and the share image exist and are declared',()=>{
  const manifest=JSON.parse(read('manifest.webmanifest'));
  assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
  for(const icon of manifest.icons)assert.ok(existsSync(new URL(`../dist/${icon.src.replace('./','')}`,import.meta.url)),icon.src);
  for(const ref of [...html.matchAll(/href="\.\/(assets\/brand\/[^"]+)"/g)].map(m=>m[1]))assert.ok(existsSync(new URL(`../dist/${ref}`,import.meta.url)),ref);
  assert.match(html,/og:image" content="https:\/\/[^"]+\/assets\/brand\/share\.jpg"/);
  assert.ok(existsSync(new URL('../dist/assets/brand/share.jpg',import.meta.url)));
});

test('the result slip never scrolls as a whole: its continue control stays in view at any size',()=>{
  assert.match(app,/class="result-stage"/,'the slip lies over the table below the seats, not inside the board row');
  const slip=css.match(/\.result-slip\{grid-row:2;([^}]*)\}/)[1];
  assert.doesNotMatch(slip,/overflow/,'a scrolling slip hides Next round below the fold (and WebKit can skip painting the plank inside it)');
  assert.match(slip,/max-height:100%/);
  assert.match(css,/\.result-slip \.standings\{flex:0 1 auto\}/,'only the ledger may shrink');
  assert.match(css,/@media \(orientation:landscape\) and \(min-width:640px\)\{\n  \.round-slip,\.final-slip\{display:grid/,'landscape slips use two columns');
});

test('a drawn card travels from the deck into its own slot in the hand',()=>{
  assert.match(app,/function flyLandingCards\(\)/);
  assert.match(css,/\.hand \.card\.landing\{visibility:hidden\}/,'the slot is held open until the card arrives');
  assert.match(app,/prepareHumanDraw\(\):animateCardMovement\(action\)/,'your draw commits first so the destination slot exists');
  assert.doesNotMatch(app,/incomingCardDelays|hand-receive/,'the old fade-in-elsewhere path is gone');
  assert.match(app,/const motionReduced=\(\)=>settings\.reducedMotion\|\|matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
});

test('High Card Contrast is a persisted setting that recolours every card ink through one class',async()=>{
  const {defaults}=await import('../dist/platform/storage.js');
  assert.equal(defaults.highContrastCards,false);
  assert.match(app,/toggle\(c\.contrast,'highContrastCards'\)/);
  assert.match(app,/classList\.toggle\('hc-cards',!!settings\.highContrastCards\)/);
  assert.match(css,/\.hc-cards\{--red:#[0-9a-f]{6};--green:#[0-9a-f]{6};--yellow:#[0-9a-f]{6};--blue:#[0-9a-f]{6};--tint-k:/);
  assert.match(app,/const colorHex=\{red:'var\(--red\)'/,'table UI follows the active palette');
});

test('the direction ring is carved into the table, readable, and only shown when direction matters',()=>{
  assert.match(app,/if\(state\.players\.length<3\)return'';/);
  const groove=css.match(/\.ring-inlay\{([^}]*)\}/)[1];
  const opacity=Number(groove.match(/opacity:([.\d]+)/)[1]);
  assert.ok(opacity>=.6,'the brass inlay is visible at a glance');
  assert.match(app,/function animateDirectionRing\(\)/);
});
