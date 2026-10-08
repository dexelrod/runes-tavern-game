import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { KESH_EXPRESSIONS, KESH_REACTIONS, KESH_SCRIPT, KESH_STATES, KESH_TELL, KESH_VOICE_LIBRARY, createKeshController, keshDecisionIsMajor, keshEventFor, keshExpressionURL, keshTellFor, resolveKeshReaction, resolveKeshVoice } from '../dist/duel/kesh.js';
import { createEdrinController } from '../dist/duel/edrin.js';
import { createRagnaController } from '../dist/duel/ragna.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { OMEN_PROFILE, VETERAN_PROFILE, chooseVeteranAction, omenColour, veteranColour } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { TAVERN_REGULARS, VOICED_TAVERN_GUESTS, createDuelSession, createTavernMatch } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const seeded=seed=>mulberry32(seed);
const ready=(clock=()=>60000,random=()=>0)=>{const k=createKeshController({random,now:clock});for(let i=0;i<5;i++)k.observe('kesh_move');return k;};

test('Kesh registers all 52 authored lines, all 40 expressions and every delivered voice file',()=>{
  assert.equal(KESH_REACTIONS.length,52);assert.equal(Object.keys(KESH_VOICE_LIBRARY).length,52);assert.equal(KESH_EXPRESSIONS.length,40);
  for(const reaction of KESH_REACTIONS){
    for(const key of ['id','trigger','voice','expression','priority','duration'])assert.ok(reaction[key],`${reaction.id} ${key}`);
    assert.ok(KESH_EXPRESSIONS.includes(reaction.expression),`${reaction.id} maps to a real expression`);
    for(const locale of ['en','he']){
      const voice=resolveKeshVoice(reaction.voice,locale);
      if(reaction.voice==='kesh_player_good_move_02'&&locale==='he'){assert.equal(voice,null,'no Hebrew take was delivered');continue;}
      assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024,`${reaction.voice} ${locale}`);
      if(locale==='he')assert.match(voice.src,/_he\.mp3$/);else assert.doesNotMatch(voice.src,/_he\.mp3$/);
    }
  }
  const files=fs.readdirSync(new URL('../dist/assets/kesh/voice/',import.meta.url));
  // 103 takes of his own, plus his side of the Veyra (5) and Gorvan (2, English only) banter, and v106's six (English only).
  assert.equal(files.filter(name=>!name.includes('_banter_')).length,103);assert.equal(files.length,120);assert.ok(files.every(name=>name.endsWith('.mp3')));
  assert.ok(files.includes('kesh_match_win_02_he.mp3'),'the take delivered without an extension ships as .mp3');
  for(const expression of KESH_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(keshExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');assert.equal(bytes.subarray(8,12).toString(),'WEBP');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,640],`${expression} shares the anchored canvas`);}
});

test('every Kesh expression is reachable in play',()=>{
  const sources=read('../dist/duel/kesh.js').replace(/export const KESH_EXPRESSION_FILES=[\s\S]*?\}\);/,'')+read('../dist/app.js');
  for(const expression of KESH_EXPRESSIONS)assert.ok(sources.includes(`'${expression}'`),`${expression} is never shown`);
});

test('bubbles show the exact authored transcript, acting directions removed, Hebrew untouched',()=>{
  const samples=[['intro_02','Let us see where this road goes.','נראה לאן הדרך הזאת מובילה.'],['idle_03','Hm. Different tonight.','הממ. משהו שונה הלילה.'],['player_good_move_02','Bold choice.','בחירה מעניינת.'],['king_01','The crown has spoken.','המלך אמר את דברו.'],['match_loss_01','So this road was yours.','אז הדרך הזאת לא הייתה שלי.'],['omen_03','Ah. Of course.','אה. כמובן.'],['annoyed_02',"I'll remember that.",'את זה אני אזכור.']];
  for(const [id,en,he] of samples){const base=KESH_REACTIONS.find(item=>item.id===id);assert.equal(resolveKeshReaction(base,'en').caption,en);assert.equal(resolveKeshReaction(base,'he').caption,he);assert.equal(resolveKeshReaction(base,'he').id,id,'one reaction id, two locales');}
  for(const line of Object.values(KESH_SCRIPT))for(const text of Object.values(line)){assert.doesNotMatch(text,/\[|\]/);assert.ok(text.length>0);}
  assert.equal(resolveKeshReaction(KESH_REACTIONS.find(item=>item.id==='player_good_move_02'),'he').voice,null,'the undelivered Hebrew take stays silent but keeps its bubble');
  assert.equal(resolveKeshReaction(KESH_REACTIONS.find(item=>item.id==='player_good_move_02'),'he').caption,'בחירה מעניינת.');
});

