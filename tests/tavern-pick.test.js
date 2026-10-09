import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TAVERN_BANTER, recommendTavernCompany, tavernExchangesAmong } from '../dist/duel/tavern-director.js';
import { TAVERN_GUEST_PAIRS, VOICED_GUEST_KEYS, createTavernMatch, restoreSession, serializeSession } from '../dist/game-engine/match.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { defaults } from '../dist/platform/storage.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../dist/app.js'),css=read('../dist/styles.css');
const cast=b=>[...new Set([...b.lines.map(([guest])=>guest),...[].concat(b.needs||[])])];
const combos=(items,k)=>k===0?[[]]:items.flatMap((item,i)=>combos(items.slice(i+1),k-1).map(rest=>[item,...rest]));

// ── v114: choosing the Tavern company ─────────────────────────────────────────
test('choosing the Tavern opponents is a setting, off by default', ()=>{
  assert.equal(defaults.tavernPickGuests,false);
  assert.deepEqual(defaults.tavernPicks,[]);
  assert.match(app,/data-toggle="tavernPickGuests"/);
  assert.match(app,/pickGuests:'Choose your Tavern opponents'/);
  assert.match(app,/pickGuests:'בחירת יריבים למשחק הפונדק'/);
  // It only applies while voiced characters may sit at the Tavern.
  assert.match(app,/const tavernPickOn=\(\)=>!!settings\.tavernPickGuests&&settings\.tavernGuestMode!=='off'/);
});

test('off: Tavern Match starts straight away with the usual roll; on: the picker comes first', ()=>{
  const handler=app.slice(app.indexOf("root.querySelector('[data-tavern]')"),app.indexOf('bindTavernPick();'));
  assert.match(handler,/if\(tavernPickOn\(\)\)\{.*openTavernPick\(\);return;\}/);
  assert.match(handler,/clearMatch\(\);startSession\('tavern'\);/);
  // The picker seats exactly the chosen three; "let the evening decide" keeps the roll.
  assert.match(app,/begin\(\[\.\.\.tavernPicks\],event\.currentTarget\)/);
  assert.match(app,/data-pick-random[\s\S]*begin\(null,event\.currentTarget\)/);
  assert.match(app,/view==='tavernSelect'\?tavernSelectHTML\(\)/);
});

test('three chosen guests are exactly who sits down, and a reload keeps them', ()=>{
  for(const trio of combos(VOICED_GUEST_KEYS,3)){
    for(const guestMode of ['sometimes','often','off']){
      const match=createTavernMatch({seed:4242,guests:trio,guestMode});
      const seated=match.roster.filter(p=>p.id!=='p0').map(p=>p.nameKey).sort();
      assert.deepEqual(seated,[...trio].sort());
      assert.deepEqual(restoreSession(serializeSession(match)).roster.map(p=>p.nameKey),match.roster.map(p=>p.nameKey));
    }
  }
});

test('the conversation count is read from the real banter table', ()=>{
  for(const pair of Object.keys(TAVERN_GUEST_PAIRS)){
    const [a,b]=pair.split('+');
    assert.equal(tavernExchangesAmong([a,b]).length,TAVERN_BANTER.filter(item=>cast(item).every(g=>g===a||g===b)).length,pair);
  }
  assert.equal(tavernExchangesAmong(['bounty_hunter','gorvan']).length,3);
  assert.equal(tavernExchangesAmong(['edrin','ragna']).length,7);
  assert.ok(tavernExchangesAmong(['bounty_hunter','edrin','gorvan']).some(b=>b.id==='hunter_vampire_trio'));
  // "needs": the vampire gossip needs Gorvan at the table even though he does not speak in it.
  for(const b of TAVERN_BANTER.filter(item=>item.needs))assert.ok(!tavernExchangesAmong(b.lines.map(([guest])=>guest)).includes(b));
});

