import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { GORVAN_EXPRESSIONS, GORVAN_REACTIONS, GORVAN_SCRIPT, GORVAN_STATES, GORVAN_VOICE_LIBRARY, createGorvanController, gorvanExpressionURL, resolveGorvanReaction, resolveGorvanVoice } from '../dist/duel/gorvan.js';
import { createKeshController } from '../dist/duel/kesh.js';
import { createVeyraController } from '../dist/duel/veyra.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { BANTER_RECORDINGS } from '../dist/duel/banter.js';
import { TAVERN_BANTER, TAVERN_GUEST_POOLS, createTavernDirector } from '../dist/duel/tavern-director.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { SOUND_LIBRARY } from '../dist/platform/audio.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { PATIENT_PROFILE, TAVERN_PATIENT_PROFILE, VETERAN_PROFILE, CONTROL_PROFILE, chooseVeteranAction } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { VOICED_TAVERN_GUESTS, createDuelSession } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const seeded=seed=>mulberry32(seed);
const line=id=>GORVAN_REACTIONS.find(item=>item.id===id);

test('Gorvan registers all 59 authored lines, 24 poses and his English recordings — no Hebrew audio, no Reverse lines',()=>{
  assert.equal(GORVAN_REACTIONS.length,59);assert.equal(Object.keys(GORVAN_VOICE_LIBRARY).length,59);assert.equal(GORVAN_EXPRESSIONS.length,24);
  const files=fs.readdirSync(new URL('../dist/assets/gorvan/voice/',import.meta.url));
  assert.equal(files.length,59);assert.ok(files.every(name=>name.endsWith('.mp3')&&!name.endsWith('_he.mp3')),'English recordings only — nothing invented');
  for(const reaction of GORVAN_REACTIONS){
    assert.ok(GORVAN_EXPRESSIONS.includes(reaction.expression),reaction.id);
    for(const locale of ['en','he']){const voice=resolveGorvanVoice(reaction.voice,locale);assert.ok(voice,`${reaction.voice} ${locale}`);assert.doesNotMatch(voice.src,/_he\.mp3$/,'Hebrew plays the English recording');assert.equal(voice.audioLocale,'en');assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024);}
  }
  for(const deleted of ['reverse_01','reverse_02'])assert.ok(!GORVAN_SCRIPT[deleted]&&!files.includes(`gorvan_${deleted}.mp3`));
  for(const expression of GORVAN_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(gorvanExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,640],expression);}
});

