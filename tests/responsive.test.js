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
  assert.ok(css.length<80000,'stylesheet stays a single readable system');
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
