import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { EDRIN_EXPRESSIONS, EDRIN_REACTIONS, EDRIN_STATES, EDRIN_VOICE_LIBRARY, createEdrinController, edrinEventFor, edrinExpressionURL, resolveEdrinReaction, resolveEdrinVoice } from '../dist/duel/edrin.js';
import { createBrammController } from '../dist/duel/bramm.js';
import { AUTHORED_CHARACTERS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { AudioSystem } from '../dist/platform/audio.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { VETERAN_PROFILE, chooseVeteranAction, observedGaps, stuckChance } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer, getLegalCards } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { createDuelSession } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const seeded=seed=>mulberry32(seed);

test('Edrin registers every authored line, expression and recorded voice file',()=>{
  assert.equal(EDRIN_REACTIONS.length,31);
  assert.equal(Object.keys(EDRIN_VOICE_LIBRARY).length,31);
  assert.equal(EDRIN_EXPRESSIONS.length,34);
  for(const reaction of EDRIN_REACTIONS){
    for(const key of ['id','trigger','voice','expression','priority','duration'])assert.ok(reaction[key],`${reaction.id} ${key}`);
    assert.ok(EDRIN_EXPRESSIONS.includes(reaction.expression),`${reaction.id} maps to a real expression`);
    assert.match(reaction.voice,/^edrin_[a-z_]+_0\d$/);
    for(const locale of ['en','he']){
      const voice=resolveEdrinVoice(reaction.voice,locale);
      if(reaction.voice==='edrin_idle_03'&&locale==='en'){assert.equal(voice,null,'the English idle_03 take was not delivered');continue;}
      assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024,`${reaction.voice} ${locale}`);
      if(locale==='he')assert.match(voice.src,/_he\.mp3$/);else assert.doesNotMatch(voice.src,/_he\.mp3$/);
    }
  }
  for(const expression of EDRIN_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(edrinExpressionURL(expression)));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
});

test('every Edrin expression is reachable in play, and expressions share one anchored canvas',()=>{
  const sources=read('../dist/duel/edrin.js').replace(/export const EDRIN_EXPRESSION_FILES=[\s\S]*?\}\);/,'')+read('../dist/duel/characters.js')+read('../dist/app.js');
  for(const expression of EDRIN_EXPRESSIONS)assert.ok(sources.includes(`'${expression}'`),`${expression} is never shown`);
  for(const expression of EDRIN_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(edrinExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');assert.ok(vp8x>0,'extended WebP with alpha');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[512,768],expression);}
});

test('deleted script lines are neither referenced nor recreated',()=>{
  const edrinSources=read('../dist/duel/edrin.js')+read('../dist/duel/characters.js'),app=read('../dist/app.js');
  for(const id of ['player_one_card_03','round_loss_02','match_win_01'])assert.ok(!edrinSources.includes(id)&&!app.includes(`edrin_${id}`),id);
  const files=fs.readdirSync(new URL('../dist/assets/edrin/voice/',import.meta.url));
  for(const stem of ['edrin_player_one_card_03','edrin_round_loss_02','edrin_match_win_01'])assert.ok(!files.some(name=>name.startsWith(stem)),stem);
});

test('bubbles use the authored transcript with acting directions removed, Hebrew untouched',()=>{
  const samples=[['match_win_02',"Oh. That's it, then.",'אה, סיימנו?'],['good_move_01','There we are.','הנה, הנה..'],['intro_03','"Runes", is it? Fine.','"רונות", אה? שיהיה.'],['match_loss_02','Ah. Lost, did I?','אה, זהו?'],['one_card_01','Huh. Only one left.','קלף אחרון.']];
  for(const [id,en,he] of samples){const base=EDRIN_REACTIONS.find(item=>item.id===id),english=resolveEdrinReaction(base,'en'),hebrew=resolveEdrinReaction(base,'he');assert.equal(english.caption,en);assert.equal(hebrew.caption,he);assert.equal(english.id,hebrew.id);assert.equal(hebrew.locale,'he');}
  for(const reaction of EDRIN_REACTIONS)for(const text of Object.values(reaction.captions))assert.doesNotMatch(text,/\[[^\]]*\]/);
});

