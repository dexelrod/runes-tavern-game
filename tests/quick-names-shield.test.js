import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { QUICK_NAME_POOL, TAVERN_REGULARS, VOICED_TAVERN_GUESTS, createQuickSession, quickRosterFor, restoreSession, serializeSession } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('v105 Quick Play: strangers come from the whole name pool, voiced cast included, at random',()=>{
  const keys=QUICK_NAME_POOL.map(p=>p.nameKey);
  assert.equal(new Set(keys).size,keys.length,'no name twice in the pool');
  for(const p of [...TAVERN_REGULARS,...VOICED_TAVERN_GUESTS])assert.equal(keys.includes(p.nameKey),p.nameKey!=='bounty_hunter',`${p.nameKey} is in the pool (the Bounty Hunter never sits at Quick Play: no name to lend, no generic lines)`);
  for(const k of ['adren','myra','toren','leva','sig','alva','hal','runa','derik','lucien','inigo','lydia','viren','soren','waylin'])assert.ok(keys.includes(k),k);
  const seen=new Set(),firstSeats=new Set();
  for(let seed=1;seed<=400;seed++){
    const q=createQuickSession({playerCount:6,seed:seed*7919});const ai=q.game.players.slice(1);
    assert.equal(new Set(ai.map(p=>p.nameKey)).size,ai.length,'no one sits twice');
    for(const p of ai){seen.add(p.nameKey);assert.ok(p.name&&p.gender);}
    firstSeats.add(ai[0].nameKey);
  }
  assert.equal(seen.size,QUICK_NAME_POOL.length,'every name turns up');
  assert.ok(firstSeats.size>=20,'the first seat is not always the same stranger');
  assert.deepEqual(quickRosterFor(42,4),quickRosterFor(42,4),'seeded: a table is reproducible');
});

test('v105 Quick Play stays unvoiced: a voiced name is only a name there',()=>{
  const q=createQuickSession({playerCount:6,seed:3});
  for(const p of q.game.players.slice(1)){assert.equal(p.archetype,undefined);assert.equal(p.house,undefined);assert.equal(p.voiced,undefined);assert.equal(p.kind,'ai');}
  const back=restoreSession(serializeSession(q));assert.deepEqual(back.game.players.map(p=>p.nameKey).slice(1),q.game.players.map(p=>p.nameKey).slice(1));
  const app=read('../dist/app.js');
  assert.match(app,/const guests=session\.mode==='tavern'\?state\.players\.filter\(isVoicedGuest\):\[\];/,'guest voices only at a Tavern Match');
  assert.match(app,/if\(session\.mode==='tavern'&&isVoicedGuest\(player\)\)/,'guest portraits only at a Tavern Match');
  for(const k of ['lucien','inigo','lydia','viren','soren','waylin'])assert.match(app,new RegExp(`${k}:'`),`${k} has an English name`);
});

test('v105 Shield: being skipped shows a "Blocked" seal over your hand that survives re-renders',()=>{
  const app=read('../dist/app.js'),css=read('../dist/styles.css');
  assert.match(app,/if\(stop&&stop\.skipped==='p0'\)startShieldBlock\(played\?\.playerId\)/);
  assert.match(app,/--sb-t:\$\{-Math\.round\(performance\.now\(\)-shieldBlock\.at\)\}ms/,'resumed from its start time, not restarted');
  assert.match(app,/'Blocked':'נחסמתם'/);
  assert.match(css,/\.shield-block\{/);assert.match(css,/@keyframes shield-block-slam/);
  assert.match(css,/\.reduced-motion \.shield-block-seal,[^{]*\{animation:none!important\}/,'reduced motion: static seal');
});
