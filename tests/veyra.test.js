import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { VEYRA_CRITICAL_EXPRESSIONS, VEYRA_ENGLISH_ONLY, VEYRA_EXPRESSIONS, VEYRA_OMEN_KINDS, VEYRA_OMEN_LINES, VEYRA_OMEN_TUNING, VEYRA_REACTIONS, VEYRA_SCRIPT, VEYRA_STATES, VEYRA_VOICE_LIBRARY, createVeyraController, createVeyraOmenBook, resolveVeyraReaction, resolveVeyraVoice, veyraExpressionURL, veyraOmenEvent, veyraOmenMatches } from '../dist/duel/veyra.js';
import { createKeshController } from '../dist/duel/kesh.js';
import { createRagnaController } from '../dist/duel/ragna.js';
import { duelEventFor } from '../dist/duel/authored-pack.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { BANTER_RECORDINGS } from '../dist/duel/banter.js';
import { TAVERN_BANTER, createTavernDirector } from '../dist/duel/tavern-director.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { CONTROL_PROFILE, TAVERN_CONTROL_PROFILE, VETERAN_PROFILE, chooseVeteranAction } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { VOICED_TAVERN_GUESTS, createDuelSession, createTavernMatch } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
// The planner's look-ahead stops on a think budget measured with performance.now(): freeze that clock in
// tests so every machine (CI included) imagines the same number of hands and the results are identical.
const freezeThinkClock=t=>{const saved=globalThis.performance.now;globalThis.performance.now=()=>0;t.after(()=>{globalThis.performance.now=saved;});};
const seeded=seed=>mulberry32(seed);
const ready=(clock=()=>60000,random=()=>0)=>{const v=createVeyraController({random,now:clock});for(let i=0;i<5;i++)v.observe('own_move');return v;};

test('Veyra registers every authored line, all 61 poses, and every delivered voice file — nothing deleted comes back',()=>{
  assert.equal(VEYRA_REACTIONS.length,55);assert.equal(Object.keys(VEYRA_VOICE_LIBRARY).length,55);assert.equal(VEYRA_EXPRESSIONS.length,61);
  for(const reaction of VEYRA_REACTIONS){
    for(const key of ['id','trigger','voice','expression','priority','duration'])assert.ok(reaction[key],`${reaction.id} ${key}`);
    assert.ok(VEYRA_EXPRESSIONS.includes(reaction.expression),`${reaction.id} maps to a real pose`);
    for(const locale of ['en','he']){
      const voice=resolveVeyraVoice(reaction.voice,locale);
      if(locale==='he'&&VEYRA_ENGLISH_ONLY.includes(reaction.voice)){assert.equal(voice,null,`${reaction.voice}: no Hebrew take, and no English fallback`);continue;}
      assert.ok(fs.readFileSync(fileURLToPath(voice.src)).length>1024,`${reaction.voice} ${locale}`);
      if(locale==='he')assert.match(voice.src,/_he\.mp3$/);else assert.doesNotMatch(voice.src,/_he\.mp3$/);
    }
  }
  assert.deepEqual([...VEYRA_ENGLISH_ONLY].toSorted(),['veyra_intro_02','veyra_player_good_move_01']);
  const files=fs.readdirSync(new URL('../dist/assets/veyra/voice/',import.meta.url));
  // 55 lines (two in English only) + her six banter lines in both languages + three English-only Gorvan banter lines.
  assert.equal(files.length,55*2-2+12+3);assert.ok(files.every(name=>name.endsWith('.mp3')));
  for(const deleted of ['veyra_intro_02_he','veyra_player_good_move_01_he','veyra_reverse_01','veyra_reverse_01_he','veyra_reverse_02','veyra_reverse_02_he','veyra_king_01','veyra_king_01_he']){
    assert.ok(!files.includes(`${deleted}.mp3`),`${deleted} stays deleted`);
    assert.ok(!read('../dist/duel/veyra.js').includes(`'${deleted.replace('veyra_','')}'`),`${deleted} is not referenced`);
  }
  for(const deleted of ['ragna_banter_veyra_01b','veyra_banter_ragna_01c']){assert.ok(!BANTER_RECORDINGS[deleted]);assert.ok(!fs.existsSync(new URL(`../dist/assets/ragna/voice/${deleted}.mp3`,import.meta.url)));assert.ok(!fs.existsSync(new URL(`../dist/assets/veyra/voice/${deleted}.mp3`,import.meta.url)));}
  for(const expression of VEYRA_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(veyraExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');assert.equal(bytes.subarray(8,12).toString(),'WEBP');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,640],`${expression} shares the anchored canvas`);}
  for(const name of VEYRA_CRITICAL_EXPRESSIONS)assert.ok(VEYRA_EXPRESSIONS.includes(name));
});

test('every Veyra pose is reachable in play (Duel, Tavern or banter)',()=>{
  const sources=read('../dist/duel/veyra.js').replace(/export const VEYRA_EXPRESSION_FILES=[\s\S]*?\}\);/,'').replace(/export const VEYRA_CRITICAL_EXPRESSIONS=[^\n]*/,'')+read('../dist/duel/tavern-director.js')+read('../dist/duel/banter.js')+read('../dist/app.js');
  for(const expression of VEYRA_EXPRESSIONS)assert.ok(sources.includes(`'${expression}'`),`${expression} is never shown`);
});

