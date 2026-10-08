import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { RAGNA_EXPRESSIONS, RAGNA_REACTIONS, RAGNA_SCRIPT, RAGNA_STATES, RAGNA_VOICE_LIBRARY, createRagnaController, ragnaEventFor, ragnaExpressionURL, resolveRagnaReaction, resolveRagnaVoice } from '../dist/duel/ragna.js';
import { createEdrinController } from '../dist/duel/edrin.js';
import { createBrammController } from '../dist/duel/bramm.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { DUEL_OPPONENTS, getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { AudioSystem } from '../dist/platform/audio.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { PRESSURE_PROFILE, VETERAN_PROFILE, chooseVeteranAction } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { createDuelSession, finishRound } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const seeded=seed=>mulberry32(seed);
const ready=(clock=()=>60000,random=()=>0)=>{const r=createRagnaController({random,now:clock});for(let i=0;i<4;i++)r.observe('ragna_move');return r;};

test('Ragna registers every authored line, all 40 expressions and every delivered voice file',()=>{
  assert.equal(RAGNA_REACTIONS.length,41);assert.equal(Object.keys(RAGNA_VOICE_LIBRARY).length,41);assert.equal(RAGNA_EXPRESSIONS.length,40);
  for(const reaction of RAGNA_REACTIONS){
    for(const key of ['id','trigger','voice','expression','priority','duration'])assert.ok(reaction[key],`${reaction.id} ${key}`);
    assert.ok(RAGNA_EXPRESSIONS.includes(reaction.expression),`${reaction.id} maps to a real expression`);
    for(const locale of ['en','he']){
      const voice=resolveRagnaVoice(reaction.voice,locale);
      if(reaction.voice==='ragna_player_one_card_03'&&locale==='he'){assert.equal(voice,null,'no Hebrew take was delivered');continue;}
      assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024,`${reaction.voice} ${locale}`);
      if(locale==='he')assert.match(voice.src,/_he\.mp3$/);else assert.doesNotMatch(voice.src,/_he\.mp3$/);
    }
  }
  for(const expression of RAGNA_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(ragnaExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');assert.equal(bytes.subarray(8,12).toString(),'WEBP');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,679],`${expression} shares the anchored canvas`);}
});

test('every Ragna expression is reachable in play',()=>{
  const sources=read('../dist/duel/ragna.js').replace(/export const RAGNA_EXPRESSION_FILES=[\s\S]*?\}\);/,'');
  for(const expression of RAGNA_EXPRESSIONS)assert.ok(sources.includes(`'${expression}'`),`${expression} is never shown`);
});

test('the deleted player-draw take is neither referenced nor shipped',()=>{
  const sources=read('../dist/duel/ragna.js').replace(/\/\/.*$/gm,'')+read('../dist/duel/characters.js')+read('../dist/app.js');
  assert.ok(!sources.includes('player_draw_01'));
  const files=fs.readdirSync(new URL('../dist/assets/ragna/voice/',import.meta.url));
  assert.ok(!files.some(name=>name.startsWith('ragna_player_draw_01')));
  // 81 takes of her own, plus her side of the Veyra (2) and Gorvan (2, English only) banter, and v106's eight (English only).
  assert.equal(files.filter(name=>!name.includes('_banter_')&&!name.includes('_chitchat_')).length,81);assert.equal(files.length,107);assert.ok(files.every(name=>name.endsWith('.mp3')));
});

