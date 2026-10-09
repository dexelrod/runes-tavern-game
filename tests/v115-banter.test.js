import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TAVERN_BANTER, TAVERN_TOPIC_ODDS, createTavernDirector } from '../dist/duel/tavern-director.js';
import { BANTER_RECORDINGS } from '../dist/duel/banter.js';
import { AUTHORED_CHARACTERS } from '../dist/duel/characters.js';
import { mulberry32 } from '../dist/game-engine/cards.js';

// v115: "A Big, Strong Man" (Veyra, Ragna, Bramm) and Edrin's three drink exchanges.
const DRINK=['edrin_ragna_drink','edrin_bramm_drink','edrin_hunter_drink'];
const byId=id=>TAVERN_BANTER.find(b=>b.id===id);

test('v115 exchanges: every line is a shipped English recording with authored Hebrew text and a real face', ()=>{
  for(const id of ['veyra_ragna_bramm_strong_man',...DRINK]){
    const b=byId(id);assert.ok(b,id);assert.equal(b.audio,'en');
    for(const [guest,voice,,opts] of b.lines){
      const r=BANTER_RECORDINGS[voice];assert.ok(r,voice);assert.equal(r.speaker,guest);assert.deepEqual([...r.takes],['en']);assert.ok(r.captions.he);
      assert.ok(fs.statSync(new URL(`../dist/assets/${guest}/voice/${voice}.mp3`,import.meta.url)).size>1024,voice);
      assert.ok(AUTHORED_CHARACTERS[guest].expressions.includes(r.expression),`${voice}: ${r.expression}`);
      for(const [who,face] of opts?.react||[])assert.ok(AUTHORED_CHARACTERS[who].expressions.includes(face),`${voice} react ${who}: ${face}`);
    }
    const letters=b.lines.map(([,voice])=>voice.at(-1));assert.deepEqual(letters,[...letters].toSorted(),id);
  }
  // The new paintings are used where the script calls for them.
  assert.equal(BANTER_RECORDINGS.ragna_banter_edrin_drink_01b.expression,'sit_down');
  assert.equal(BANTER_RECORDINGS.bramm_banter_edrin_drink_01b.expression,'37_not_finished');
  assert.equal(BANTER_RECORDINGS.bounty_hunter_banter_edrin_drink_01b.expression,'sit_down');
  for(const id of DRINK)assert.ok(byId(id).lines.some(([,,,opts])=>opts?.react?.some(([who,face])=>who==='edrin'&&face==='scolded')),id);
});

test('the drink joke: one variation a match at most, never in the first hand, open on some evenings only', ()=>{
  assert.ok(TAVERN_TOPIC_ODDS.drink>0&&TAVERN_TOPIC_ODDS.drink<1);
  for(const id of DRINK){const b=byId(id);assert.equal(b.topic,'drink');assert.ok(b.chance<=.4);assert.ok(b.hush>0);}
  const seats={p1:'edrin',p2:'ragna',p3:'bramm'};
  let opened=0,heard=0;
  for(let seed=1;seed<400;seed++){
    const random=mulberry32(seed);let clock=1e6;
    const d=createTavernDirector({seats,random,now:()=>clock,locale:()=>'en'});
    if(d.topics().open.drink)opened++;
    let drinks=0;
    for(let i=0;i<120;i++){clock+=30000;const round=1+Math.floor(i/24);if(i%24===0)d.beginRound();const plan=d.event('idle',{current:'p0',round,minCards:5});
      if(DRINK.includes(plan.banter)){drinks++;assert.ok(round>=2,'not in the first hand');assert.ok(plan.hush>0);}}
    assert.ok(drinks<=1,'one drink exchange a match');heard+=drinks;
  }
  assert.ok(opened>0&&opened<399);assert.ok(heard>0);
});

test('listener reactions travel with the lines (seat, face, delay)', ()=>{
  const d=createTavernDirector({seats:{p1:'veyra',p2:'ragna',p3:'bramm'},random:()=>0,now:()=>1e6,locale:()=>'en'});
  const plan=d.forceBanter('veyra_ragna_bramm_strong_man');assert.equal(plan.lines.length,7);
  const insult=plan.lines[3];assert.deepEqual(insult.react.map(r=>[r.seat,r.expression]),[['p3','02_intro_boast'],['p3','29_defeated_disbelief']]);
  assert.ok(insult.react[1].delay>insult.react[0].delay);
  // The awkward silence after the laughter is longer than any other gap.
  assert.equal(Math.max(...plan.lines.slice(1).map(l=>l.pause)),plan.lines[5].pause);
  const hunter=createTavernDirector({seats:{p1:'edrin',p2:'bounty_hunter'},random:()=>0,now:()=>1e6,locale:()=>'en'}).forceBanter('edrin_hunter_drink');
  assert.ok(hunter.hush>=2000,'nobody says anything after "Thank you."');
});