test('bubbles: the exact authored text, acting directions removed, Hebrew untouched; one reaction id, two languages',()=>{
  const samples=[['intro_01','Something is wrong already.','כבר משהו לא בסדר..'],['player_draw_01','There it is.','התחלנו..'],['omen_hit_01','I TOLD YOU!','אמרתי לכם!!'],['omen_miss_04','The meaning changed.','המשמעות השתנתה.'],['match_loss_03','Wait. Unless losing was the sign.','רגע. אלא אם ההפסד היה הסימן.'],['player_one_card_02',"You didn't tell me that!",'את זה לא אמרתן לי!'],['round_win_03',"Don't get smug.",'אל תתלהבו מעצמכן.']];
  for(const [id,en,he] of samples){const base=VEYRA_REACTIONS.find(item=>item.id===id);assert.equal(resolveVeyraReaction(base,'en').caption,en);assert.equal(resolveVeyraReaction(base,'he').caption,he);assert.equal(resolveVeyraReaction(base,'he').id,id);}
  for(const line of Object.values(VEYRA_SCRIPT))for(const text of [line.en,line.he].filter(Boolean)){assert.doesNotMatch(text,/\[|\]|`/);assert.ok(text.length>0);}
  for(const item of Object.values(BANTER_RECORDINGS))for(const text of Object.values(item.captions))assert.doesNotMatch(text,/\[|\]|`/);
});

test('English-only lines are simply left out in Hebrew — never replaced by the English take',()=>{
  for(let seed=1;seed<=200;seed++){
    const v=createVeyraController({random:seeded(seed),now:()=>0});
    const intro=v.react('intro',{locale:'he',firstEncounter:true},true);assert.ok(intro);assert.notEqual(intro.voice,'veyra_intro_02');
    const good=createVeyraController({random:seeded(seed),now:()=>0}).react('player_good_move',{locale:'he'},true);if(good)assert.notEqual(good.voice,'veyra_player_good_move_01');
  }
  let heard=false;for(let seed=1;seed<=200&&!heard;seed++)heard=createVeyraController({random:seeded(seed),now:()=>0}).react('intro',{locale:'en',firstEncounter:true},true).voice==='veyra_intro_02';
  assert.ok(heard,'in English the line is part of her intro pool');
  assert.equal(resolveCharacterVoice('veyra_intro_02','he'),null,'the shared voice path finds no Hebrew take either');
  // At a Tavern table the same rule holds.
  for(let seed=1;seed<=60;seed++){let clock=1e6;const d=createTavernDirector({seats:{p2:'veyra'},random:seeded(seed),now:()=>clock,locale:()=>'he'});const plan=d.event('intro',{});for(const line of plan.lines)assert.ok(!VEYRA_ENGLISH_ONLY.includes(line.voice));}
});

test('one framework: Veyra plugs into the shared registry, the shared controller and the single voice path',()=>{
  assert.ok(VOICED_OPPONENTS.includes('veyra'));assert.equal(AUTHORED_CHARACTERS.veyra.generic,true);
  assert.match(read('../dist/duel/veyra.js'),/createAuthoredController\(VEYRA_SPEC/);
  const app=read('../dist/app.js');assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1,'Duel and Tavern share one voice call');assert.doesNotMatch(app,/new Audio\(|<audio/);
  assert.equal(localizeDuelOpponent(getDuelOpponent('veyra'),'en').name,'Veyra');assert.equal(getDuelOpponent('veyra').name,'ויירה');assert.equal(getDuelOpponent('veyra').gender,'f');
  for(const pool of Object.values(getDuelOpponent('veyra').dialoguePools))assert.equal(pool.length,0,'no generic quips');
  assert.equal(createDuelSession({seed:3,opponent:getDuelOpponent('veyra')}).game.players[1].archetype,'witch');
  assert.equal(VOICED_TAVERN_GUESTS.find(p=>p.nameKey==='veyra').archetype,'tavern-witch');
  assert.equal(createTavernMatch({seed:5,guests:['veyra']}).roster.filter(p=>p.nameKey==='veyra').length,1);
  // Her seat never takes a generic line (botLine returns nothing for any voiced guest).
  assert.match(app,/function botLine\(playerId,trigger\)\{const player=state\.players\.find\(p=>p\.id===playerId\);if\(isVoicedGuest\(player\)\)return null;/);
});

test('anti-repetition: never the same recording or the same words twice running',()=>{
  for(let seed=1;seed<=60;seed++){
    const random=seeded(seed),v=createVeyraController({random,now:()=>0});let last=null,lastRemark=null;
    for(let i=0;i<40;i++){
      const trigger=['round_win','round_loss','curse_taken','stop_given','own_good_move','player_good_move','match_win','match_loss','king','own_draw','player_draw'][Math.floor(random()*11)];
      const reaction=v.react(trigger,{locale:i%2?'he':'en',haul:true,forced:i%3===0},true);if(!reaction)continue;
      assert.notEqual(reaction.voice,last);assert.doesNotMatch(reaction.voice,/_he$/);
      if(reaction.category!=='result')assert.notEqual(reaction.remark,lastRemark);
      last=reaction.voice;lastRemark=reaction.remark;
    }
  }
});

test('more voice than Kesh, still well short of constant; her face reacts far more often than she speaks',()=>{
  const events=['player_good_move','own_good_move','player_draw','own_draw','stop_taken','curse_taken','player_neutral_move','own_move','own_move','player_neutral_move'];
  const toKesh={own_good_move:'kesh_good_move',own_draw:'kesh_draw',own_move:'kesh_move',stop_taken:'skip',curse_taken:'kesh_draw'},toRagna={own_good_move:'ragna_good_move',own_draw:'ragna_draw',own_move:'ragna_move',stop_taken:'player_neutral_move',curse_taken:'ragna_draw'};
  let v=0,k=0,r=0,vf=0,rounds=0;
  for(let seed=1;seed<=80;seed++){let clock=0;const veyra=createVeyraController({random:seeded(seed),now:()=>clock}),kesh=createKeshController({random:seeded(seed+500),now:()=>clock}),ragna=createRagnaController({random:seeded(seed+999),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;veyra.beginRound();kesh.beginRound();ragna.beginRound();
      for(let i=0;i<26;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0,ctx={big,forced:i%3===0,haul:big,longer:big,amount:big?4:2};
        if(veyra.observe(t,ctx))vf++;kesh.observe(toKesh[t]||t,ctx);ragna.observe(toRagna[t]||t,ctx);
        if(veyra.react(t,ctx))v++;if(kesh.react(toKesh[t]||t,ctx))k++;if(ragna.react(toRagna[t]||t,ctx))r++;}}}
  assert.ok(v>k,`Veyra ${v} > Kesh ${k}`);assert.ok(v<=r*1.25,`Veyra ${v} is no chattier than Ragna ${r} (+25%)`);
  assert.ok(v/rounds>=.5&&v/rounds<=2.2,`ordinary lines a round: ${(v/rounds).toFixed(2)}`);
  assert.ok(vf>v*3,`${vf} faces vs ${v} lines`);
});

test('player on one card: suddenly alert — one strong reaction, never a pile of them',()=>{
  let spoke=0;
  for(let seed=1;seed<=400;seed++){
    let clock=50000;const v=createVeyraController({random:seeded(seed),now:()=>clock});
    assert.ok(['player_one_card_alarm','player_one_card_connecting'].includes(v.observe('player_one_card').expression));
    const line=v.react('player_one_card');if(line){spoke++;assert.match(line.voice,/^veyra_player_one_card_0[1-4]$/);}
    assert.equal(v.snapshot().state,'watchful');
    clock+=1000;if(line)assert.equal(v.react('player_one_card',{persist:true}),null);
  }
  assert.ok(spoke>400*.5&&spoke<400*.72,`spoke ${spoke}/400`);
  assert.equal(ready().react('player_one_card',{playerStillToPlay:true}),null,'the player may go out right now: she only stares');
  // Her own last card: the pattern resolving; silent when she is about to go out anyway.
  assert.equal(ready().react('own_one_card',{ownTurn:true}),null);
  const own=ready().react('own_one_card');if(own)assert.match(own.voice,/^veyra_one_card_0[1-3]$/);
});

test('results: one line per hand from the right pool; match never stacks with round; "Unless losing was the sign" leans on failed signs',()=>{
  const pools={round_win:/^veyra_round_win_0[1-3]$/,round_loss:/^veyra_round_loss_0[1-3]$/,match_win:/^veyra_match_win_0[1-3]$/,match_loss:/^veyra_match_loss_0[1-3]$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createVeyraController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.priority,'CRITICAL');assert.equal(r.nextState,'result');}
  let missed=0,clean=0;for(let seed=1;seed<=400;seed++){if(createVeyraController({random:seeded(seed)}).react('match_loss',{missedThisMatch:true},true).voice==='veyra_match_loss_03')missed++;if(createVeyraController({random:seeded(seed)}).react('match_loss',{missedThisMatch:false},true).voice==='veyra_match_loss_03')clean++;}
  assert.ok(missed>400*.5,`a strong possible final beat after failed signs (${missed}/400)`);assert.ok(clean>400*.3,`and still common otherwise (${clean}/400)`);
  const app=read('../dist/app.js');
  assert.match(app,/else if\(isGenericDuel\(\)\)\{[\s\S]*?runCharacter\(finalDuel\?\(opponentWon\?'match_win':'match_loss'\):\(opponentWon\?'round_win':'round_loss'\)/);
  // A result line waits for a line in progress instead of cutting it off.
  assert.match(app,/if\(reaction\.category==='result'&&audioSystem\.voiceSource&&audioSystem\.voicePriority<VOICE_RANK\.CRITICAL\)/);
});

test('omens: presentation only — declared, remembered, landing or running out; each omen once a match',()=>{
  assert.deepEqual(VEYRA_OMEN_KINDS,['draw','red','turn','regret']);
  for(const kind of VEYRA_OMEN_KINDS){const id=VEYRA_OMEN_LINES[kind];const line=VEYRA_REACTIONS.find(item=>item.id===id);assert.ok(line.when({kind}));for(const other of VEYRA_OMEN_KINDS.filter(k=>k!==kind))assert.ok(!line.when({kind:other}),`${id} only for ${kind}`);}
  let clock=0;const book=createVeyraOmenBook({random:()=>0,now:()=>clock});
  assert.equal(book.wantsToDeclare({}),null,'not before the hand has started moving');
  for(let i=0;i<4;i++){book.tick();clock+=2500;}
  const kind=book.wantsToDeclare({});assert.ok(kind);book.declare(kind);assert.equal(book.active,kind);
  assert.equal(book.wantsToDeclare({}),null,'one omen at a time');
  // The very next card never counts: the table has to move on first.
  book.tick();clock+=800;assert.equal(book.observe({penalty:{amount:2},reverse:true,stackBack:true,kingBreak:true,painfulDraw:true,offColour:true,curserDraws:true,leadFlip:true}),null);
  for(let i=0;i<4;i++){book.tick();clock+=2500;}
  const hit=book.observe({penalty:{amount:2},reverse:true,stackBack:true,kingBreak:true,painfulDraw:true,offColour:true,curserDraws:true,leadFlip:true});assert.deepEqual(hit,{result:'hit',kind});
  assert.equal(book.active,null);assert.equal(book.story().hitThisMatch,true);
  // Running out: silence for the open window, then the miss.
  book.beginRound();for(let i=0;i<4;i++){book.tick();clock+=2500;}assert.equal(book.wantsToDeclare({}),null,'never in two hands running');
  book.beginRound();for(let i=0;i<4;i++){book.tick();clock+=2500;}const second=book.wantsToDeclare({});assert.ok(second&&second!==kind,'never the same omen twice in a match');book.declare(second);
  let out=null;for(let i=0;i<VEYRA_OMEN_TUNING.duel.expire&&!out;i++){book.tick();clock+=2500;out=book.observe({});}
  assert.deepEqual(out,{result:'miss',kind:second});assert.equal(book.story().missedThisMatch,true);
  // A hand that ends with the omen open: it lapses without a word.
  book.beginRound();book.beginRound();for(let i=0;i<4;i++){book.tick();clock+=2500;}const third=book.wantsToDeclare({});book.declare(third);book.endRound();assert.equal(book.active,null);
  book.beginRound();
  book.beginRound();for(let i=0;i<6;i++)book.tick();assert.equal(book.wantsToDeclare({}),null,'three a match at most');
  // Nothing in the game reads the book: no engine or AI module refers to omens.
  for(const file of ['../dist/game-engine/engine.js','../dist/game-engine/cards.js','../dist/game-ai/veteran.js','../dist/game-ai/bot.js'])assert.doesNotMatch(read(file),/omenBook|veyraOmen|VEYRA_OMEN/i);
});

test('omens are read generously but honestly — only from public facts',()=>{
  assert.ok(veyraOmenMatches('draw',{penalty:{amount:2}})&&veyraOmenMatches('draw',{painfulDraw:true})&&!veyraOmenMatches('draw',{}));
  assert.ok(veyraOmenMatches('red',{penalty:{amount:2},curseColor:'red'})&&veyraOmenMatches('red',{skip:true,cardColor:'red'})&&veyraOmenMatches('red',{offColour:true}));
  assert.ok(!veyraOmenMatches('red',{penalty:{amount:2},curseColor:'blue'})&&!veyraOmenMatches('red',{skip:true,cardColor:'green'}));
  assert.ok(veyraOmenMatches('turn',{reverse:true})&&veyraOmenMatches('turn',{leadFlip:true})&&veyraOmenMatches('turn',{kingBreak:true}));
  assert.ok(veyraOmenMatches('regret',{stackBack:true})&&veyraOmenMatches('regret',{curserDraws:true})&&!veyraOmenMatches('regret',{reverse:true}));
  const e=veyraOmenEvent({draw:{playerId:'p0'},counts:{p0:3,p1:4},previousCounts:{p0:2,p1:4},activeColor:'red',cursers:['p0']});
  assert.ok(e.painfulDraw&&e.offColour&&e.curserDraws);
  assert.equal(veyraOmenEvent({mode:'tavern',draw:{playerId:'p0'},counts:{p0:3,p1:4,p2:5,p3:6},previousCounts:{p0:2,p1:4,p2:5,p3:6}}).painfulDraw,false,'a busy table needs a little more');
  assert.ok(veyraOmenEvent({counts:{p0:5,p1:2},previousCounts:{p0:3,p1:5}}).leadFlip);
});

test('omen frequency: noticeable and recurring, not constant; she is wrong about as often as she is right',t=>{
  freezeThinkClock(t);
  const savedRandom=Math.random;Math.random=seeded(20261007);
  try{
    for(const mode of ['duel','tavern']){
      let declared=0,hit=0,missOrLapse=0;const matches=mode==='duel'?60:40;
      for(let m=0;m<matches;m++){let clock=0;const book=createVeyraOmenBook({mode,random:seeded(m+1),now:()=>clock});
        for(let r=0;r<5;r++){book.beginRound();const n=mode==='duel'?2:4,arch=mode==='duel'?['scholar','witch']:['scholar','tavern-witch','mercenary','hunter'];
          let s=createInitialState({playerCount:n,seed:m*977+r*31+1,players:arch.map((a,i)=>({id:`p${i}`,name:a,kind:'ai',archetype:a}))});const cursers=new Set();
          for(let i=0;i<3000&&s.phase==='playing';i++){
            const previousCounts=Object.fromEntries(s.players.map(p=>[p.id,p.hand.length])),penaltyBefore=!!s.activePenalty,len=s.log.length;
            s=applyAction(s,chooseBotAction(s));const entries=s.log.slice(len),find=t=>entries.find(e=>e.type===t);
            const played=entries.findLast(e=>e.type==='play'),playedCard=played?s.discardPile.find(c=>c.id===played.cardId):null,stack=find('plus2'),penalty=find('drawPenalty'),draw=find('draw');
            if(stack&&played)cursers.add(played.playerId);
            if(played||draw||penalty){book.tick();clock+=2600;}
            const out=book.observe(veyraOmenEvent({mode,played,playedCard,stop:find('stop'),stack,penalty,draw,reverse:find('reverse'),closed:find('takiClosed'),topColor:s.discardPile.at(-1)?.color,activeColor:s.activeColor,counts:Object.fromEntries(s.players.map(p=>[p.id,p.hand.length])),previousCounts,penaltyBefore,cursers:[...cursers]}));
            if(out?.result==='hit')hit++;else if(out)missOrLapse++;
            if((played||draw)&&s.phase==='playing'){const k=book.wantsToDeclare({activeColor:s.activeColor,tension:s.players.some(p=>p.hand.length<=1)});if(k){book.declare(k);declared++;}}
          }
          if(book.active)missOrLapse++;book.endRound();
        }}
      const perMatch=declared/matches,rate=hit/Math.max(1,declared);
      assert.ok(perMatch>=1&&perMatch<=(mode==='duel'?3:2),`${mode}: ${perMatch.toFixed(2)} omens a match`);
      assert.ok(rate>.3&&rate<.72,`${mode}: ${(100*rate).toFixed(0)}% of omens land`);
      assert.equal(hit+missOrLapse,declared);
    }
  }finally{Math.random=savedRandom;}
});

test('the Duel classifier names moments from her side; bones and flame only where the line is about them',()=>{
  const base={humanCount:5,ownCount:5,oldHuman:5,oldOwn:5};
  assert.deepEqual(duelEventFor({...base,humanCount:1,oldHuman:2,played:{playerId:'p0'}}),['player_one_card',{}]);
  assert.deepEqual(duelEventFor({...base,ownCount:1,oldOwn:2,played:{playerId:'p1'}}),['own_one_card',{}]);
  assert.equal(duelEventFor({...base,penalty:{playerId:'p1',amount:2}})[0],'curse_taken');
  assert.equal(duelEventFor({...base,penalty:{playerId:'p1',amount:4}})[0],'own_draw');
  assert.equal(duelEventFor({...base,penalty:{playerId:'p0',amount:2}})[0],'curse_landed');
  assert.equal(duelEventFor({...base,stop:{skipped:'p1'},played:{playerId:'p0'},playedCard:{type:'stop'}})[0],'stop_taken');
  assert.equal(duelEventFor({...base,stop:{skipped:'p0'},played:{playerId:'p1'},playedCard:{type:'stop'}})[0],'stop_given');
  assert.deepEqual(duelEventFor({...base,played:{playerId:'p0'},playedCard:{type:'king'},cursedBefore:true}),['king',{own:false,broke:true}]);
  // Props follow the words: the candle for the flame lines, the bones for the bone lines.
  const pose=id=>VEYRA_REACTIONS.find(item=>item.id===id).expression;
  assert.equal(pose('idle_03'),'idle_flame_stop');assert.equal(pose('intro_04'),'intro_fire_unfriendly');assert.equal(pose('omen_02'),'omen_watching_flame');
  assert.equal(pose('idle_04'),'idle_bones_make_up_minds');assert.equal(pose('omen_01'),'omen_reading_bones');assert.equal(pose('omen_hit_04'),'omen_hit_smug');assert.equal(pose('player_one_card_02'),'player_one_card_bones');assert.equal(pose('match_loss_01'),'match_loss_bones_explain');
  // The loudest poses are reserved for omens that land; she is not frantic all the time.
  for(const item of VEYRA_REACTIONS.filter(r=>['omen_hit_exploding','omen_hit_pointing'].includes(r.expression)))assert.equal(item.trigger,'omen_hit');
  assert.ok(!VEYRA_STATES.includes('panic'));
  // No glow, particle or animation is attached to her props.
  assert.doesNotMatch(read('../dist/styles.css'),/veyra[^{]*\{[^}]*(glow|animation)/i);
});

test('banter with Kesh, Ragna and Edrin: authored sequences, each one performance, in authored order',()=>{
  const byId=Object.fromEntries(TAVERN_BANTER.map(b=>[b.id,b]));
  assert.deepEqual(byId.veyra_kesh_flame.lines.map(l=>l[1]),['veyra_banter_kesh_01a','kesh_banter_veyra_01b','veyra_banter_kesh_01c']);
  assert.deepEqual(byId.veyra_kesh_screaming.lines.map(l=>l[1]),['kesh_banter_veyra_02a','veyra_banter_kesh_02b','kesh_banter_veyra_02c']);
  assert.deepEqual(byId.veyra_ragna_focus.lines.map(l=>l[1]),['veyra_banter_ragna_01a','ragna_banter_veyra_01d'],'the Ragna exchange stays two lines');
  assert.deepEqual(byId.veyra_edrin_signs.lines.map(l=>l[1]),['veyra_banter_edrin_01a','edrin_banter_veyra_01b','veyra_banter_edrin_01c']);
  for(const b of TAVERN_BANTER.filter(item=>item.id.startsWith('veyra_')))for(const [guest,voice] of b.lines)for(const locale of ['en','he']){const v=resolveCharacterVoice(voice,locale);assert.ok(v,`${voice} ${locale}`);assert.ok(fs.statSync(new URL(v.src)).size>1024);assert.match(v.src,new RegExp(`/assets/${guest}/voice/`));}
  // The whole exchange plays as one plan, and nothing else speaks while it runs.
  let clock=1e6;const d=createTavernDirector({seats:{p1:'veyra',p2:'kesh'},random:()=>0,now:()=>clock});for(let i=0;i<5;i++)d.event('move',{actor:'p0'});
  const plan=d.event('idle',{current:'p0'});assert.equal(plan.banter,'veyra_kesh_flame');assert.equal(plan.lines.length,3);assert.deepEqual(plan.lines.map(l=>l.seat),['p1','p2','p1']);
  assert.ok(plan.lines.slice(1).every(l=>l.pause>=300&&l.pause<=1600),'small natural pauses');
  assert.equal(d.event('one_card',{actor:'p0',busy:true}).lines.length,0);
  // "...and then the King appeared." follows a King.
  clock+=1e5;const e=createTavernDirector({seats:{p1:'veyra',p2:'edrin'},random:()=>0,now:()=>clock});for(let i=0;i<5;i++)e.event('move',{actor:'p0'});assert.equal(e.event('king',{actor:'p0'}).banter,'veyra_edrin_signs');
  const app=read('../dist/app.js');assert.match(app,/function performGuestLines\(lines/);assert.match(app,/if\(index>=lines\.length\)\{guests\.speaking=false;/);
});

test('her AI is fair: identical choices whatever the hidden cards are',t=>{
  freezeThinkClock(t);
  let checked=0;
  for(let seed=1;seed<=12;seed++){
    let state=createInitialState({playerCount:2,seed:seed*733,players:[{id:'p0',name:'You',kind:'human',archetype:'wanderer'},{id:'p1',name:'Veyra',kind:'ai',archetype:'witch'}]});
    for(let step=0;step<200&&state.phase==='playing';step++){
      if(currentPlayer(state).id==='p1'){
        const decide=s=>chooseVeteranAction(s,{random:seeded(seed*17+step),profile:CONTROL_PROFILE});
        const original=decide(state),swapped=structuredClone(state),hidden=[...swapped.players[0].hand,...swapped.drawPile].reverse();
        swapped.players[0].hand=hidden.slice(0,swapped.players[0].hand.length);swapped.drawPile=hidden.slice(swapped.players[0].hand.length);
        assert.deepEqual(decide(swapped),original,`seed ${seed} step ${step}`);checked++;
      }
      state=applyAction(state,chooseBotAction(state));
    }
  }
  assert.ok(checked>60);
});

test('her AI is control, competent and beatable: she keeps her answers for the moment that needs them',t=>{
  freezeThinkClock(t);const savedRandom=Math.random;Math.random=seeded(20261007);t.after(()=>{Math.random=savedRandom;});
  let wins=0,games=0;
  for(let seed=1;seed<=100;seed++){
    const opponent=seed%2?'mercenary':'hunter',first=seed%4<2,players=[{id:'p0',name:'A',kind:'ai',archetype:first?'witch':opponent},{id:'p1',name:'B',kind:'ai',archetype:first?opponent:'witch'}];
    let s=createInitialState({playerCount:2,seed:seed*389,players});
    for(let i=0;i<2500&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));
    assert.equal(s.phase,'finished');games++;if(s.winnerId===(first?'p0':'p1'))wins++;
  }
  assert.ok(wins/games>.38&&wins/games<.7,`Veyra wins ${(100*wins/games).toFixed(1)}%`);
  assert.ok(CONTROL_PROFILE.holdStop>0&&CONTROL_PROFILE.disrupt>0&&CONTROL_PROFILE.redirect>0,'holds a Shield, disrupts a short hand, turns the order at a busy table');
  assert.ok(CONTROL_PROFILE.holdCurse>VETERAN_PROFILE.holdCurse&&CONTROL_PROFILE.curseDanger>VETERAN_PROFILE.curseDanger,'keeps the Curse for when it matters, then uses it hard');
  assert.ok(CONTROL_PROFILE.mistakeRate<=.06,'never sloppy: her chaos is not in her cards');
  assert.equal(TAVERN_CONTROL_PROFILE.samples,0);
});