test('one framework: Kesh plugs into the shared registry, the shared controller and the single voice path',()=>{
  assert.deepEqual(VOICED_OPPONENTS,['bramm','edrin','ragna','kesh','veyra','gorvan']);
  assert.match(resolveCharacterVoice('kesh_omen_02','he').src,/kesh_omen_02_he\.mp3$/);
  assert.match(read('../dist/duel/kesh.js'),/createAuthoredController\(KESH_SPEC/);
  const app=read('../dist/app.js');assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1,'Duel and Tavern share one voice call');assert.doesNotMatch(app,/new Audio\(|<audio/);
  assert.equal(localizeDuelOpponent(getDuelOpponent('kesh'),'en').name,'Kesh');assert.equal(getDuelOpponent('kesh').name,'קֶשׁ');assert.equal(getDuelOpponent('kesh').gender,'m');
  for(const pool of Object.values(getDuelOpponent('kesh').dialoguePools))assert.equal(pool.length,0,'no generic quips');
  for(const pool of Object.values(localizeDuelOpponent(getDuelOpponent('kesh'),'en').dialoguePools))assert.equal(pool.length,0,'no generic English quips either');
  assert.equal(createDuelSession({seed:3,opponent:getDuelOpponent('kesh')}).game.players[1].archetype,'traveler');
  assert.equal(VOICED_TAVERN_GUESTS.find(p=>p.nameKey==='kesh').archetype,'traveler');assert.ok(!TAVERN_REGULARS.some(p=>p.nameKey==='kesh'),'at the Tavern he is a voiced guest now, not an ordinary regular');
});

test('Kesh is separated from Rusk and the old shared quip pool',()=>{
  const app=read('../dist/app.js');
  // Kesh's sayings no longer live in the generic tavern pools that Rusk uses.
  const pools=app.slice(app.indexOf('const dialogueHe='),app.indexOf('const tavernBanterHe='));
  for(const phrase of ['The wind has changed','The fire knows','The road grows','The river turns','הרוח השתנתה','האש יודעת','הנהר חוזר'])assert.ok(!pools.includes(phrase),`${phrase} still in the generic pools`);
  assert.equal(getDuelOpponent('rusk').archetype,'mysterious');
  for(const pool of Object.values(localizeDuelOpponent(getDuelOpponent('rusk'),'en').dialoguePools))for(const text of pool)assert.doesNotMatch(text,/wind|fire|road|river|sign/i);
  // His seat never takes a generic line, and generic speakers skip him.
  assert.match(app,/function botLine\(playerId,trigger\)\{const player=state\.players\.find\(p=>p\.id===playerId\);if\(isVoicedGuest\(player\)\)return null;/);
  assert.match(app,/if\(!isAuthoredDuel\(\)&&!keshSpoke\)\{/);
  assert.ok((app.match(/!isVoicedGuest\(p\)/g)||[]).length>=4,'generic speakers are chosen from the other regulars');
});

test('anti-repetition: never the same recording or the same words twice running; EN and HE are one reaction',()=>{
  for(let seed=1;seed<=60;seed++){
    const random=seeded(seed),kesh=createKeshController({random,now:()=>0});let last=null,lastRemark=null,recent=[];
    for(let i=0;i<40;i++){
      const trigger=['round_win','round_loss','skip','curse','setback','kesh_good_move','player_good_move','match_win','match_loss','reverse','king'][Math.floor(random()*11)];
      const reaction=kesh.react(trigger,{locale:i%2?'he':'en'},true);if(!reaction)continue;
      assert.notEqual(reaction.voice,last);assert.doesNotMatch(reaction.voice,/_he$/);
      if(reaction.category!=='result')assert.notEqual(reaction.remark,lastRemark,`${reaction.voice} repeats the words just said`);
      // The same words are ruled out first; the three-recording rule applies to what is left.
      // (In Hebrew the one line without a recorded take is left out, as for every character.)
      const pool=KESH_REACTIONS.filter(item=>item.trigger===trigger&&(!item.when||item.when({}))&&(item.category==='result'||item.remark!==lastRemark)&&!(i%2&&item.voice==='kesh_player_good_move_02'));
      if(pool.filter(item=>!recent.slice(0,3).includes(item.voice)).length>0)assert.ok(!recent.slice(0,3).includes(reaction.voice),`${reaction.voice} repeated within three`);
      last=reaction.voice;lastRemark=reaction.remark;recent=[reaction.voice,...recent.filter(voice=>voice!==reaction.voice)];
    }
  }
});

test('the quietest voice: three meaningful actions and about thirteen seconds between casual lines; one a round',()=>{
  let clock=0;const kesh=createKeshController({random:()=>0,now:()=>clock});
  kesh.observe('kesh_move');kesh.observe('player_neutral_move');clock=60000;assert.equal(kesh.react('skip'),null,'two actions are not enough');
  kesh.observe('kesh_move');assert.ok(kesh.react('skip'));
  for(let i=0;i<3;i++)kesh.observe('kesh_move');clock+=20000;assert.equal(kesh.react('curse'),null,'one ordinary line in a normal round');
  kesh.beginRound();for(let i=0;i<3;i++)kesh.observe('kesh_move');
  const fresh=createKeshController({random:()=>0,now:()=>clock});for(let i=0;i<3;i++)fresh.observe('kesh_move');assert.ok(fresh.react('skip'));
  for(let i=0;i<3;i++)fresh.observe('kesh_move');fresh.beginRound();for(let i=0;i<3;i++)fresh.observe('kesh_move');
  clock+=10000;assert.equal(fresh.react('curse'),null,'ten seconds is too soon');
  clock+=4000;assert.ok(fresh.react('curse'),'about thirteen seconds later, in a new round');
  // A long round earns a second ordinary line.
  const long=createKeshController({random:()=>0,now:()=>clock});for(let i=0;i<3;i++)long.observe('kesh_move');assert.ok(long.react('skip'));
  for(let i=0;i<30;i++)long.observe('kesh_move');clock+=20000;assert.ok(long.react('curse'));
});

test('Kesh speaks less than Ragna and no more than Edrin, while his face reacts the most',()=>{
  const events=['player_good_move','kesh_good_move','player_draw','kesh_draw','skip','curse','player_neutral_move','kesh_move','kesh_move','player_neutral_move'];
  const toRagna={kesh_good_move:'ragna_good_move',kesh_draw:'ragna_draw',kesh_move:'ragna_move',skip:'player_neutral_move',curse:'player_draw'},toEdrin={kesh_good_move:'edrin_good_move',kesh_draw:'edrin_draw',kesh_move:'edrin_move',skip:'player_neutral_move',curse:'player_draw'};
  let k=0,r=0,e=0,kf=0,ef=0,rounds=0;
  for(let seed=1;seed<=80;seed++){let clock=0;const kesh=createKeshController({random:seeded(seed),now:()=>clock}),ragna=createRagnaController({random:seeded(seed+500),now:()=>clock}),edrin=createEdrinController({random:seeded(seed+999),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;kesh.beginRound();ragna.beginRound();edrin.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0,ctx={big,forced:i%3===0,haul:big,longer:big,amount:big?4:2};
        if(kesh.observe(t,ctx))kf++;if(edrin.observe(toEdrin[t]||t,ctx))ef++;ragna.observe(toRagna[t]||t,ctx);
        if(kesh.react(t,ctx))k++;if(ragna.react(toRagna[t]||t,ctx))r++;if(edrin.react(toEdrin[t]||t,ctx))e++;}}}
  assert.ok(k<r,`Kesh ${k} < Ragna ${r}`);assert.ok(k<=e*1.15,`Kesh ${k} about Edrin ${e} or quieter`);
  assert.ok(k/rounds>=.3&&k/rounds<=2,`0–2 ordinary lines a round (${(k/rounds).toFixed(2)})`);
  assert.ok(kf>ef,`his face notices more than Edrin's (${kf} vs ${ef})`);assert.ok(kf>k*3,`${kf} faces vs ${k} lines`);
});

test('player on one card: he studies it — focused, never panic; one line at most, the rest only after cooldown',()=>{
  let spoke=0;
  for(let seed=1;seed<=400;seed++){
    let clock=50000;const kesh=createKeshController({random:seeded(seed),now:()=>clock});
    assert.equal(kesh.observe('player_one_card').expression,'player_one_card');
    const line=kesh.react('player_one_card');if(line){spoke++;assert.match(line.voice,/^kesh_player_one_card_0[1-3]$/);}
    assert.equal(kesh.snapshot().state,'watchful');assert.equal(kesh.defaultExpression(),'player_one_card');
    clock+=1000;if(line)assert.equal(kesh.react('player_one_card',{persist:true}),null,'never two one-card lines back to back');
  }
  assert.ok(!KESH_STATES.includes('panic')&&!KESH_STATES.includes('excited'));
  assert.ok(spoke>400*.45&&spoke<400*.65,`spoke ${spoke}/400 (45–65%)`);
  assert.equal(ready().react('player_one_card',{playerStillToPlay:true}),null,'the player may go out right now: he only watches');
});

test('Kesh on one card: the road is clear — composed, and silent when he is about to finish',()=>{
  let clock=50000;const kesh=ready(()=>clock);
  assert.ok(['kesh_one_card','road_clear'].includes(kesh.observe('kesh_one_card').expression));
  assert.equal(ready(()=>clock).react('kesh_one_card',{ownTurn:true}),null);
  const first=kesh.react('kesh_one_card');assert.match(first.voice,/^kesh_one_card_0[12]$/);clock+=1500;assert.equal(kesh.react('kesh_one_card'),null);
  assert.equal(kesh.observeTable({humanCount:5,keshCount:1}),'clear');
});

test('results: one line per hand from the right pool; match never stacks with round; "I misread that one" is earned',()=>{
  const pools={round_win:/^kesh_round_win_0[1-3]$/,round_loss:/^kesh_round_loss_0[1-3]$/,match_win:/^kesh_match_win_0[1-3]$/,match_loss:/^kesh_match_loss_0[1-3]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createKeshController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.priority,'CRITICAL');assert.equal(r.nextState,'result');}
  let told=0,untold=0;for(let seed=1;seed<=300;seed++){if(createKeshController({random:seeded(seed)}).react('round_loss',{told:true},true).voice==='kesh_round_loss_03')told++;if(createKeshController({random:seeded(seed)}).react('round_loss',{told:false},true).voice==='kesh_round_loss_03')untold++;}
  assert.ok(told>300*.5&&untold<300*.15,`misread leans on hands with a tell (${told} vs ${untold})`);
  const app=read('../dist/app.js');
  assert.match(app,/else if\(isKeshDuel\(\)\)\{[\s\S]*?runCharacter\(finalDuel\?\(opponentWon\?'match_win':'match_loss'\):\(opponentWon\?'round_win':'round_loss'\)/);
  // No anger in a lost match.
  for(const item of KESH_REACTIONS.filter(r=>r.trigger==='match_loss'))assert.ok(!['dry_annoyance','really','plans_disrupted'].includes(item.expression));
});

test('intro: one line on a first meeting; later a line, a look, or nothing — never chained',()=>{
  const plans={voice:0,expression:0,none:0};
  for(let seed=1;seed<=200;seed++){
    const first=createKeshController({random:seeded(seed)});first.observe('intro',{firstEncounter:true});assert.match(first.react('intro',{firstEncounter:true},true).voice,/^kesh_intro_0[1-3]$/);
    const later=createKeshController({random:seeded(seed)});const look=later.observe('intro',{});const line=later.react('intro',{},true);
    if(line)plans.voice++;else if(look)plans.expression++;else plans.none++;
    if(line)assert.equal(later.react('intro',{},true),null,'a second intro in the same match plans afresh and never forces a chain');
  }
  assert.ok(plans.voice>60&&plans.expression>30&&plans.none>15,JSON.stringify(plans));
});

test('rune stone tell: subtle, not guaranteed, never on a forced card, rarer as speech than as a gesture',()=>{
  let majors=0,ordinaries=0,spoken=0,shown=0;const random=seeded(9);
  for(let i=0;i<4000;i++){const m=keshTellFor({major:true,choices:3,random});if(m){majors++;shown++;if(m.speak)spoken++;assert.equal(m.touch,'omen_touch');assert.ok([null,'omen_reading','omen_realization'].includes(m.after));}if(keshTellFor({major:false,choices:3,random}))ordinaries++;}
  assert.ok(majors/4000>.3&&majors/4000<.46,`most big plays get no tell (${majors}/4000)`);
  assert.ok(ordinaries>0&&ordinaries/4000<.08,'now and then before an ordinary card, so it is not a reliable warning');
  assert.ok(spoken<shown*.4,'most tells are silent');
  assert.equal(keshTellFor({major:true,choices:1,random:()=>0}),null,'one legal card: nothing to consult');
  assert.equal(keshTellFor({major:true,choices:3,turnsSinceTell:1,random:()=>0}),null,'not two turns running');
  assert.equal(keshTellFor({major:true,choices:3,tellsThisRound:KESH_TELL.maxPerRound,random:()=>0}),null);
  assert.ok(KESH_TELL.lead>=250&&KESH_TELL.lead<=800);
  assert.ok(keshDecisionIsMajor({cardType:'plus2'})&&keshDecisionIsMajor({cardType:'king'})&&keshDecisionIsMajor({cardType:'changeColor'}));
  assert.ok(keshDecisionIsMajor({cardType:'stop',nextCount:2})&&!keshDecisionIsMajor({cardType:'stop',nextCount:6,humanCount:6,keshCount:6}));
  assert.ok(keshDecisionIsMajor({cardType:'number',humanCount:1})&&!keshDecisionIsMajor({cardType:'number',humanCount:6,keshCount:6}));
  // A stone, not a spell: no glow, particles or animation is attached to the omen poses.
  const css=read('../dist/styles.css');assert.doesNotMatch(css,/omen|rune-glow|kesh[^{]*\{[^}]*(glow|animation)/i);
  // Omen speech is capped per match.
  let clock=0;const kesh=createKeshController({random:()=>0,now:()=>clock});let omens=0;
  for(let i=0;i<12;i++){for(let k=0;k<4;k++)kesh.observe('kesh_move');clock+=20000;if(kesh.react('omen',{phase:['touch','reading','realization'][i%3]}))omens++;if(i%4===3)kesh.beginRound();}
  assert.ok(omens<=2,`${omens} omen lines in a match`);
});

test('event classifier: genuine swings only, and the signs can be wrong',()=>{
  const base={humanCount:5,keshCount:5,oldHuman:5,oldKesh:5};
  assert.deepEqual(keshEventFor({...base,humanCount:1,oldHuman:2,played:{playerId:'p0'}}),['player_one_card',{}]);
  assert.deepEqual(keshEventFor({...base,keshCount:1,oldKesh:2,played:{playerId:'p1'}}),['kesh_one_card',{}]);
  assert.deepEqual(keshEventFor({...base,penalty:{playerId:'p1',amount:2},tellPending:true}),['omen_failed',{told:true}]);
  assert.deepEqual(keshEventFor({...base,played:{playerId:'p0'},playedCard:{type:'king'},tellPending:true}),['omen_failed',{told:true}]);
  assert.equal(keshEventFor({...base,penalty:{playerId:'p1',amount:2}})[0],'kesh_draw','bad luck without a tell is just a draw');
  assert.equal(keshEventFor({...base,penalty:{playerId:'p1',amount:4}})[0],'setback');
  assert.equal(keshEventFor({...base,penalty:{playerId:'p0',amount:2}})[0],'curse');
  assert.equal(keshEventFor({...base,stop:{skipped:'p1'},played:{playerId:'p0'},playedCard:{type:'stop'}})[0],'skip');
  assert.deepEqual(keshEventFor({...base,played:{playerId:'p0'},playedCard:{type:'king'},cursedBefore:true}),['king',{own:false,broke:true}]);
  assert.equal(keshEventFor({...base,played:{playerId:'p1'},playedCard:{type:'reverse'},reverse:{}})[0],'reverse');
  assert.equal(keshEventFor({...base,played:{playerId:'p0'},playedCard:{type:'number'}})[0],'player_neutral_move');
  assert.equal(keshEventFor({...base,played:{playerId:'p1'},playedCard:{type:'plus2'},stack:{amount:2}})[0],'kesh_good_move');
  assert.equal(keshEventFor({...base,draw:{playerId:'p0'},humanCount:6})[1].haul,false);
  assert.equal(ready().react('player_draw',{amount:1},true),null,'an ordinary draw is never worth a word');
  // King lines: "The signs didn't show this." belongs to a King he did not play.
  for(let seed=1;seed<=60;seed++){const r=createKeshController({random:seeded(seed)}).react('king',{own:true},true);if(r)assert.equal(r.voice,'kesh_king_01');}
});

test('his face: calm by default, closer when the hands run short, watchful on the player\'s last card',()=>{
  const kesh=createKeshController({random:()=>0});
  assert.equal(kesh.defaultExpression(),'default_observant');
  kesh.observeTable({humanCount:3,keshCount:2});assert.equal(kesh.defaultExpression(),'close_observation');
  kesh.observeTable({humanCount:1,keshCount:2});assert.equal(kesh.defaultExpression(),'player_one_card');
  kesh.react('round_win',{},true);assert.equal(kesh.holdsExpression(),true);kesh.observeTable({humanCount:7,keshCount:7});assert.equal(kesh.snapshot().state,'result');
  kesh.beginRound();assert.equal(kesh.defaultExpression(),'default_observant');
  let clock=0;const unsure=createKeshController({random:()=>0,now:()=>clock});unsure.observe('omen_failed',{told:true});assert.equal(unsure.snapshot().presentation,'reading');clock+=2500;assert.equal(unsure.snapshot().presentation,'default');
});

test('idles are rare and wait for real quiet; "Still here, then." at most once a match',()=>{
  let clock=0;const kesh=createKeshController({random:()=>0,now:()=>clock});
  for(let i=0;i<20;i++)kesh.observe('player_neutral_move');clock+=10000;assert.equal(kesh.react('idle_quiet',{}),null,'ten seconds is not quiet enough');
  clock+=15000;const idle=kesh.react('idle_quiet',{});assert.match(idle.voice,/^kesh_idle_0[123]$/);
  for(let i=0;i<20;i++)kesh.observe('player_neutral_move');clock+=30000;assert.equal(kesh.react('idle_quiet',{}),null,'one idle line a round');
  let still=0;for(let round=0;round<5;round++){kesh.beginRound();for(let i=0;i<20;i++)kesh.observe('player_neutral_move');clock+=30000;if(kesh.react('slow_player',{}))still++;}
  assert.ok(still<=1);
});

test('his AI is fair: identical choices whatever the hidden cards are',()=>{
  let checked=0;
  for(let seed=1;seed<=16;seed++){
    let state=createInitialState({playerCount:2,seed:seed*733,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Kesh',kind:'ai',archetype:'traveler'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      if(currentPlayer(state).id==='p1'){
        const decide=s=>chooseVeteranAction(s,{random:seeded(seed*17+step),profile:OMEN_PROFILE});
        const original=decide(state),swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();
        swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);
        assert.deepEqual(decide(swapped),original,`seed ${seed} step ${step}`);checked++;
      }
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>80);
});

test('his AI is balanced: competitive with the tavern bots, below Edrin, a little superstitious, never sloppy',t=>{
  // Seeded so the measured win rate is the same on every run (CI included).
  const savedRandom=Math.random;Math.random=seeded(20261007);t.after(()=>{Math.random=savedRandom;});
  let wins=0,games=0;
  for(let seed=1;seed<=120;seed++){
    const opponent=seed%2?'mercenary':'hunter',keshFirst=seed%4<2,players=[{id:'p0',name:'A',kind:'ai',archetype:keshFirst?'traveler':opponent},{id:'p1',name:'B',kind:'ai',archetype:keshFirst?opponent:'traveler'}];
    let s=createInitialState({playerCount:2,seed:seed*389,players});
    for(let i=0;i<2500&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));
    assert.equal(s.phase,'finished');games++;if(s.winnerId===(keshFirst?'p0':'p1'))wins++;
  }
  assert.ok(wins/games>.4&&wins/games<.68,`Kesh wins ${(100*wins/games).toFixed(1)}%`);
  assert.ok(OMEN_PROFILE.mistakeRate<=.05&&OMEN_PROFILE.mistakeRate>0,'a rare close second choice, about 4%');
  assert.ok(OMEN_PROFILE.holdWild<VETERAN_PROFILE.holdWild,'he changes colour more readily than Edrin');
  assert.ok(OMEN_PROFILE.holdCurse>0&&OMEN_PROFILE.holdKing>0,'he keeps a Curse or King for when it matters');
  // Superstition: when naming a colour, the hand's omen colour wins a near-tie, never an empty colour.
  let state=createInitialState({playerCount:2,seed:21,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Kesh',kind:'ai',archetype:'traveler'}]});
  const omen=omenColour(state);assert.ok(omen);const me=state.players[1],other=['red','blue','green','yellow'].find(c=>c!==omen);
  const hand=[{id:'x1',type:'number',color:omen,value:3},{id:'x2',type:'number',color:other,value:4},{id:'x3',type:'number',color:other,value:5}];
  assert.equal(veteranColour(hand,state,me,{profile:VETERAN_PROFILE}),other,'without the superstition: the longer colour');
  assert.equal(veteranColour([...hand.slice(0,2),{id:'x4',type:'number',color:omen,value:6}],state,me,{profile:OMEN_PROFILE}),omen);
  assert.equal(veteranColour(hand.slice(1),state,me,{profile:OMEN_PROFILE}),other,'never toward a colour he does not hold');
});

test('Kesh plays his own way in every mode, old saves included',()=>{
  const players=[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'קֶשׁ',nameKey:'kesh',kind:'ai',archetype:'mysterious'}];
  const state=createInitialState({playerCount:2,seed:5,players});
  if(currentPlayer(state).id==='p1'){const action=chooseBotAction(state);assert.ok(action.type);}
  assert.match(read('../dist/game-ai/bot.js'),/player\.archetype==='traveler'\|\|\(player\.archetype==='mysterious'&&player\.nameKey==='kesh'\)/);
  const m=createTavernMatch({seed:7,guests:['kesh']});assert.equal(m.roster.find(p=>p.nameKey==='kesh').archetype,'traveler');
});

test('old Kesh art is migrated: no seated portrait, no sprite reactions, new art preloaded with a time limit',()=>{
  assert.ok(!fs.existsSync(new URL('../dist/assets/characters/table/kesh-seated.webp',import.meta.url)));
  const app=read('../dist/app.js'),sw=read('../dist/sw.js');
  assert.doesNotMatch(app+sw,/kesh-seated/);assert.match(sw,/'\.\/duel\/kesh\.js'/);
  assert.match(app,/isVoicedGuest\(player\)\)\{const pack=AUTHORED_CHARACTERS\[player\.nameKey\],face=/);
  assert.match(app,/await preloadWithin\(Promise\.all\(tavernGuestIds\.map\(id=>AUTHORED_CHARACTERS\[id\]\.preload\(\)\)\)\)/);
  assert.match(app,/await preloadWithin\(authoredCharacter\(next\.opponentId\)\.preload\(\)\)/);
  assert.deepEqual(getDuelOpponent('kesh').sprites,{});
  // His table props: the clay cup only; the stone lives in his hand.
  assert.match(app,/kesh:\['ceramicCup'\]/);
});

