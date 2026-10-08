import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BOUNTY_HUNTER_DELETED, BOUNTY_HUNTER_EXPRESSIONS, BOUNTY_HUNTER_EXPRESSION_FILES, BOUNTY_HUNTER_REACTIONS, BOUNTY_HUNTER_SCRIPT, BOUNTY_HUNTER_STATES, BOUNTY_HUNTER_TIMING, BOUNTY_HUNTER_VOICE_LIBRARY, bountyHunterEventFor, bountyHunterExpressionURL, createBountyHunterController, resolveBountyHunterReaction, resolveBountyHunterVoice } from '../dist/duel/bounty-hunter.js';
import { createGorvanController } from '../dist/duel/gorvan.js';
import { createKeshController } from '../dist/duel/kesh.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { BANTER_RECORDINGS } from '../dist/duel/banter.js';
import { TAVERN_BANTER, TAVERN_BANTER_GUEST_CAP, TAVERN_GUEST_POOLS, TAVERN_GUEST_TALK, TAVERN_TOPIC_ODDS, createTavernDirector } from '../dist/duel/tavern-director.js';
import { duelEventFor } from '../dist/duel/authored-pack.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { THREAT_PROFILE, TAVERN_THREAT_PROFILE, VETERAN_PROFILE, chooseVeteranAction, tableThreats } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { TYPES, makeCard, mulberry32 } from '../dist/game-engine/cards.js';
import { QUICK_NAME_POOL, VOICED_TAVERN_GUESTS, createDuelSession, createTavernMatch, restoreSession, serializeSession } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const freezeThinkClock=t=>{const saved=globalThis.performance.now;globalThis.performance.now=()=>0;t.after(()=>{globalThis.performance.now=saved;});};
const seeded=seed=>mulberry32(seed);
const line=id=>BOUNTY_HUNTER_REACTIONS.find(item=>item.id===id);
const hunterBanter=TAVERN_BANTER.filter(b=>b.lines.some(([guest])=>guest==='bounty_hunter'));

test('the Bounty Hunter: 63 approved lines, English recordings only, 16 states on 15 paintings at the shared canvas',()=>{
  assert.equal(BOUNTY_HUNTER_REACTIONS.length,63);assert.equal(Object.keys(BOUNTY_HUNTER_VOICE_LIBRARY).length,63);assert.equal(BOUNTY_HUNTER_EXPRESSIONS.length,16);
  const files=fs.readdirSync(new URL('../dist/assets/bounty_hunter/voice/',import.meta.url));
  // 63 lines of his own + 33 of his own banter / three-person recordings.
  assert.equal(files.length,96);assert.ok(files.every(name=>name.endsWith('.mp3')&&!name.endsWith('_he.mp3')),'English recordings only — no Hebrew audio invented');
  for(const reaction of BOUNTY_HUNTER_REACTIONS){
    assert.ok(BOUNTY_HUNTER_EXPRESSIONS.includes(reaction.expression),reaction.id);
    for(const locale of ['en','he']){const voice=resolveBountyHunterVoice(reaction.voice,locale);assert.ok(voice,`${reaction.voice} ${locale}`);assert.doesNotMatch(voice.src,/_he\.mp3$/);assert.equal(voice.audioLocale,'en');assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024);}
  }
  // The fixed stare is the neutral painting held longer (the pack's design): one file, two states.
  assert.equal(BOUNTY_HUNTER_EXPRESSION_FILES.fixed_stare,BOUNTY_HUNTER_EXPRESSION_FILES.neutral);
  const images=fs.readdirSync(new URL('../dist/assets/bounty_hunter/expressions/',import.meta.url));assert.equal(images.length,15);
  for(const expression of BOUNTY_HUNTER_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(bountyHunterExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,640],expression);}
});