test('one framework: Edrin plugs into the shared registry and the single Web Audio voice path',()=>{
  assert.deepEqual(Object.keys(AUTHORED_CHARACTERS).toSorted(),['bramm','edrin','kesh','ragna']);
  assert.match(resolveCharacterVoice('edrin_round_win_01','he').src,/edrin_round_win_01_he\.mp3$/);
  assert.match(resolveCharacterVoice('bramm_loss_01','en').src,/bramm_loss_01\.mp3$/);
  const app=read('../dist/app.js');
  assert.doesNotMatch(app,/new Audio\(|<audio/);
  assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1,'one voice call site for every character');
  assert.equal(localizeDuelOpponent(getDuelOpponent('edrin'),'en').name,'Edrin');assert.equal(getDuelOpponent('edrin').name,'אדרין');
  const duel=createDuelSession({seed:3,opponent:getDuelOpponent('edrin')});assert.equal(duel.game.players[1].archetype,'veteran');
});

test('Edrin preloads only the requested locale through Web Audio, and a missing file stays silent',async()=>{
  class Param{constructor(){this.value=1;}cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}}
  class Context{constructor(){this.destination={};this.currentTime=0;this.state='running';}createGain(){return{gain:new Param(),connect(){}};}createBufferSource(){return{playbackRate:{value:1},connect(){},start(){},stop(){}};}decodeAudioData(){return Promise.resolve({duration:1});}}
  const Native=globalThis.AudioContext,nativeFetch=globalThis.fetch,requested=[];
  globalThis.AudioContext=Context;
  try{
    globalThis.fetch=async url=>{requested.push(String(url));return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
    const system=new AudioSystem();await system.preloadVoice('he',Object.keys(AUTHORED_CHARACTERS.edrin.voiceLibrary));
    assert.equal(requested.length,31);assert.ok(requested.every(url=>/edrin_.*_he\.mp3$/.test(url)));
    requested.length=0;await system.preloadVoice('en',Object.keys(AUTHORED_CHARACTERS.edrin.voiceLibrary));
    assert.equal(requested.length,30,'the undelivered English idle_03 is never requested');
    globalThis.fetch=async()=>({ok:false,arrayBuffer:async()=>new ArrayBuffer(0)});
    const silent=new AudioSystem();silent.setSettings({sound:true,dialogue:true});
    assert.equal(await silent.playVoice('edrin_brutal_move_02',{locale:'he',priority:'MEDIUM'}),null);
  }finally{globalThis.AudioContext=Native;globalThis.fetch=nativeFetch;}
});

test('anti-repetition: never the same reaction twice in a row, last three avoided when possible',()=>{
  for(let seed=1;seed<=60;seed++){
    const random=seeded(seed),edrin=createEdrinController({random,now:()=>0});let last=null,recent=[];
    for(let i=0;i<40;i++){
      const trigger=['round_win','round_loss','brutal_move','player_good_move','edrin_good_move','match_loss','edrin_draw','player_one_card'][Math.floor(random()*8)];
      const reaction=edrin.react(trigger,{},true);if(!reaction)continue;
      assert.notEqual(reaction.voice,last);
      const pool=EDRIN_REACTIONS.filter(item=>item.trigger===trigger);
      if(pool.filter(item=>!recent.slice(0,3).includes(item.voice)).length)assert.ok(!recent.slice(0,3).includes(reaction.voice),`${reaction.voice} repeated within three`);
      last=reaction.voice;recent=[reaction.voice,...recent.filter(voice=>voice!==reaction.voice)];
    }
  }
  const edrin=createEdrinController({random:()=>0});
  assert.equal(edrin.react('player_draw',{},true).voice,'edrin_player_draw_01');
  assert.equal(edrin.react('player_draw',{},true),null,'a single-line pool waits rather than repeating');
});

test('anti-repetition tracks the base reaction, not the localized file',()=>{
  const edrin=createEdrinController({random:()=>0});
  const first=edrin.react('match_loss',{locale:'he'},true),second=edrin.react('match_loss',{locale:'en'},true);
  assert.notEqual(first.voice,second.voice);assert.doesNotMatch(first.voice,/_he$/);
  assert.equal(resolveEdrinReaction(first,'he').voice,first.voice);
});