test('the owner-edited canonical lines are the ones in the game; Hebrew bubbles are the authored subtitles',()=>{
  assert.equal(GORVAN_SCRIPT.idle_03.en,'Hm. I wonder.');assert.equal(GORVAN_SCRIPT.idle_05.en,'Nevermind, nevermind...');
  assert.equal(GORVAN_SCRIPT.player_good_move_02.en,'Impressive. Most impressive.');assert.equal(GORVAN_SCRIPT.match_win_01.en,'That was pleasant.');
  const he=resolveGorvanReaction(line('curse_received_01'),'he');assert.equal(he.caption,'חצוף.');assert.equal(he.locale,'he');assert.equal(he.voice,'gorvan_curse_received_01','in Hebrew he still speaks, in English');
  assert.equal(resolveGorvanReaction(line('title_04'),'en').caption,'We are not doing this again.');
  for(const text of Object.values(GORVAN_SCRIPT).flatMap(item=>[item.en,item.he]))assert.doesNotMatch(text,/\[|\]|`/);
});

test('one framework: Gorvan is a full Duel opponent and a Tavern guest on the shared system',()=>{
  assert.ok(VOICED_OPPONENTS.includes('gorvan'));assert.equal(AUTHORED_CHARACTERS.gorvan.generic,true);
  assert.match(read('../dist/duel/gorvan.js'),/createAuthoredController\(GORVAN_SPEC/);
  assert.equal(localizeDuelOpponent(getDuelOpponent('gorvan'),'en').name,'Gorvan');assert.equal(getDuelOpponent('gorvan').name,'גורבן');
  for(const pool of Object.values(getDuelOpponent('gorvan').dialoguePools))assert.equal(pool.length,0);
  assert.equal(createDuelSession({seed:3,opponent:getDuelOpponent('gorvan')}).game.players[1].archetype,'noble');
  assert.equal(VOICED_TAVERN_GUESTS.find(p=>p.nameKey==='gorvan').archetype,'tavern-noble');
  assert.match(resolveCharacterVoice('gorvan_idle_03','he').src,/gorvan_idle_03\.mp3$/);
});

test('the quietest voice: fewer lines than Kesh, a narrow face that still notices things',()=>{
  const events=['player_good_move','own_good_move','player_draw','own_draw','stop_taken','curse_taken','player_neutral_move','own_move','own_move','player_neutral_move'];
  const toKesh={own_good_move:'kesh_good_move',own_draw:'kesh_draw',own_move:'kesh_move',stop_taken:'skip',curse_taken:'kesh_draw'};
  let g=0,k=0,v=0,gf=0,rounds=0;
  for(let seed=1;seed<=80;seed++){let clock=0;const gorvan=createGorvanController({random:seeded(seed),now:()=>clock}),kesh=createKeshController({random:seeded(seed+500),now:()=>clock}),veyra=createVeyraController({random:seeded(seed+900),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;gorvan.beginRound();kesh.beginRound();veyra.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0,ctx={big,forced:i%3===0,haul:big,amount:big?4:2};
        if(gorvan.observe(t,ctx))gf++;kesh.observe(toKesh[t]||t,ctx);veyra.observe(t,ctx);
        if(gorvan.react(t,ctx))g++;if(kesh.react(toKesh[t]||t,ctx))k++;if(veyra.react(t,ctx))v++;}}}
  assert.ok(g<k,`Gorvan ${g} < Kesh ${k}`);assert.ok(g<v,`Gorvan ${g} < Veyra ${v}`);
  assert.ok(g/rounds>=.2&&g/rounds<=1,`${(g/rounds).toFixed(2)} ordinary lines a round`);
  assert.ok(gf>g*3,`${gf} small looks vs ${g} lines`);
  assert.ok(!GORVAN_STATES.includes('panic')&&!GORVAN_STATES.includes('excited'));
});

test('two-beat performances: the pulse remark retracts itself; the old rules come with "No. Before your time."',()=>{
  assert.deepEqual(line('idle_04').followUp,{id:'idle_05',delay:700});
  assert.deepEqual(line('flavor_02').followUp,{id:'flavor_03',delay:1100});
  for(const id of ['idle_05','flavor_03'])assert.equal(line(id).trigger,'follow_up','only ever as the second beat');
  // Follow-ups never come up on their own.
  for(let seed=1;seed<=100;seed++){let clock=1e6;const g=createGorvanController({random:seeded(seed),now:()=>clock});for(let i=0;i<20;i++)g.observe('own_move');clock+=60000;const r=g.react('idle_quiet',{},true);if(r)assert.ok(!['gorvan_idle_05','gorvan_flavor_03'].includes(r.voice));}
  // Rare flavour: at most two a match.
  let clock=0;const g=createGorvanController({random:()=>0,now:()=>clock});let flavours=0;
  for(let round=0;round<5;round++){g.beginRound();for(let i=0;i<40;i++)g.observe('own_move');clock+=60000;const r=g.react('idle_quiet',{});if(r?.category==='flavor')flavours++;}
  assert.ok(flavours<=2);
});

test('"Lord Gorvan": tired → patient → firmer → resigned, never an outburst',()=>{
  const titles=['title_01','title_02','title_03','title_04'].map(line);
  assert.deepEqual(titles.map(t=>t.expression),['title_tired','title_patient','title_firm','title_resigned']);
  for(let step=1;step<=4;step++){const r=createGorvanController({random:()=>0}).react('intro',{titleStep:step},true);assert.equal(r.voice,`gorvan_title_0${step}`);}
  // A first meeting is always the introduction itself.
  for(let seed=1;seed<=60;seed++){const r=createGorvanController({random:seeded(seed)}).react('intro',{firstEncounter:true},true);assert.equal(r.voice,'gorvan_intro_01');}
  const app=read('../dist/app.js');assert.match(app,/titleStep=pack\.id==='gorvan'&&!firstEncounter&&\(settings\.gorvanTitleStep\|\|0\)<4/);
  assert.ok(!Object.values(TAVERN_GUEST_POOLS.gorvan).flat().some(v=>v.includes('title')),'at the Tavern, the title lines answer the people who use the title');
});

test('results: one line per hand; match never stacks with round',()=>{
  const pools={round_win:/^gorvan_round_win_0[1-3]$/,round_loss:/^gorvan_round_loss_0[1-3]$/,match_win:/^gorvan_match_win_0[1-4]$/,match_loss:/^gorvan_match_loss_0[1-4]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createGorvanController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.nextState,'result');}
  // Calm in defeat; no gloating faces in victory.
  for(const item of GORVAN_REACTIONS.filter(r=>r.category==='result'))assert.ok(!['rude','title_firm'].includes(item.expression));
});

test('his sound accents: SFX channel, his own plays only, never stacked, the pulse a Duel-only cue',()=>{
  const app=read('../dist/app.js');
  // His Curse sound belongs to his own Curse — not one played on him, not every Curse at the table.
  assert.match(app,/if\(mine&&stack&&playedCard\?\.type===TYPES\.PLUS2\)\{if\(now-gorvanSfx\.curseAt>3500\)/);
  // One accent a hand at most, only for a weighty King or Shield; never on top of the Curse sound.
  assert.match(app,/gorvanSfx\.accentHand!==session\.results\.length&&\(\(playedCard\?\.type===TYPES\.KING&&\(tablePenaltyBefore\|\|nearest<=2\)\)/);
  assert.match(app,/if\(session\.mode!=='duel'\|\|state\.phase!=='playing'\)return;/,'no pulse at a crowded Tavern table');
  // The entrance cue: once as he sits down, not on a restore, not again on a quick rematch.
  assert.match(app,/const sting=pack\.id==='gorvan'&&performance\.now\(\)-gorvanSfx\.entranceAt>480000/);
  for(const name of ['gorvanEntrance','gorvanPulse','gorvanAccent','gorvanCurse'])assert.equal(SOUND_LIBRARY[name].channel,'sfx');
  assert.doesNotMatch(read('../dist/styles.css'),/gorvan[^{]*\{[^}]*(glow|animation)/i,'no spell effects');
});

test('banter: every partner, with Gorvan answering in lines he already has — English audio only',()=>{
  const gorvanBanter=TAVERN_BANTER.filter(b=>b.lines.some(([guest])=>guest==='gorvan'));
  const partners=new Set(gorvanBanter.flatMap(b=>b.lines.map(([guest])=>guest)).filter(g=>g!=='gorvan'));
  assert.deepEqual([...partners].toSorted(),['bramm','edrin','kesh','ragna','veyra']);
  assert.equal(gorvanBanter.length,12);
  const replies={gorvan_bramm_lord:'gorvan_title_01',gorvan_bramm_noble:'gorvan_curse_received_01',gorvan_bramm_again:'gorvan_title_04',gorvan_edrin_voice:'gorvan_idle_03',gorvan_edrin_relax:'gorvan_idle_02',gorvan_ragna_lord:'gorvan_title_03',gorvan_ragna_sunrise:'gorvan_idle_01',gorvan_kesh_night:'gorvan_idle_03',gorvan_kesh_patient:'gorvan_idle_01',gorvan_veyra_signs:'gorvan_idle_05',gorvan_veyra_flame:'gorvan_idle_03',gorvan_veyra_shadow:'gorvan_idle_05'};
  for(const b of gorvanBanter){
    assert.equal(b.audio,'en');assert.equal(b.lines.length,2);
    const [[partner,trigger],[who,reply]]=b.lines;assert.equal(who,'gorvan');assert.equal(reply,replies[b.id],b.id);
    assert.ok(GORVAN_VOICE_LIBRARY[reply],'an existing Gorvan recording, no duplicate banter file');assert.ok(!fs.existsSync(new URL(`../dist/assets/gorvan/voice/gorvan_banter_${partner}.mp3`,import.meta.url)));
    assert.equal(BANTER_RECORDINGS[trigger].speaker,partner);assert.deepEqual([...BANTER_RECORDINGS[trigger].takes],['en']);assert.equal(resolveCharacterVoice(trigger,'he'),null,'no Hebrew take of the partner line');
    assert.ok(BANTER_RECORDINGS[trigger].captions.he,'authored Hebrew subtitle text');
  }
});

test('in Hebrew a Gorvan exchange is text only — never a one-sided voiced half — and only with bubbles on',()=>{
  const director=(locale,captions)=>{let clock=1e6;const d=createTavernDirector({seats:{p1:'bramm',p2:'gorvan'},random:()=>0,now:()=>clock,locale:()=>locale,captions:()=>captions});for(let i=0;i<5;i++)d.event('move',{actor:null});return d;};
  const en=director('en',false).event('idle',{current:'p0'});assert.ok(en.banter?.startsWith('gorvan_bramm'));assert.ok(en.lines.every(l=>!l.silent),'voiced in English');
  const he=director('he',true).event('idle',{current:'p0'});assert.ok(he.banter?.startsWith('gorvan_bramm'));assert.ok(he.lines.every(l=>l.silent),'both lines silent in Hebrew');
  assert.ok(he.lines.every(l=>l.reaction.captions.he),'with the authored Hebrew text');
  const off=director('he',false).event('idle',{current:'p0'});assert.ok(!off.banter?.startsWith('gorvan_'),'bubbles off: nothing to show, so the exchange does not run');
  // "We are not doing this again." needs an earlier "Lord Gorvan." (any evening).
  let clock=1e6;const fresh=createTavernDirector({seats:{p1:'bramm',p2:'gorvan'},random:()=>0,now:()=>clock});for(let i=0;i<5;i++)fresh.event('move',{actor:null});
  assert.notEqual(fresh.event('idle',{current:'p0'}).banter,'gorvan_bramm_again');
  const app=read('../dist/app.js');assert.match(app,/localized=line\.silent\?\{\.\.\.resolved,voice:null\}:resolved/);
});

test('his AI is patient, fair and beatable',t=>{
  const savedRandom=Math.random;Math.random=seeded(20261007);t.after(()=>{Math.random=savedRandom;});
  let checked=0;
  for(let seed=1;seed<=8;seed++){
    let state=createInitialState({playerCount:2,seed:seed*911,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Gorvan',kind:'ai',archetype:'noble'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      if(currentPlayer(state).id==='p1'){const decide=s=>chooseVeteranAction(s,{random:seeded(seed*19+step),profile:PATIENT_PROFILE});const original=decide(state),swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);assert.deepEqual(decide(swapped),original);checked++;}
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>40);
  let wins=0,games=0;
  for(let seed=1;seed<=120;seed++){const opponent=seed%2?'mercenary':'hunter',first=seed%4<2,players=[{id:'p0',name:'A',kind:'ai',archetype:first?'noble':opponent},{id:'p1',name:'B',kind:'ai',archetype:first?opponent:'noble'}];let s=createInitialState({playerCount:2,seed:seed*389,players});for(let i=0;i<2500&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));games++;if(s.winnerId===(first?'p0':'p1'))wins++;}
  assert.ok(wins/games>.38&&wins/games<.7,`Gorvan wins ${(100*wins/games).toFixed(1)}%`);
  assert.ok(PATIENT_PROFILE.holdWild>VETERAN_PROFILE.holdWild&&PATIENT_PROFILE.holdWild>CONTROL_PROFILE.holdWild,'the most reluctant to spend a Rune early');
  assert.ok(PATIENT_PROFILE.holdKing>VETERAN_PROFILE.holdKing&&PATIENT_PROFILE.curseMidgame<VETERAN_PROFILE.curseMidgame,'conservative with his special cards');
  assert.ok(PATIENT_PROFILE.curseDanger>VETERAN_PROFILE.curseDanger,'reacts when the opponent becomes dangerous');
  assert.ok(PATIENT_PROFILE.jitter<VETERAN_PROFILE.jitter&&PATIENT_PROFILE.mistakeRate<=.05,'steady, very few slips');
  assert.equal(TAVERN_PATIENT_PROFILE.samples,0);
  // No vampire mechanics: nothing in the rules knows who he is.
  for(const file of ['../dist/game-engine/engine.js','../dist/game-engine/cards.js','../dist/game-engine/match.js'])assert.doesNotMatch(read(file).replace(/nameKey:'gorvan'[^}]*\}/,'').replace(/gorvan:'red'/,'').replace(/גורבן:'gorvan'/,'').replace(/'[a-z]+\+gorvan'|'gorvan\+[a-z]+'/g,''),/gorvan/i);
});