test('one or two picks light the guests with the most to say to them', ()=>{
  for(const size of [1,2])for(const picked of combos(VOICED_GUEST_KEYS,size)){
    const advice=recommendTavernCompany(picked,VOICED_GUEST_KEYS);
    assert.equal(advice.suggested.length,3-size,picked.join('+'));
    assert.ok(advice.suggested.every(id=>VOICED_GUEST_KEYS.includes(id)&&!picked.includes(id)));
    // Nothing else would give the chosen ones more conversations.
    const score=rest=>tavernExchangesAmong([...picked,...rest]).filter(b=>cast(b).some(g=>picked.includes(g))).length;
    const best=Math.max(...combos(VOICED_GUEST_KEYS.filter(id=>!picked.includes(id)),3-size).map(score));
    assert.equal(score(advice.suggested),best,picked.join('+'));
    // The badge on each seat counts conversations with the ones already chosen.
    for(const id of VOICED_GUEST_KEYS.filter(id=>!picked.includes(id)))
      assert.equal(advice.talk[id],tavernExchangesAmong([...picked,id]).filter(b=>cast(b).includes(id)&&cast(b).some(g=>picked.includes(g))).length);
    // Deterministic: the advice never flickers between renders.
    assert.deepEqual(recommendTavernCompany(picked,VOICED_GUEST_KEYS),advice);
  }
  // Alone, the Bounty Hunter has the most to say to Gorvan.
  const hunter=recommendTavernCompany(['bounty_hunter'],VOICED_GUEST_KEYS);
  assert.equal(hunter.talk.gorvan,3);assert.ok(hunter.suggested.includes('gorvan'));
  assert.deepEqual(recommendTavernCompany([],VOICED_GUEST_KEYS).suggested,[]);
  assert.deepEqual(recommendTavernCompany(['bramm','edrin','ragna'],VOICED_GUEST_KEYS).suggested,[]);
});

test('the picker matches the Tavern look: portraits, wax seals, candle-lit advice', ()=>{
  for(const rule of ['.pick-tile.is-picked','.pick-seal','.pick-tile.is-lit .pick-portrait','.pick-grid.has-advice','.pick-talk','.pick-guests-row.is-disabled'])assert.ok(css.includes(rule),rule);
  assert.match(css,/\.reduced-motion \.pick-tile\.is-lit \.pick-portrait\{animation:none\}/);
});

// ── v114: Gorvan is the Vampire Lord ──────────────────────────────────────────
test('Gorvan is presented as a Vampire Lord in both languages', ()=>{
  assert.equal(localizeDuelOpponent(getDuelOpponent('gorvan'),'en').descriptor.split(' · ')[0],'Vampire Lord');
  assert.equal(getDuelOpponent('gorvan').descriptor.split(' · ')[0],'לורד ערפדים');
  assert.match(app,/gorvan:'Gorvan, the Vampire Lord, waits\. “Shall we\?”'/);
  assert.match(app,/gorvan:'גורבן, לורד הערפדים, מחכה\. ״שנתחיל\?״'/);
  assert.match(app,/gorvan:'The house insists on “Lord”'/);
});

// ── v114: long names step down instead of being cut ───────────────────────────
test('The Bounty Hunter → Bounty Hunter → Hunter where the full name does not fit', ()=>{
  assert.match(app,/en:Object\.freeze\(\['The\\u00a0Bounty Hunter','Bounty Hunter','Hunter'\]\)/);
  assert.match(app,/he:Object\.freeze\(\['צייד הראשים','הצייד'\]\)/);
  assert.match(app,/<span class="seat-name"><b\$\{nameFitAttr\(playerKey\(player\)\)\}>/);
  assert.match(app,/<small\$\{nameFitAttr\(playerKey\(p\)\)\}>\$\{displayName\(p\)\}<\/small>/);
  assert.match(app,/bind\(\);fitNames\(\);/);
  assert.ok(!css.includes('long-name'),'the cramped two-line plate is gone');
});