test('no name, no face: the script is the approved text, performance tags are never shown, deleted categories do not exist',()=>{
  assert.equal(BOUNTY_HUNTER_SCRIPT.intro_01.en,'Hello.');assert.equal(BOUNTY_HUNTER_SCRIPT.intro_01.he,'שלום.');
  assert.equal(BOUNTY_HUNTER_SCRIPT.match_loss_04.en,"I'll remember that.");assert.equal(BOUNTY_HUNTER_SCRIPT.player_good_move_02.en,'Competent.');
  for(const item of [...Object.values(BOUNTY_HUNTER_SCRIPT),...Object.values(BANTER_RECORDINGS).filter(r=>/bounty_hunter/.test(r.voice)).map(r=>r.captions)])
    for(const text of [item.en,item.he]){assert.ok(text);assert.doesNotMatch(text,/\[|\]|`|monotone|flatly|same tone|flirty/i);}
  for(const id of BOUNTY_HUNTER_DELETED){assert.ok(!BOUNTY_HUNTER_SCRIPT[id]);assert.ok(!fs.existsSync(new URL(`../dist/assets/bounty_hunter/voice/bounty_hunter_${id}.mp3`,import.meta.url)),id);}
  for(const pattern of [/turnabout/,/quickstep/,/_rune_0/,/frost/])assert.doesNotMatch(read('../dist/duel/bounty-hunter.js').replace(/BOUNTY_HUNTER_DELETED=[^\n]+/,''),new RegExp(`bounty_hunter${pattern.source}`));
  assert.equal(localizeDuelOpponent(getDuelOpponent('bounty_hunter'),'en').name,'The Bounty Hunter');assert.equal(getDuelOpponent('bounty_hunter').name,'צייד הראשים');
  const hebrew=resolveBountyHunterReaction(line('curse_received_01'),'he');assert.equal(hebrew.caption,'ברור.');assert.equal(hebrew.voice,'bounty_hunter_curse_received_01','in Hebrew he speaks English under the Hebrew bubble (the Gorvan rule)');
  // No helmet acting in CSS: no animation, filter or transform keyed to him beyond static sizing.
  assert.doesNotMatch(read('../dist/styles.css'),/bounty_hunter[^{]*\{[^}]*(animation|glow|filter|rotate)/i);
});

test('one framework: a Duel opponent and a Tavern guest on the shared pack, controller, voice path and director',()=>{
  assert.ok(VOICED_OPPONENTS.includes('bounty_hunter'));assert.equal(AUTHORED_CHARACTERS.bounty_hunter.generic,true);
  assert.match(read('../dist/duel/bounty-hunter.js'),/createAuthoredController\(BOUNTY_HUNTER_SPEC/);
  for(const pool of Object.values(getDuelOpponent('bounty_hunter').dialoguePools))assert.equal(pool.length,0,'no generic lines');
  assert.equal(createDuelSession({seed:3,opponent:getDuelOpponent('bounty_hunter')}).game.players[1].archetype,'bounty');
  assert.equal(VOICED_TAVERN_GUESTS.find(p=>p.nameKey==='bounty_hunter').archetype,'tavern-bounty');
  assert.ok(!QUICK_NAME_POOL.some(p=>p.nameKey==='bounty_hunter'),'never an unvoiced stranger at Quick Play');
  assert.match(resolveCharacterVoice('bounty_hunter_idle_02','he').src,/bounty_hunter_idle_02\.mp3$/);
  const m=createTavernMatch({seed:8,guests:['bounty_hunter','gorvan']}),back=restoreSession(serializeSession(m));
  assert.deepEqual(back.roster.map(p=>p.nameKey),m.roster.map(p=>p.nameKey));assert.ok(back.roster.some(p=>p.nameKey==='bounty_hunter'&&p.voiced));
  const app=read('../dist/app.js');assert.match(app,/pack\?\.refineEvent\?pack\.refineEvent\(shared/);assert.match(app,/window\.BountyHunterDebug=characterDebug\('bounty_hunter'/);
});

test('his own special cards are named precisely; Turnabout, Quickstep and Rune get a look at most',()=>{
  const ev=(facts,shared=['own_good_move',{}])=>bountyHunterEventFor(shared,{humanCount:5,...facts});
  assert.deepEqual(ev({played:{playerId:'p1'},playedCard:{type:'plus2'},stack:{amount:2}}),['own_curse',{amount:2,urgent:false}]);
  assert.deepEqual(ev({played:{playerId:'p1'},playedCard:{type:'king'},cursedBefore:true}),['own_king',{broke:true,urgent:false}]);
  assert.equal(ev({played:{playerId:'p1'},playedCard:{type:'superTaki'}})[0],'own_runed_crossbow');
  assert.equal(ev({played:{playerId:'p1'},playedCard:{type:'taki'},opened:{}},['own_move',{}])[0],'own_crossbow');
  assert.deepEqual(ev({played:{playerId:'p0'},playedCard:{type:'plus2'},stack:{amount:2}},['player_good_move',{}]),['player_good_move',{}],'the player\'s cards are the shared classifier\'s call');
  assert.deepEqual(ev({played:{playerId:'p1'},playedCard:{type:'plus2'},stack:{amount:2}},['player_one_card',{}]),['player_one_card',{}],'a last card always wins');
  // "Take two." only when it is literally two.
  for(let seed=1;seed<=40;seed++){const r=createBountyHunterController({random:seeded(seed)}).react('own_curse',{amount:4},true);assert.notEqual(r?.voice,'bounty_hunter_curse_01');}
  const reverse=duelEventFor({played:{playerId:'p0'},playedCard:{type:'reverse'},reverse:{}});assert.equal(reverse[0],'reverse');
  assert.ok(!BOUNTY_HUNTER_REACTIONS.some(r=>['reverse','player_reverse','quickstep','rune','frost'].includes(r.trigger)),'no spoken reaction to the deleted categories');
});

test('the quietest voice in the cast: fewer lines than Gorvan and Kesh, far more looks than words',()=>{
  const events=['player_good_move','own_good_move','player_draw','own_draw','stop_taken','curse_taken','player_neutral_move','own_move','own_move','player_neutral_move'];
  const toKesh={own_good_move:'kesh_good_move',own_draw:'kesh_draw',own_move:'kesh_move',stop_taken:'skip',curse_taken:'kesh_draw'};
  let b=0,g=0,k=0,bf=0,rounds=0;
  for(let seed=1;seed<=80;seed++){let clock=0;const hunter=createBountyHunterController({random:seeded(seed),now:()=>clock}),gorvan=createGorvanController({random:seeded(seed+300),now:()=>clock}),kesh=createKeshController({random:seeded(seed+500),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;hunter.beginRound();gorvan.beginRound();kesh.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0,ctx={big,forced:i%3===0,haul:big,amount:big?4:2};
        if(hunter.observe(t,ctx))bf++;gorvan.observe(t,ctx);kesh.observe(toKesh[t]||t,ctx);
        if(hunter.react(t,ctx))b++;if(gorvan.react(t,ctx))g++;if(kesh.react(toKesh[t]||t,ctx))k++;}}}
  assert.ok(b<k,`Hunter ${b} < Kesh ${k}`);assert.ok(b<=g,`Hunter ${b} ≤ Gorvan ${g}`);
  assert.ok(b/rounds<=.9,`${(b/rounds).toFixed(2)} ordinary lines a round`);
  assert.ok(bf>b*3,`${bf} small looks vs ${b} lines`);
  assert.ok(!BOUNTY_HUNTER_STATES.some(s=>['panic','excited','angry','menacing'].includes(s)));
  assert.ok(TAVERN_GUEST_TALK.bounty_hunter<Math.min(...Object.entries(TAVERN_GUEST_TALK).filter(([id])=>id!=='bounty_hunter').map(([,v])=>v)),'the lowest talk weight at a Tavern table');
  assert.ok(BOUNTY_HUNTER_TIMING.ordinaryPerMatch<=4);
});

test('anti-repetition across categories: no "Good." straight after "Good.", and never the same line twice running',()=>{
  for(let seed=1;seed<=60;seed++){
    let clock=0;const h=createBountyHunterController({random:seeded(seed),now:()=>clock});const said=[];
    for(let round=0;round<5;round++){h.beginRound();for(let i=0;i<30;i++){clock+=6000;for(let j=0;j<5;j++)h.observe('own_move');const t=['player_good_move','own_good_move','own_draw','player_draw','idle_quiet','curse_taken','stop_given'][i%7];const r=h.react(t,{big:i%2===0,forced:true,haul:i%3===0,amount:2});if(r)said.push(r.remark);}
      const r=h.react(round%2?'round_win':'round_loss',{},true);if(r)said.push(r.remark);}
    for(let i=1;i<said.length;i++)assert.notEqual(said[i],said[i-1],`seed ${seed}: "${said[i]}" twice running`);
  }
  // The same remark in different categories is one remark ("Good." praises, closes a round, answers Veyra).
  assert.equal(line('player_good_move_01').remark,line('round_win_01').remark);
});

test('intro: aggressively ordinary — a first meeting is always "Hello."; later, a line, a look or nothing',()=>{
  for(let seed=1;seed<=50;seed++){const r=createBountyHunterController({random:seeded(seed)}).react('intro',{firstEncounter:true},true);assert.equal(r.voice,'bounty_hunter_intro_01');}
  let voiced=0;for(let seed=1;seed<=200;seed++){const c=createBountyHunterController({random:seeded(seed)});c.observe('intro',{firstEncounter:false});if(c.react('intro',{firstEncounter:false},true))voiced++;}
  assert.ok(voiced>60&&voiced<160,`${voiced}/200 later meetings get a line`);
  assert.doesNotMatch(read('../dist/app.js'),/bounty_hunter[^;]{0,80}(Entrance|sting)/i,'no ominous entrance cue of his own');
});

test('results: one line or a look per hand; match never stacks with round; "I\'ll remember that." keeps a neutral face',()=>{
  const pools={round_win:/^bounty_hunter_round_win_0[1-4]$/,round_loss:/^bounty_hunter_round_loss_0[1-4]$/,match_win:/^bounty_hunter_match_win_0[1-4]$/,match_loss:/^bounty_hunter_match_loss_0[1-4]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createBountyHunterController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.nextState,'result');}
  assert.equal(line('match_loss_04').expression,'neutral');
  for(const item of BOUNTY_HUNTER_REACTIONS.filter(r=>r.category==='result'))assert.ok(['neutral','approval','hand_glance','dismissal'].includes(item.expression),item.id);
  const pack=AUTHORED_CHARACTERS.bounty_hunter;assert.ok(pack.resultVoiceChance('round_win')<1&&pack.resultVoiceChance('match_win')===1&&pack.resultVoiceChance('match_loss')===1);
  assert.match(read('../dist/app.js'),/const trigger=finalDuel\?\(opponentWon\?'match_win':'match_loss'\):\(opponentWon\?'round_win':'round_loss'\)/);
});

test('the rare look belongs to one line: "Maybe later." alone uses rare_amusement — never a silent reaction',()=>{
  const users=[...BOUNTY_HUNTER_REACTIONS.filter(r=>r.expression==='rare_amusement').map(r=>r.voice),...Object.values(BANTER_RECORDINGS).filter(r=>r.speaker==='bounty_hunter'&&r.expression==='rare_amusement').map(r=>r.voice)];
  assert.deepEqual(users,['bounty_hunter_banter_veyra_02d']);
  for(let seed=1;seed<=300;seed++){let clock=0;const h=createBountyHunterController({random:seeded(seed),now:()=>clock});for(const t of ['player_good_move','own_good_move','player_draw','own_draw','curse_taken','stop_taken','stop_given','king','reverse','idle_beat','slow_player','close_game','player_one_card','own_one_card']){clock+=5000;const v=h.observe(t,{big:true,forced:true,haul:true});if(v)assert.notEqual(v.expression,'rare_amusement',t);}}
  const later=hunterBanter.find(b=>b.id==='hunter_veyra_later');assert.equal(later.topic,'later');assert.ok(TAVERN_TOPIC_ODDS.later<=.3,'open on few evenings');
  assert.equal(BANTER_RECORDINGS.bounty_hunter_banter_veyra_02d.captions.en,'Maybe later.');
});

test('banter: every partner, every supplied exchange, whole and in order — English audio only, Hebrew text-only',()=>{
  const partners=new Set(hunterBanter.flatMap(b=>b.lines.map(([guest])=>guest)).filter(g=>g!=='bounty_hunter'));
  assert.deepEqual([...partners].toSorted(),['bramm','edrin','gorvan','kesh','ragna','veyra']);
  assert.equal(hunterBanter.length,17);assert.equal(hunterBanter.filter(b=>new Set(b.lines.map(([g])=>g)).size===3).length,4,'four three-person sequences');
  const used=new Set(hunterBanter.flatMap(b=>b.lines.map(([,voice])=>voice)));
  const recordings=Object.values(BANTER_RECORDINGS).filter(r=>/bounty_hunter/.test(r.voice));assert.equal(recordings.length,66);
  for(const r of recordings){assert.ok(used.has(r.voice),`${r.voice} is used`);assert.deepEqual([...r.takes],['en']);assert.ok(r.captions.he);assert.equal(resolveCharacterVoice(r.voice,'he'),null,'no Hebrew take');assert.ok(fs.statSync(new URL(`../dist/assets/${r.speaker}/voice/${r.voice}.mp3`,import.meta.url)).size>1024);}
  for(const b of hunterBanter){assert.equal(b.audio,'en');
    // File names carry the order (a, b, c …): each exchange plays in authored order.
    const letters=b.lines.map(([,voice])=>voice.at(-1));assert.deepEqual(letters,[...letters].toSorted(),b.id);}
  // Hebrew: every line silent (text only), never one voiced half; with bubbles off it does not run.
  const run=(locale,captions)=>{let clock=1e6;const d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'veyra'},random:()=>0,now:()=>clock,locale:()=>locale,captions:()=>captions});for(let i=0;i<5;i++)d.event('move',{actor:null});return d.forceBanter('hunter_veyra_blocking');};
  assert.ok(run('en',false).lines.every(l=>!l.silent));assert.ok(run('he',true).lines.every(l=>l.silent&&l.reaction.captions.he));
  let clock=1e6;const d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'veyra'},random:()=>0,now:()=>clock,locale:()=>'he',captions:()=>false});for(let i=0;i<5;i++)d.event('move',{actor:null});
  const off=d.event('idle',{current:'p0'});assert.ok(!off.banter?.startsWith('hunter_'),'bubbles off in Hebrew: nothing to show, so it does not run');
});

test('the Gorvan thread: only with Gorvan present, one exchange a match at most, open on some evenings only',()=>{
  for(const b of hunterBanter.filter(b=>[].concat(b.topic||[]).includes('gorvan')))assert.ok(b.lines.some(([g])=>g==='gorvan')||(b.needs||[]).includes('gorvan'),b.id);
  assert.ok(TAVERN_TOPIC_ODDS.gorvan<.6);
  // Over many evenings with both at the table, the thread comes up on some, never more than once in a match.
  let evenings=0,withThread=0;
  for(let seed=1;seed<=300;seed++){
    let clock=1e6;const random=seeded(seed),d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'gorvan',p3:'edrin'},random,now:()=>clock});let thread=0;
    for(let round=1;round<=5;round++){d.beginRound();for(let i=0;i<14;i++){clock+=9000;d.event('move',{actor:null});const plan=d.event('idle',{current:'p0',round,minCards:5});if(plan.banter&&[].concat(TAVERN_BANTER.find(b=>b.id===plan.banter).topic||[]).includes('gorvan'))thread++;}}
    evenings++;if(thread)withThread++;assert.ok(thread<=1,`seed ${seed}: ${thread} Gorvan exchanges in one match`);
  }
  assert.ok(withThread/evenings>.1&&withThread/evenings<.55,`the thread on ${(100*withThread/evenings).toFixed(0)}% of evenings`);
  // Without Gorvan nobody talks about the vampire.
  for(let seed=1;seed<=100;seed++){let clock=1e6;const d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'edrin',p3:'ragna'},random:seeded(seed),now:()=>clock});for(let i=0;i<60;i++){clock+=9000;d.event('move',{actor:null});const p=d.event('idle',{current:'p0',minCards:5});assert.ok(!['hunter_edrin_vampire','hunter_ragna_standard'].includes(p.banter));}}
  // The topic decision is saved with the match: a restore never re-rolls it.
  const first=createTavernDirector({seats:{p1:'bounty_hunter',p2:'gorvan'},random:seeded(4)}),again=createTavernDirector({seats:{p1:'bounty_hunter',p2:'gorvan'},random:seeded(99),initial:first.snapshot()});
  assert.deepEqual(again.topics(),first.topics());
});

test('a Tavern table: he takes part in at most two exchanges a match and says very little else',()=>{
  assert.equal(TAVERN_BANTER_GUEST_CAP.bounty_hunter,2);
  for(let seed=1;seed<=60;seed++){
    let clock=1e6;const d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'veyra',p3:'kesh'},random:seeded(seed),now:()=>clock});let exchanges=0,solo=0;
    for(let round=1;round<=5;round++){d.beginRound();for(let i=0;i<30;i++){clock+=4000;const type=['good_move','move','draw','penalty','idle','one_card','skip'][i%7],actor=['p0','p1','p2','p3'][i%4];
      const plan=d.event(type,{actor,victim:'p0',amount:2,current:'p0',minCards:5,round});
      if(plan.banter&&plan.lines.some(l=>l.guest==='bounty_hunter'))exchanges++;else solo+=plan.lines.filter(l=>l.guest==='bounty_hunter').length;}}
    assert.ok(exchanges<=2,`seed ${seed}: ${exchanges} exchanges`);assert.ok(solo<=3,`seed ${seed}: ${solo} lines of his own`);
  }
  // Pools: no deleted card lines, no Duel-only lines.
  const pool=Object.values(TAVERN_GUEST_POOLS.bounty_hunter).flat();assert.ok(pool.every(v=>BOUNTY_HUNTER_VOICE_LIBRARY[v]));
  for(const v of ['bounty_hunter_one_card_03','bounty_hunter_idle_05','bounty_hunter_crossbow_01'])assert.ok(!pool.includes(v),v);
});

test('looks follow the real seating: left, right or ahead; a listener turns toward the speaker',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/function lookFace\(seatId,target\)/);assert.match(app,/return to<from\?pack\.looks\.left:pack\.looks\.right;/);
  assert.match(app,/setGuestFace\(other,'@look',0,line\.seat\)/);
  assert.deepEqual(AUTHORED_CHARACTERS.bounty_hunter.looks,{left:'partner_left',right:'partner_right',ahead:'attention'});
  // Directional silent faces come out of the director with who to look at.
  let clock=1e6;const d=createTavernDirector({seats:{p1:'bounty_hunter',p2:'bramm'},random:()=>0,now:()=>clock});
  const plan=d.event('good_move',{actor:'p2',busy:true});const face=plan.faces.find(f=>f.seat==='p1');assert.equal(face.expression,'@look');assert.equal(face.toward,'p2');
});

test('his AI: practical threat assessment — fair, competitive and beatable',t=>{
  freezeThinkClock(t);const savedRandom=Math.random;Math.random=seeded(20261008);t.after(()=>{Math.random=savedRandom;});
  // Hidden-hand swap: identical choices whatever the hidden cards are (no peeking at hands or deck).
  let checked=0;
  for(let seed=1;seed<=8;seed++){
    let state=createInitialState({playerCount:2,seed:seed*911,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Hunter',kind:'ai',archetype:'bounty'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      if(currentPlayer(state).id==='p1'){const decide=s=>chooseVeteranAction(s,{random:seeded(seed*19+step),profile:THREAT_PROFILE});const original=decide(state),swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);assert.deepEqual(decide(swapped),original);checked++;}
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>40);
  let wins=0,games=0;
  for(let seed=1;seed<=120;seed++){const opponent=seed%2?'mercenary':'hunter',first=seed%4<2,players=[{id:'p0',name:'A',kind:'ai',archetype:first?'bounty':opponent},{id:'p1',name:'B',kind:'ai',archetype:first?opponent:'bounty'}];let s=createInitialState({playerCount:2,seed:seed*389,players});for(let i=0;i<2500&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));games++;if(s.winnerId===(first?'p0':'p1'))wins++;}
  assert.ok(wins/games>.4&&wins/games<.7,`the Hunter wins ${(100*wins/games).toFixed(1)}%`);
  assert.ok(THREAT_PROFILE.targeted&&THREAT_PROFILE.disrupt>(VETERAN_PROFILE.disrupt||0)+5&&THREAT_PROFILE.curseDanger>VETERAN_PROFILE.curseDanger,'stopping an imminent win comes first');
  assert.ok(THREAT_PROFILE.holdStop>0&&THREAT_PROFILE.holdCurse>=VETERAN_PROFILE.holdCurse,'no control card wasted');
  assert.ok(THREAT_PROFILE.mistakeRate<=.05&&TAVERN_THREAT_PROFILE.samples===0);
  // No bounty mechanics: the rules know nothing about him.
  for(const file of ['../dist/game-engine/engine.js','../dist/game-engine/cards.js'])assert.doesNotMatch(read(file),/bounty|hunter_/i);
});

// A four-seat table built by hand: the Hunter (p1) to act, a Shield and a plain card in hand.
function table({next=6,prev=6,across=6,shieldColour='red',names={}}={}){
  const hand=(id,n,colour='blue')=>Array.from({length:n},(_,i)=>makeCard(TYPES.NUMBER,colour,[1,3,4,5,6,7,8,9][i%8],`${id}-${i}`));
  const players=[
    {id:'p0',name:'You',kind:'human',archetype:'wanderer',hand:hand('p0',prev,'yellow')},
    {id:'p1',name:'Hunter',nameKey:'bounty_hunter',kind:'ai',archetype:'tavern-bounty',hand:[makeCard(TYPES.STOP,shieldColour,null,'s0-red-stop'),makeCard(TYPES.NUMBER,'red',5,'s0-red-5'),makeCard(TYPES.NUMBER,'green',7,'s0-green-7'),makeCard(TYPES.NUMBER,'green',8,'s0-green-8')]},
    {id:'p2',name:names.p2||'Next',nameKey:names.p2||'aila',kind:'ai',archetype:'hunter',hand:hand('p2',next)},
    {id:'p3',name:names.p3||'Across',nameKey:names.p3||'ron',kind:'ai',archetype:'bard',hand:hand('p3',across,'green')}
  ];
  const state=createInitialState({playerCount:4,seed:5,players:players.map(({hand,...p})=>p)});
  for(const p of state.players)p.hand=players.find(x=>x.id===p.id).hand;
  state.discardPile=[makeCard(TYPES.NUMBER,'red',3,'s1-red-3')];state.activeColor='red';state.currentPlayerIndex=1;state.direction=1;state.taki=null;state.activePenalty=null;state.log=[];
  return state;
}
test('at a busy table he spends a Shield on the real threat, not on whoever sits next — and shifts as the threat moves',()=>{
  const pick=state=>{const counts={};for(let seed=1;seed<=40;seed++){const a=chooseVeteranAction(state,{random:seeded(seed),profile:TAVERN_THREAT_PROFILE});const card=state.players[1].hand.find(c=>c.id===a.cardId);counts[card?.type||a.type]=(counts[card?.type||a.type]||0)+1;}return counts;};
  // The player after him is on one card: the Shield goes on them.
  const urgent=pick(table({next:1}));assert.ok((urgent[TYPES.STOP]||0)>=30,`Shield on the threat: ${JSON.stringify(urgent)}`);
  // The threat is elsewhere (the player before him is on one card); the next player is harmless: he keeps it.
  const elsewhere=pick(table({next:7,prev:1}));assert.ok((elsewhere[TYPES.STOP]||0)<=10,`Shield kept: ${JSON.stringify(elsewhere)}`);
  // Threats are public and name-blind: Gorvan in the next seat changes nothing.
  assert.deepEqual(pick(table({next:7,prev:1,names:{p2:'gorvan'}})),elsewhere);
  const threats=tableThreats(table({next:1,across:3}),'p1');assert.ok(threats.p2>threats.p3&&threats.p3>threats.p0);
});