test('bubbles show the exact authored transcript, acting directions removed, Hebrew untouched',()=>{
  const samples=[['idle_04',"QUIET! THERE'S A GAME ON!",'סתמו פיות! יש משחק פה!'],['idle_01','Concentrate.','פוקוס.'],['draw_01','Damn it.','יא אללה!'],['intro_03',"Sit straight. Focus. Let's play.",'יאללה, לשבת ישר, להתרכז, מתחילים.'],['round_loss_02','Again... Again.','עוד אחד.'],['self_mistake_01','Wrong card. My fault.','קלף לא נכון. טעות שלי.']];
  for(const [id,en,he] of samples){const base=RAGNA_REACTIONS.find(item=>item.id===id);assert.equal(resolveRagnaReaction(base,'en').caption,en);assert.equal(resolveRagnaReaction(base,'he').caption,he);assert.equal(resolveRagnaReaction(base,'he').id,id);}
  for(const line of Object.values(RAGNA_SCRIPT))for(const text of Object.values(line))assert.doesNotMatch(text,/\[|\]/);
  assert.equal(resolveRagnaReaction(RAGNA_REACTIONS.find(item=>item.id==='player_one_card_03'),'he').voice,null,'the undelivered Hebrew take stays silent but keeps its bubble');
});

test('one framework: Ragna plugs into the shared registry, the shared controller and the single voice path',()=>{
  assert.deepEqual(VOICED_OPPONENTS,['bramm','edrin','ragna','kesh','veyra','gorvan','bounty_hunter']);
  assert.match(resolveCharacterVoice('ragna_round_win_04','he').src,/ragna_round_win_04_he\.mp3$/);
  assert.match(read('../dist/duel/ragna.js'),/createAuthoredController\(RAGNA_SPEC/);
  assert.match(read('../dist/duel/edrin.js'),/createAuthoredController\(EDRIN_SPEC/);
  const app=read('../dist/app.js');assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1);assert.doesNotMatch(app,/new Audio\(|<audio/);
  assert.equal(localizeDuelOpponent(getDuelOpponent('ragna'),'en').name,'Ragna');assert.equal(getDuelOpponent('ragna').name,'ראגנה');assert.equal(getDuelOpponent('ragna').gender,'f');
  for(const pool of Object.values(getDuelOpponent('ragna').dialoguePools))assert.equal(pool.length,0,'no generic quips');
  const duel=createDuelSession({seed:3,opponent:getDuelOpponent('ragna')});assert.equal(duel.game.players[1].archetype,'warrior');
});

test('preload requests only the active locale, and a missing voice file stays silent',async()=>{
  class Param{constructor(){this.value=1;}cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}}
  class Context{constructor(){this.destination={};this.currentTime=0;this.state='running';}createGain(){return{gain:new Param(),connect(){}};}createBufferSource(){return{playbackRate:{value:1},connect(){},start(){},stop(){}};}decodeAudioData(){return Promise.resolve({duration:1});}}
  const Native=globalThis.AudioContext,nativeFetch=globalThis.fetch,requested=[];globalThis.AudioContext=Context;
  try{
    globalThis.fetch=async url=>{requested.push(String(url));return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
    const system=new AudioSystem();await system.preloadVoice('he',Object.keys(AUTHORED_CHARACTERS.ragna.voiceLibrary));
    assert.equal(requested.length,40);assert.ok(requested.every(url=>/ragna_.*_he\.mp3$/.test(url)));
    requested.length=0;await system.preloadVoice('en',Object.keys(AUTHORED_CHARACTERS.ragna.voiceLibrary));assert.equal(requested.length,41);
    globalThis.fetch=async()=>({ok:false,arrayBuffer:async()=>new ArrayBuffer(0)});
    const silent=new AudioSystem();silent.setSettings({sound:true,dialogue:true});
    assert.equal(await silent.playVoice('ragna_noise_01',{locale:'he',priority:'LOW'}),null);
  }finally{globalThis.AudioContext=Native;globalThis.fetch=nativeFetch;}
});

test('anti-repetition: never twice in a row, last three avoided, EN and HE are one reaction',()=>{
  for(let seed=1;seed<=60;seed++){
    const random=seeded(seed),ragna=createRagnaController({random,now:()=>0});let last=null,recent=[];
    for(let i=0;i<40;i++){
      const trigger=['round_win','round_loss','player_good_move','ragna_good_move','match_loss','match_win','player_one_card','ragna_one_card','ragna_draw'][Math.floor(random()*9)];
      const reaction=ragna.react(trigger,{locale:i%2?'he':'en'},true);if(!reaction)continue;
      assert.notEqual(reaction.voice,last);assert.doesNotMatch(reaction.voice,/_he$/);
      const pool=RAGNA_REACTIONS.filter(item=>item.trigger===trigger&&(!item.when||item.when({}))&&item.category!=='shout');
      if(pool.filter(item=>!recent.slice(0,3).includes(item.voice)).length>0&&reaction.category!=='shout')assert.ok(!recent.slice(0,3).includes(reaction.voice),`${reaction.voice} repeated within three`);
      last=reaction.voice;recent=[reaction.voice,...recent.filter(voice=>voice!==reaction.voice)];
    }
  }
});

test('casual lines wait for two meaningful actions and about eight seconds of active play',()=>{
  let clock=0;const ragna=createRagnaController({random:()=>0,now:()=>clock});
  ragna.observe('ragna_move');clock=60000;assert.equal(ragna.react('ragna_good_move'),null,'one action is not enough');
  ragna.observe('player_neutral_move');assert.ok(ragna.react('ragna_good_move'));
  ragna.observe('ragna_move');ragna.observe('ragna_move');clock+=5000;assert.equal(ragna.react('player_good_move'),null,'five seconds is too soon');
  clock+=4000;assert.ok(ragna.react('player_good_move'));
});

test('Ragna speaks more than Edrin and much less than Bramm over the same play',()=>{
  const events=['player_good_move','ragna_good_move','player_draw','ragna_draw','player_neutral_move','ragna_move','ragna_move','player_neutral_move'];
  const toEdrin={ragna_good_move:'edrin_good_move',ragna_draw:'edrin_draw',ragna_move:'edrin_move'},toBramm={ragna_good_move:'bramm_good_move',ragna_draw:'bramm_draw',ragna_move:'player_neutral_move'};
  let r=0,e=0,b=0,rounds=0;
  for(let seed=1;seed<=60;seed++){let clock=0;const ragna=createRagnaController({random:seeded(seed),now:()=>clock}),edrin=createEdrinController({random:seeded(seed+500),now:()=>clock}),bramm=createBrammController({random:seeded(seed+999),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;ragna.beginRound();edrin.beginRound();bramm.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0;
        ragna.observe(t);edrin.observe(toEdrin[t]||t);bramm.observe(toBramm[t]||t);
        if(ragna.react(t,{big,forced:i%3===0,longer:big}))r++;if(edrin.react(toEdrin[t]||t,{big}))e++;if(bramm.react(toBramm[t]||t))b++;}}}
  assert.ok(r>e,`Ragna ${r} > Edrin ${e}`);assert.ok(r<b*.8,`Ragna ${r} well below Bramm ${b}`);
  assert.ok(r/rounds>=.8&&r/rounds<=3,`roughly 1–3 casual lines per round (${(r/rounds).toFixed(2)})`);
});

test('her face reacts far more often than she speaks',()=>{
  let clock=0,faces=0,lines=0;const ragna=createRagnaController({random:seeded(4),now:()=>clock});
  for(let i=0;i<300;i++){clock+=3000;const trigger=['player_good_move','ragna_draw','player_draw','ragna_good_move'][i%4];const ctx={amount:i%3?1:2,forced:i%3===0};if(ragna.observe(trigger,ctx))faces++;if(ragna.react(trigger,ctx))lines++;if(i%30===29)ragna.beginRound();}
  assert.ok(faces>lines*2,`${faces} faces vs ${lines} lines`);
});

test('player on one card: excited and hyper-focused, never panic; one line, more only after cooldown',()=>{
  let spoke=0;
  for(let seed=1;seed<=400;seed++){
    let clock=50000;const ragna=createRagnaController({random:seeded(seed),now:()=>clock});
    assert.equal(ragna.observe('player_one_card').expression,'player_one_card_excited');
    const line=ragna.react('player_one_card');if(line){spoke++;assert.match(line.voice,/^ragna_player_one_card_0[1-4]$/);}
    assert.equal(ragna.snapshot().state,'hyperfocused');assert.equal(ragna.defaultExpression(),'player_one_card_focus');
    clock+=1000;if(line)assert.equal(ragna.react('player_one_card',{persist:true}),null,'never two one-card lines back to back');
  }
  assert.ok(!RAGNA_STATES.includes('panic'));
  assert.ok(spoke>400*.5&&spoke<400*.72,`spoke ${spoke}/400`);
  const ragna=ready();assert.equal(ragna.react('player_one_card',{playerStillToPlay:true}),null,'the player may go out right now: she only leans in');
});

test('Ragna on one card: one concentrated line at most, silent if she is about to finish',()=>{
  let clock=50000;const ragna=ready(()=>clock);
  assert.equal(ragna.observe('ragna_one_card').expression,'ragna_one_card');
  assert.equal(ready(()=>clock).react('ragna_one_card',{ownTurn:true}),null);
  const first=ragna.react('ragna_one_card');assert.match(first.voice,/^ragna_one_card_0[123]$/);clock+=1500;assert.equal(ragna.react('ragna_one_card'),null);
  assert.equal(ragna.observeTable({humanCount:5,ragnaCount:1}),'finishing');
});

test('results: one line per hand from the right pool; match never stacks with round',()=>{
  const pools={round_win:/^ragna_round_win_0[1-4]$/,round_loss:/^ragna_round_loss_0[1-3]$/,match_win:/^ragna_match_win_0[1-3]$/,match_loss:/^ragna_match_loss_0[1-3]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createRagnaController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.priority,'CRITICAL');}
  let easy=0,hard=0;for(let seed=1;seed<=300;seed++){if(createRagnaController({random:seeded(seed)}).react('round_win',{easy:true},true).voice==='ragna_round_win_04')easy++;if(createRagnaController({random:seeded(seed)}).react('round_win',{easy:false},true).voice==='ragna_round_win_04')hard++;}
  assert.ok(easy>300*.4&&hard<300*.1,`"That's it?" leans on easy wins (${easy} vs ${hard})`);
  const app=read('../dist/app.js');
  assert.match(app,/else if\(isRagnaDuel\(\)\)\{[\s\S]*?runCharacter\(finalDuel\?\(opponentWon\?'match_win':'match_loss'\):\(opponentWon\?'round_win':'round_loss'\)/);
});

test('intro: exactly one line per match; first meeting is a judgement or an order; "Better" only answers raised stakes',()=>{
  for(let seed=1;seed<=100;seed++){
    const first=createRagnaController({random:seeded(seed)});assert.equal(first.observe('intro',{firstEncounter:true}),null);const line=first.react('intro',{firstEncounter:true},true);
    assert.match(line.voice,/^ragna_intro_0[13]$/);
    const later=createRagnaController({random:seeded(seed)}).react('intro',{},true);assert.match(later.voice,/^ragna_intro_0[134]$/);
  }
  let better=0;for(let seed=1;seed<=100;seed++)if(createRagnaController({random:seeded(seed)}).react('intro',{raised:true},true).voice==='ragna_intro_02')better++;
  assert.ok(better>50,`${better}`);
});

test('tavern shouting is rare: at most one shout a match, and 04 → 05 is one two-beat gag',()=>{
  let shouts=0,gags=0;
  for(let seed=1;seed<=300;seed++){
    let clock=0;const ragna=createRagnaController({random:seeded(seed),now:()=>clock});
    for(let round=0;round<5;round++){ragna.beginRound();for(let i=0;i<2;i++){for(let k=0;k<6;k++)ragna.observe("ragna_move");clock+=24000;const r=ragna.react('tavern_outburst',{});if(r){shouts++;if(r.followUp){gags++;assert.equal(r.followUp.id,'idle_05');assert.equal(r.id,'idle_04');}}}
      ragna.observe('ragna_one_card');const one=ragna.react('ragna_one_card',{});if(one?.category==='shout')shouts++;}
    assert.ok(ragna.snapshot().counters.shouts<=1,`seed ${seed}`);
  }
  assert.ok(shouts/300<.6,`shouts per match ${(shouts/300).toFixed(2)}`);assert.ok(gags>0);
  const quiet=ready(()=>5000);assert.equal(quiet.react('tavern_outburst',{}),null,'needs a genuinely quiet stretch');
  assert.match(read('../dist/app.js'),/function scheduleFollowUp\(followUp,epoch\)/);
});

test('self-blame only after her own knowing slip that cost a draw; bad luck never earns "Stupid."',()=>{
  const base={humanCount:5,ragnaCount:5,oldHuman:5,oldRagna:4};
  assert.deepEqual(ragnaEventFor({...base,draw:{playerId:'p1'},ragnaCount:6,slipBefore:true}),['self_mistake',{drew:true}]);
  assert.equal(ragnaEventFor({...base,draw:{playerId:'p1'},ragnaCount:6,slipBefore:false})[0],'ragna_draw');
  assert.equal(ragnaEventFor({...base,penalty:{playerId:'p1',amount:2},slipBefore:true})[0],'ragna_draw','a Curse from the player is not her fault');
  for(let seed=1;seed<=200;seed++){const r=createRagnaController({random:seeded(seed)}).react('ragna_draw',{forced:true},true);assert.notEqual(r.voice,'ragna_draw_02');assert.notEqual(r.voice,'ragna_self_mistake_01');}
  const app=read('../dist/app.js');assert.match(app,/ragnaSlip=lastBotDecision\.slip/);
});

test('event classifier: only genuine swings and real hauls qualify',()=>{
  const base={humanCount:5,ragnaCount:5,oldHuman:5,oldRagna:5};
  assert.deepEqual(ragnaEventFor({...base,humanCount:1,oldHuman:2,played:{playerId:'p0'}}),['player_one_card',{}]);
  assert.equal(ragnaEventFor({...base,penalty:{playerId:'p0',amount:4},humanCount:9})[1].longer,true);
  assert.equal(ragnaEventFor({...base,penalty:{playerId:'p0',amount:2},humanCount:7})[1].longer,undefined);
  assert.equal(ragnaEventFor({...base,draw:{playerId:'p0'},humanCount:6})[0],'player_draw');
  assert.equal(ragnaEventFor({...base,played:{playerId:'p0'},playedCard:{type:'king'}})[0],'player_good_move');
  assert.equal(ragnaEventFor({...base,played:{playerId:'p0'},playedCard:{type:'number'}})[0],'player_neutral_move');
  assert.equal(ragnaEventFor({...base,played:{playerId:'p1'},playedCard:{type:'plus2'},stack:{amount:2}})[0],'ragna_good_move');
  assert.deepEqual(ragnaEventFor({...base,played:{playerId:'p1'},playedCard:{type:'number'},humanCount:1,oldHuman:1}),['player_one_card',{persist:true}]);
  // The player draw line needs a real haul.
  const ragna=ready();assert.equal(ragna.react('player_draw',{amount:1},true),null);assert.equal(ready().react('player_draw',{amount:4,longer:true},true).voice,'ragna_player_draw_02');
});

test('baseline: stern by default, energized when close, focused (not afraid) on the player\'s last card',()=>{
  const ragna=createRagnaController({random:()=>0});
  assert.equal(ragna.defaultExpression(),'default_focused');
  ragna.observeTable({humanCount:3,ragnaCount:2});assert.equal(ragna.defaultExpression(),'enjoying_challenge');
  ragna.observeTable({humanCount:1,ragnaCount:2});assert.equal(ragna.defaultExpression(),'player_one_card_focus');
  ragna.react('round_win',{},true);assert.equal(ragna.holdsExpression(),true);ragna.observeTable({humanCount:7,ragnaCount:7});assert.equal(ragna.snapshot().state,'result','the result face holds under the slip');
  ragna.beginRound();assert.equal(ragna.defaultExpression(),'default_focused');
  // Anger is a flash: the transient face expires on its own.
  let clock=0;const hot=createRagnaController({random:()=>0,now:()=>clock});hot.observe('ragna_draw',{forced:true});assert.equal(hot.snapshot().presentation,'angry');clock+=1500;assert.equal(hot.snapshot().presentation,'default');
});

test('generic bot dialogue is suppressed for Ragna like every authored character',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/if\(!isAuthoredDuel\(\)&&!keshSpoke\)\{\n    if\(stop\)showQuip/);
  assert.match(app,/function setDuelReaction\(kind,text=null,force=false\)\{if\(session\?\.mode!=='duel'\|\|isAuthoredDuel\(\)\)return;/);
});

test('her AI is fair: identical choices whatever the hidden cards are',()=>{
  let checked=0;
  for(let seed=1;seed<=16;seed++){
    let state=createInitialState({playerCount:2,seed:seed*733,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Ragna',kind:'ai',archetype:'warrior'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      if(currentPlayer(state).id==='p1'){
        const decide=s=>chooseVeteranAction(s,{random:seeded(seed*17+step),profile:{...PRESSURE_PROFILE,thinkBudgetMs:1e9}});
        const original=decide(state),swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();
        swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);
        assert.deepEqual(decide(swapped),original,`seed ${seed} step ${step}`);checked++;
      }
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>80);
});

test('her AI is aggressive and competent: beats the tavern bots, holds fewer power cards than Edrin',t=>{
  // Seeded so the measured win rate is the same on every run (CI included).
  // Freeze the planner's think-budget clock too, so every machine imagines the same number of hands.
  const savedNow=globalThis.performance.now;globalThis.performance.now=()=>0;t.after(()=>{globalThis.performance.now=savedNow;});
  const savedRandom=Math.random;Math.random=seeded(20261007);t.after(()=>{Math.random=savedRandom;});
  let wins=0,games=0;
  for(let seed=1;seed<=120;seed++){
    // Alternate who leads, and who she faces.
    const opponent=seed%2?'mercenary':'hunter',ragnaFirst=seed%4<2,players=[{id:'p0',name:'A',kind:'ai',archetype:ragnaFirst?'warrior':opponent},{id:'p1',name:'B',kind:'ai',archetype:ragnaFirst?opponent:'warrior'}];
    let s=createInitialState({playerCount:2,seed:seed*389,players});
    for(let i=0;i<2500&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));
    assert.equal(s.phase,'finished');games++;if(s.winnerId===(ragnaFirst?'p0':'p1'))wins++;
  }
  // Sanity floor only (her real edge, ~55% over 2,400 hands, is in RAGNA_INTEGRATION.md).
  assert.ok(wins/games>.44,`Ragna wins ${(100*wins/games).toFixed(1)}%`);
  assert.ok(PRESSURE_PROFILE.holdCurse<VETERAN_PROFILE.holdCurse&&PRESSURE_PROFILE.holdWild<VETERAN_PROFILE.holdWild&&PRESSURE_PROFILE.pressure>0&&VETERAN_PROFILE.pressure===0);
});

test('the duel table offers only the four voiced regulars plus a random draw of the others',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/VOICED_OPPONENTS\.map\(id=>displayOpponent\(getDuelOpponent\(id\)\)\)/);
  assert.match(app,/data-random-opponent/);
  assert.match(app,/DUEL_OPPONENTS\.filter\(item=>!AUTHORED_CHARACTERS\[item\.id\]\)/);
  assert.equal(DUEL_OPPONENTS.filter(item=>!AUTHORED_CHARACTERS[item.id]).length,9);
  // Home menu order: Duel, Tavern Match, Quick Play.
  const home=app.slice(app.indexOf('function homeHTML'),app.indexOf('function duelSelectHTML'));
  const order=['duel-choice','tavern-choice','quick-choice'].map(name=>home.indexOf(`home-choice ${name}`));
  assert.ok(order[0]>0&&order[0]<order[1]&&order[1]<order[2],order.join());
});

test('a Ragna match round-trips through finishRound with her duel house and archetype',()=>{
  let m=createDuelSession({seed:8,opponent:getDuelOpponent('ragna')});assert.equal(m.game.players[1].house,'blue');
  m.game.phase='finished';m.game.winnerId='p1';m.game.players[1].hand=[];m=finishRound(m);assert.equal(m.results.at(-1).winnerId,'p1');
});