test('casual voice waits for real gameplay: three actions and about eleven seconds of active play',()=>{
  let clock=0;const edrin=createEdrinController({random:()=>0,now:()=>clock});
  edrin.observe('edrin_move');edrin.observe('player_neutral_move');
  clock=60000;assert.equal(edrin.react('player_good_move'),null,'two actions are not enough');
  edrin.observe('player_good_move');assert.ok(edrin.react('player_good_move'),'third action, long silence');
  for(let i=0;i<5;i++)edrin.observe('edrin_move');clock+=6000;
  assert.equal(edrin.react('edrin_good_move'),null,'six seconds after a line is too soon');
  clock+=6000;assert.ok(edrin.react('edrin_good_move'));
  // A paused game does not bank silence: the controller only sees the app's active clock.
  assert.match(read('../dist/duel/characters.js'),/now:pack\.activeClock\?activeNow:undefined|createEdrinController\(\{now,/);
  assert.match(read('../dist/app.js'),/runActiveClock\(false\)/);
});

test('higher priority suppresses lower: no line stacks on top of one being spoken',()=>{
  let clock=100000;const edrin=createEdrinController({random:()=>0,now:()=>clock});
  for(let i=0;i<4;i++)edrin.observe('edrin_move');
  assert.equal(edrin.react('player_good_move',{busyRank:2}),null,'a medium line waits for a medium line');
  assert.ok(edrin.react('player_one_card',{busyRank:2}),'the player reaching one card may cut in');
});

test('Edrin speaks far less than Bramm across the same rounds of play',()=>{
  const events=['player_good_move','edrin_good_move','player_draw','edrin_draw','player_neutral_move','edrin_move','edrin_move','player_neutral_move'];
  const toBramm={edrin_good_move:'bramm_good_move',edrin_draw:'bramm_draw',edrin_move:'player_neutral_move'};
  let edrinLines=0,brammLines=0,rounds=0;
  for(let seed=1;seed<=60;seed++){
    let clock=0;const random=seeded(seed),edrin=createEdrinController({random,now:()=>clock}),bramm=createBrammController({random:seeded(seed+999),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;edrin.beginRound();bramm.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const trigger=events[Math.floor(random()*events.length)],other=toBramm[trigger]||trigger;
        edrin.observe(trigger);bramm.observe(other);if(edrin.react(trigger))edrinLines++;if(bramm.react(other))brammLines++;}}
  }
  assert.ok(edrinLines<brammLines*.6,`Edrin ${edrinLines} vs Bramm ${brammLines}`);
  assert.ok(edrinLines/rounds<=1.6,`0–2 casual lines in an ordinary round (${(edrinLines/rounds).toFixed(2)})`);
});

test('his face reacts far more often than he speaks',()=>{
  let clock=0,faces=0,lines=0;const random=seeded(9),edrin=createEdrinController({random,now:()=>clock});
  for(let i=0;i<300;i++){clock+=3000;const trigger=['player_good_move','edrin_draw','player_draw','edrin_good_move'][i%4];if(edrin.observe(trigger,{amount:i%3?1:2}))faces++;if(edrin.react(trigger,{amount:1}))lines++;if(i%30===29)edrin.beginRound();}
  assert.ok(faces>lines*2,`${faces} faces vs ${lines} lines`);
});

test('player reaching one card is attentive, never panic: one optional line, concern held',()=>{
  let spoke=0;
  for(let seed=1;seed<=400;seed++){
    let clock=50000;const edrin=createEdrinController({random:seeded(seed),now:()=>clock});
    const face=edrin.observe('player_one_card');assert.equal(face.expression,'player_one_card_notice');
    const line=edrin.react('player_one_card');if(line){spoke++;assert.match(line.voice,/^edrin_player_one_card_0[12]$/);}
    assert.equal(edrin.snapshot().state,'mildly_concerned');assert.equal(edrin.defaultExpression(),'player_one_card_mild_concern');
    assert.ok(!EDRIN_STATES.includes('panic'));
    clock+=1000;if(line)assert.equal(edrin.react('player_one_card'),null,'never both one-card lines back to back');
    edrin.oneCardRecovered();assert.equal(edrin.snapshot().state,'default');
  }
  assert.ok(spoke>400*.38&&spoke<400*.62,`spoke ${spoke}/400`);
});

test('Edrin reaching one card: mild surprise, at most one line',()=>{
  let clock=50000;const edrin=createEdrinController({random:()=>0,now:()=>clock});
  for(let i=0;i<4;i++)edrin.observe('edrin_move');
  assert.equal(edrin.observe('edrin_one_card').expression,'edrin_one_card_notice');
  const first=edrin.react('edrin_one_card');assert.match(first.voice,/^edrin_one_card_0[12]$/);
  clock+=1500;assert.equal(edrin.react('edrin_one_card'),null);
});

test('results: one line per hand, round pools while the match continues, match pools at the end',()=>{
  const pools={round_win:/^edrin_round_win_0[123]$/,round_loss:/^edrin_round_loss_0[13]$/,match_win:/^edrin_match_win_0[23]$/,match_loss:/^edrin_match_loss_0[123]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createEdrinController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.priority,'CRITICAL');}
  const edrin=createEdrinController({random:()=>0});edrin.react('round_win',{},true);
  assert.equal(edrin.holdsExpression(),true,'the result face holds under the result slip');edrin.beginRound();assert.equal(edrin.holdsExpression(),false);
  const app=read('../dist/app.js');
  assert.match(app,/else if\(isEdrinDuel\(\)\)runCharacter\(finalDuel\?\(opponentWon\?'match_win':'match_loss'\):\(opponentWon\?'round_win':'round_loss'\),\{\},true\);/);
  assert.equal((app.match(/runCharacter\(finalDuel\?/g)||[]).length,3,'one result dispatch each for Edrin, Ragna and Kesh');
});

test('first win of the match favours the delayed "Oh. I won."',()=>{
  let first=0;for(let seed=1;seed<=200;seed++)if(createEdrinController({random:seeded(seed)}).react('round_win',{},true).voice==='edrin_round_win_01')first++;
  assert.ok(first>200*.45,`${first}`);
});

test('idle lines are rare: long quiet, low probability, at most one in an ordinary round',()=>{
  let clock=0,spoken=0;
  for(let seed=1;seed<=200;seed++){
    clock=0;const edrin=createEdrinController({random:seeded(seed),now:()=>clock});edrin.beginRound();
    for(let i=0;i<5;i++)edrin.observe('edrin_move');
    clock=12000;assert.equal(edrin.react('idle_quiet',{}),null,'needs long genuine quiet');
    clock=40000;if(edrin.react('idle_quiet',{}))spoken++;
    for(let i=0;i<5;i++)edrin.observe('edrin_move');clock+=60000;
    assert.equal(edrin.snapshot().counters.idleThisRound<=1&&(edrin.snapshot().counters.idleThisRound===0||edrin.react('idle_quiet',{})===null),true,'one idle per ordinary round');
  }
  assert.ok(spoken<200*.4,`${spoken} of 200`);
  const busy=createEdrinController({random:()=>0,now:()=>99999});for(let i=0;i<5;i++)busy.observe('edrin_move');
  assert.equal(busy.react('idle_quiet',{playerOnOneCard:true}),null,'never while the player is on one card');
  const english=createEdrinController({random:()=>.99,now:()=>99999});for(let i=0;i<5;i++)english.observe('edrin_move');
  for(let i=0;i<20;i++){const r=english.react('idle_quiet',{locale:'en'},true);if(r)assert.notEqual(r.voice,'edrin_idle_03');}
});

test('later intros may be a line, a look, or nothing; first meeting is one line',()=>{
  const first=createEdrinController({random:()=>.99});first.observe('intro',{firstEncounter:true});assert.match(first.react('intro',{firstEncounter:true},true).voice,/^edrin_intro_0[123]$/);
  const kinds=new Set();
  for(let seed=1;seed<=100;seed++){const e=createEdrinController({random:seeded(seed)});const face=e.observe('intro',{});const line=e.react('intro',{},true);kinds.add(line?'voice':face?'expression':'none');assert.ok(!(line&&face));}
  assert.deepEqual([...kinds].toSorted(),['expression','none','voice']);
});

test('brutal reactions fire only on genuine swings; ordinary good moves do not qualify',()=>{
  const base={humanCount:5,edrinCount:5,oldHuman:5,oldEdrin:5};
  assert.equal(edrinEventFor({...base,penalty:{playerId:'p0',amount:4},humanCount:9,oldHuman:5})[0],'brutal_move');
  assert.equal(edrinEventFor({...base,penalty:{playerId:'p0',amount:2},humanCount:3,oldHuman:1})[0],'brutal_move','dragged off the last card');
  assert.equal(edrinEventFor({...base,played:{playerId:'p1'},closed:{},crossbowRun:5,edrinCount:1,oldEdrin:6})[0],'brutal_move');
  assert.equal(edrinEventFor({...base,penalty:{playerId:'p0',amount:2},humanCount:7})[0],'player_draw');
  assert.equal(edrinEventFor({...base,played:{playerId:'p1'},playedCard:{type:'plus2'},stack:{amount:2}})[0],'edrin_good_move');
  assert.equal(edrinEventFor({...base,played:{playerId:'p1'},playedCard:{type:'number'}})[0],'edrin_move');
  assert.equal(edrinEventFor({...base,played:{playerId:'p0'},humanCount:1,oldHuman:2})[0],'player_one_card');
  assert.equal(edrinEventFor({...base,played:{playerId:'p0'},playedCard:{type:'king'}})[0],'player_good_move');
  const probability=EDRIN_REACTIONS.filter(item=>item.trigger==='brutal_move').map(item=>item.probability);assert.deepEqual(probability,[.5,.5]);
});

test('generic bot dialogue is fully suppressed when Edrin (or Bramm) sits at the table',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/if\(!isAuthoredDuel\(\)&&!keshSpoke\)\{\n    if\(stop\)showQuip/);
  assert.match(app,/function setDuelReaction\(kind,text=null,force=false\)\{if\(session\?\.mode!=='duel'\|\|isAuthoredDuel\(\)\)return;/);
  assert.match(app,/takiRun>=3&&!isAuthoredDuel\(\)/);
  const edrin=getDuelOpponent('edrin');for(const pool of Object.values(edrin.dialoguePools))assert.equal(pool.length,0);
});

test('the veteran AI is fair: identical choices whatever the hidden cards are',()=>{
  let checked=0;
  for(let seed=1;seed<=20;seed++){
    let state=createInitialState({playerCount:2,seed:seed*977,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Edrin',kind:'ai',archetype:'veteran'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      const actor=currentPlayer(state);
      if(actor.id==='p1'){
        const decide=s=>chooseVeteranAction(s,{random:seeded(seed*31+step),profile:{...VETERAN_PROFILE,thinkBudgetMs:1e9}});
        const original=decide(state);
        // Swap the hidden information: the human's hand and the draw pile, same sizes.
        const swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();
        swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);
        assert.deepEqual(decide(swapped),original,`seed ${seed} step ${step}`);checked++;
      }
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>100);
  const source=read('../dist/game-ai/veteran.js');
  assert.doesNotMatch(source.replace(/\/\/.*$/gm,''),/\.drawPile\[|drawPile\.(at|pop|slice\(-)|\.hand\.(?!length|filter|find|some|map)\w+/,'reads only its own hand contents and pile sizes');
});

test('the veteran AI plays only legal moves, finishes every game, and reads public gaps',()=>{
  for(let seed=1;seed<=60;seed++){
    let state=createInitialState({playerCount:2,seed:seed*131,players:[{id:'p0',name:'A',kind:'ai',archetype:'mercenary'},{id:'p1',name:'Edrin',kind:'ai',archetype:'veteran'}]});
    for(let step=0;step<2000&&state.phase==='playing';step++)state=applyAction(state,chooseBotAction(state));
    assert.equal(state.phase,'finished',`seed ${seed}`);
  }
  const state=createInitialState({playerCount:2,seed:5,players:[{id:'p0',name:'A',kind:'human'},{id:'p1',name:'B',kind:'ai',archetype:'veteran'}]});
  state.log.push({type:'draw',playerId:'p0',amount:1});
  assert.ok(observedGaps(state,'p1').get('p0').has(state.discardPile[0].color),'drawing on a colour is public evidence of lacking it');
  const p=stuckChance(state,'p1');assert.ok(p>=0&&p<=1);
});

test('within a match, result lines cycle before repeating and a repeated remark grows rarer',()=>{
  for(let seed=1;seed<=30;seed++){const edrin=createEdrinController({random:seeded(seed)});const wins=[0,1,2].map(()=>{const r=edrin.react('round_win',{},true);edrin.react('brutal_move',{},true);edrin.react('player_good_move',{},true);edrin.react('edrin_draw',{},true);return r.voice;});assert.equal(new Set(wins).size,3,wins.join());}
  let first=0,repeat=0;
  for(let seed=1;seed<=600;seed++){let clock=0;const edrin=createEdrinController({random:seeded(seed),now:()=>clock});
    const tryLine=()=>{for(let i=0;i<4;i++)edrin.observe('player_draw');clock+=20000;return edrin.react('player_draw',{amount:2});};
    if(tryLine()){first++;edrin.react('brutal_move',{},true);edrin.react('round_win',{},true);edrin.react('match_loss',{},true);edrin.beginRound();if(tryLine())repeat++;}}
  assert.ok(repeat/first<.1,`repeat rate ${repeat}/${first}`);
});

test('no one-card line when the speaker or the player is about to go straight out',()=>{
  const ready=()=>{let clock=60000;const e=createEdrinController({random:()=>0,now:()=>clock});for(let i=0;i<5;i++)e.observe('edrin_move');return e;};
  assert.equal(ready().react('edrin_one_card',{ownTurn:true}),null);
  assert.equal(ready().react('player_one_card',{playerStillToPlay:true}),null);
  assert.ok(ready().react('player_one_card',{playerStillToPlay:false}));
});

test('a result line owns the stage: late gameplay lines cannot replace its face or bubble',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/if\(reaction\.priority!=='CRITICAL'&&\(characterSpeaking\?\.priority==='CRITICAL'\|\|session\?\.phase!=='round'\)\)return null;/);
  assert.match(app,/if\(visual&&!characterSpeaking\)setCharacterExpression/,'silent faces never cut across a spoken line');
});
