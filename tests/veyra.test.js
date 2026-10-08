import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { VEYRA_CRITICAL_EXPRESSIONS, VEYRA_ENGLISH_ONLY, VEYRA_EXPRESSIONS, VEYRA_ORDINARY_PER_MATCH, VEYRA_REACTIONS, VEYRA_RETIRED, VEYRA_SCRIPT, VEYRA_STATES, VEYRA_TIMING, VEYRA_VOICE_LIBRARY, VEYRA_VOICE_TRIM, createVeyraController, resolveVeyraReaction, resolveVeyraVoice, veyraExpressionURL } from '../dist/duel/veyra.js';
import * as veyraModule from '../dist/duel/veyra.js';
import { createRagnaController } from '../dist/duel/ragna.js';
import { createKeshController } from '../dist/duel/kesh.js';
import { duelEventFor } from '../dist/duel/authored-pack.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, resolveCharacterVoice } from '../dist/duel/characters.js';
import { BANTER_RECORDINGS } from '../dist/duel/banter.js';
import { TAVERN_BANTER, TAVERN_GUEST_POOLS, TAVERN_GUEST_TALK, allTavernVoices, createTavernDirector } from '../dist/duel/tavern-director.js';
import { getDuelOpponent, localizeDuelOpponent } from '../dist/duel/opponents.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { CONTROL_PROFILE, TAVERN_CONTROL_PROFILE, VETERAN_PROFILE, chooseVeteranAction } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { VOICED_TAVERN_GUESTS, createDuelSession, createTavernMatch } from '../dist/game-engine/match.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const freezeThinkClock=t=>{const saved=globalThis.performance.now;globalThis.performance.now=()=>0;t.after(()=>{globalThis.performance.now=saved;});};
const seeded=seed=>mulberry32(seed);
const ready=(clock=()=>60000,random=()=>0)=>{const v=createVeyraController({random,now:clock});for(let i=0;i<6;i++)v.observe('own_move');return v;};
const KEPT=['intro_02','intro_03','intro_04','player_good_move_01','player_good_move_02','good_move_01','good_move_02','player_draw_01','player_draw_02','draw_02','player_one_card_01','player_one_card_04','one_card_01','one_card_03','curse_01','curse_02','stop_01','king_02','round_win_02','round_loss_01','round_loss_02','match_win_02','match_win_03','match_loss_02'];
const TRIGGERS=['intro','player_good_move','own_good_move','player_draw','own_draw','player_one_card','own_one_card','curse_taken','curse_landed','stop_given','stop_taken','king','reverse','idle_quiet','slow_player','round_win','round_loss','match_win','match_loss','omen','omen_hit','omen_miss'];

test('Veyra 2.0 registers her curated lines, all 26 new poses and every delivered voice file; nothing retired ships',()=>{
  assert.deepEqual(Object.keys(VEYRA_SCRIPT).toSorted(),KEPT.toSorted());
  assert.equal(VEYRA_REACTIONS.length,KEPT.length);assert.equal(Object.keys(VEYRA_VOICE_LIBRARY).length,KEPT.length);assert.equal(VEYRA_EXPRESSIONS.length,26);
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
  // 24 lines (two English-only) + her kept banter: 3 with Hebrew takes, 14 English-only.
  const banterFiles=Object.values(BANTER_RECORDINGS).filter(r=>r.speaker==='veyra').reduce((n,r)=>n+r.takes.length,0);
  assert.equal(files.length,KEPT.length*2-2+banterFiles);assert.ok(files.every(name=>name.endsWith('.mp3')));
  for(const voice of VEYRA_RETIRED){assert.ok(!files.includes(`${voice}.mp3`)&&!files.includes(`${voice}_he.mp3`),`${voice} is archived, not shipped`);assert.ok(!VEYRA_VOICE_LIBRARY[voice]);}
  for(const deleted of ['veyra_reverse_01','veyra_reverse_02','veyra_king_01','veyra_intro_02_he','veyra_player_good_move_01_he'])assert.ok(!files.includes(`${deleted}.mp3`),`${deleted} stays deleted`);
  const art=fs.readdirSync(new URL('../dist/assets/veyra/expressions/',import.meta.url));assert.equal(art.length,26,'only the new pack ships');
  for(const expression of VEYRA_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(veyraExpressionURL(expression)));const vp8x=bytes.indexOf('VP8X');assert.equal(bytes.subarray(8,12).toString(),'WEBP');const w=1+bytes.readUIntLE(vp8x+12,3),h=1+bytes.readUIntLE(vp8x+15,3);assert.deepEqual([w,h],[640,640],`${expression} shares the anchored canvas`);}
  for(const name of VEYRA_CRITICAL_EXPRESSIONS)assert.ok(VEYRA_EXPRESSIONS.includes(name));
  assert.equal(AUTHORED_CHARACTERS.veyra.defaultExpression,'default');
});

test('every new pose is reachable in play (Duel, Tavern or banter), and no old pose name survives anywhere',()=>{
  const sources=read('../dist/duel/veyra.js').replace(/export const VEYRA_EXPRESSION_FILES=[\s\S]*?\}\);/,'').replace(/export const VEYRA_CRITICAL_EXPRESSIONS=[^\n]*/,'')+read('../dist/duel/tavern-director.js')+read('../dist/duel/banter.js')+read('../dist/duel/characters.js');
  for(const expression of VEYRA_EXPRESSIONS)assert.ok(sources.includes(`'${expression}'`),`${expression} is never shown`);
  const all=read('../dist/duel/tavern-director.js')+read('../dist/duel/banter.js')+read('../dist/app.js')+read('../dist/duel/characters.js');
  for(const old of ['default_observant\',\'intro_something_wrong','omen_hit_pointing','omen_hit_exploding','omen_uneasy','omen_sudden_certainty','omen_miss_rationalizing','banter_kesh_correcting','banter_edrin_exasperated','idle_means_something','king_suspicious','curse_offended','draw_no_no_no','intro_bones','banter_ragna_flame'])assert.ok(!all.includes(old),`${old} is gone`);
  // The Tavern faces for Veyra are all real new poses.
  const director=read('../dist/duel/tavern-director.js'),faces=director.match(/  veyra:\{own_draw:[^\n]*/)[0];for(const name of faces.match(/'([a-z_]+)'/g).map(x=>x.slice(1,-1)))assert.ok(VEYRA_EXPRESSIONS.includes(name),name);
  for(const voice of Object.keys(BANTER_RECORDINGS).filter(v=>BANTER_RECORDINGS[v].speaker==='veyra'))assert.ok(VEYRA_EXPRESSIONS.includes(BANTER_RECORDINGS[voice].expression),voice);
});

test('bubbles: the exact authored text, acting directions removed, Hebrew untouched; one reaction id, two languages',()=>{
  const samples=[['intro_03','Oh. This will be interesting.','או. זה הולך להיות מעניין.'],['player_draw_01','There it is.','התחלנו..'],['curse_01','That is not a proper curse.','זאת לא קללה אמיתית.'],['king_02',"I don't trust crowns.",'אני לא סומכת על כתרים.'],['match_loss_02','I was completely wrong.','טעיתי לגמרי.'],['player_good_move_02','I did not see that.','את זה לא ראיתי.'],['match_win_02','I knew it.','ידעתי.']];
  for(const [id,en,he] of samples){const base=VEYRA_REACTIONS.find(item=>item.id===id);assert.equal(resolveVeyraReaction(base,'en').caption,en);assert.equal(resolveVeyraReaction(base,'he').caption,he);assert.equal(resolveVeyraReaction(base,'he').id,id);}
  for(const line of Object.values(VEYRA_SCRIPT))for(const text of [line.en,line.he].filter(Boolean)){assert.doesNotMatch(text,/\[|\]|`/);assert.ok(text.length>0);}
  for(const item of Object.values(BANTER_RECORDINGS))for(const text of Object.values(item.captions))assert.doesNotMatch(text,/\[|\]|`/);
});

test('English-only lines are simply left out in Hebrew — never replaced by the English take',()=>{
  for(let seed=1;seed<=200;seed++){
    const intro=createVeyraController({random:seeded(seed),now:()=>0}).react('intro',{locale:'he',firstEncounter:true},true);assert.ok(intro);assert.notEqual(intro.voice,'veyra_intro_02');
    const good=createVeyraController({random:seeded(seed),now:()=>0}).react('player_good_move',{locale:'he'},true);if(good)assert.notEqual(good.voice,'veyra_player_good_move_01');
  }
  let heard=false;for(let seed=1;seed<=200&&!heard;seed++)heard=createVeyraController({random:seeded(seed),now:()=>0}).react('intro',{locale:'en',firstEncounter:true},true).voice==='veyra_intro_02';
  assert.ok(heard,'in English the line is part of her intro pool');
  assert.equal(resolveCharacterVoice('veyra_intro_02','he'),null,'the shared voice path finds no Hebrew take either');
  for(let seed=1;seed<=60;seed++){let clock=1e6;const d=createTavernDirector({seats:{p2:'veyra'},random:seeded(seed),now:()=>clock,locale:()=>'he'});const plan=d.event('intro',{});for(const line of plan.lines)assert.ok(!VEYRA_ENGLISH_ONLY.includes(line.voice));}
});

test('one framework: Veyra plugs into the shared registry, the shared controller and the single voice path',()=>{
  assert.ok(VOICED_OPPONENTS.includes('veyra'));assert.equal(AUTHORED_CHARACTERS.veyra.generic,true);assert.equal(AUTHORED_CHARACTERS.veyra.omens,undefined);
  assert.match(read('../dist/duel/veyra.js'),/createAuthoredController\(VEYRA_SPEC/);
  const app=read('../dist/app.js');assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1,'Duel and Tavern share one voice call');assert.doesNotMatch(app,/new Audio\(|<audio/);
  assert.equal(localizeDuelOpponent(getDuelOpponent('veyra'),'en').name,'Veyra');assert.equal(getDuelOpponent('veyra').name,'ויירה');assert.equal(getDuelOpponent('veyra').gender,'f');
  assert.doesNotMatch(localizeDuelOpponent(getDuelOpponent('veyra'),'en').descriptor,/omen/i);
  for(const pool of Object.values(getDuelOpponent('veyra').dialoguePools))assert.equal(pool.length,0,'no generic quips');
  assert.equal(createDuelSession({seed:3,opponent:getDuelOpponent('veyra')}).game.players[1].archetype,'witch');
  assert.equal(VOICED_TAVERN_GUESTS.find(p=>p.nameKey==='veyra').archetype,'tavern-witch');
  assert.equal(createTavernMatch({seed:5,guests:['veyra']}).roster.filter(p=>p.nameKey==='veyra').length,1);
  assert.match(app,/function botLine\(playerId,trigger\)\{const player=state\.players\.find\(p=>p\.id===playerId\);if\(isVoicedGuest\(player\)\)return null;/);
});

test('the omen system is gone — no book, no state, no timers, no lines, no faces, no debug hooks',()=>{
  for(const name of ['createVeyraOmenBook','veyraOmenEvent','veyraOmenMatches','VEYRA_OMEN_KINDS','VEYRA_OMEN_LINES','VEYRA_OMEN_TUNING'])assert.equal(veyraModule[name],undefined,`${name} no longer exists`);
  const app=read('../dist/app.js');
  for(const gone of ['veyraOmens','omenOutcome','deliverVeyraHit','retryVeyraHit','veyraPendingHit','observeVeyraOmen','maybeDeclareVeyraOmen','veyraCursers','declareOmen','simulateOmenHit','simulateOmenMiss','session.veyraOmens'])assert.ok(!app.includes(gone),`${gone} is removed from app.js`);
  const director=read('../dist/duel/tavern-director.js');for(const gone of ['omen_declare','omen_hit','omen_miss','OMEN_FAMILY','uncapped','veyra_omen'])assert.ok(!director.includes(gone),`${gone} is removed from the Tavern director`);
  // Nothing in the game carries an omen line of hers: no script entry, no pool, no banter, no voice file.
  for(const where of ['../dist/duel/veyra.js','../dist/duel/banter.js','../dist/duel/tavern-director.js','../dist/app.js','../dist/duel/characters.js'])assert.doesNotMatch(read(where).replace(/export const VEYRA_RETIRED=[\s\S]*?\]\.map[^;]*;/,''),/veyra_omen|'omen_(hit|miss)?_0\d'|I TOLD YOU/,where);
  const everything=Object.values(TAVERN_GUEST_POOLS.veyra).flat().concat(TAVERN_BANTER.flatMap(b=>b.lines.map(([,voice])=>voice)),allTavernVoices('veyra'));
  assert.ok(!everything.some(voice=>/^veyra_omen/.test(voice)));
  assert.ok(!fs.readdirSync(new URL('../dist/assets/veyra/voice/',import.meta.url)).some(name=>name.startsWith('veyra_omen')));
  // Kesh's own stone tell is a separate system and stays.
  assert.ok(TAVERN_GUEST_POOLS.kesh.omen.length===3);
});

test('retired lines can never be selected — Duel, Tavern or banter, in either language',()=>{
  const retired=new Set(VEYRA_RETIRED);
  for(let seed=1;seed<=120;seed++){let clock=0;const v=createVeyraController({random:seeded(seed),now:()=>clock});
    for(const trigger of TRIGGERS)for(const locale of ['en','he']){clock+=20000;const r=v.react(trigger,{locale,haul:true,big:true,forced:true,firstEncounter:seed%2===0},true);if(r)assert.ok(!retired.has(r.voice),`${r.voice} (${trigger})`);}
  }
  for(const voice of Object.values(TAVERN_GUEST_POOLS.veyra).flat())assert.ok(!retired.has(voice),voice);
  for(const b of TAVERN_BANTER)for(const [,voice] of b.lines)assert.ok(!retired.has(voice),`${b.id}: ${voice}`);
  for(const voice of retired)assert.equal(resolveCharacterVoice(voice,'en'),null,`${voice} resolves to nothing`);
});

test('anti-repetition: never the same recording or the same words twice running',()=>{
  for(let seed=1;seed<=60;seed++){
    const random=seeded(seed),v=createVeyraController({random,now:()=>0});let last=null,lastRemark=null;
    for(let i=0;i<40;i++){
      const trigger=['round_loss','curse_taken','stop_given','own_good_move','player_good_move','match_win','king','player_draw','own_one_card','player_one_card'][Math.floor(random()*10)];
      const reaction=v.react(trigger,{locale:i%2?'he':'en',haul:true,forced:i%3===0},true);if(!reaction)continue;
      assert.notEqual(reaction.voice,last);assert.doesNotMatch(reaction.voice,/_he$/);
      if(reaction.category!=='result')assert.notEqual(reaction.remark,lastRemark);
      last=reaction.voice;lastRemark=reaction.remark;
    }
  }
});

test('she speaks less than before: responsive, not demanding; silent looks are common',()=>{
  assert.ok(VEYRA_TIMING.casualGap>=11000&&VEYRA_TIMING.casualEvents>=3&&VEYRA_ORDINARY_PER_MATCH<=8);
  const events=['player_good_move','own_good_move','player_draw','own_draw','stop_taken','curse_taken','curse_landed','king','player_neutral_move','own_move','own_move','player_neutral_move'];
  const toKesh={own_good_move:'kesh_good_move',own_draw:'kesh_draw',own_move:'kesh_move',stop_taken:'skip',curse_taken:'kesh_draw',curse_landed:'curse'},toRagna={own_good_move:'ragna_good_move',own_draw:'ragna_draw',own_move:'ragna_move',stop_taken:'player_neutral_move',curse_taken:'ragna_draw',curse_landed:'player_draw'};
  let v=0,r=0,k=0,vf=0,rounds=0,maxMatch=0;
  for(let seed=1;seed<=80;seed++){let clock=0,match=0;const veyra=createVeyraController({random:seeded(seed),now:()=>clock}),ragna=createRagnaController({random:seeded(seed+999),now:()=>clock}),kesh=createKeshController({random:seeded(seed+500),now:()=>clock});
    for(let round=0;round<5;round++){rounds++;veyra.beginRound();ragna.beginRound();kesh.beginRound();
      for(let i=0;i<30;i++){clock+=3500;const t=events[Math.floor(((seed*31+i*7+round*13)%97)/97*events.length)],big=i%5===0,ctx={big,forced:i%3===0,haul:big,longer:big,amount:big?4:2,own:false};
        if(veyra.observe(t,ctx))vf++;ragna.observe(toRagna[t]||t,ctx);kesh.observe(toKesh[t]||t,ctx);
        if(veyra.react(t,ctx)){v++;match++;}if(ragna.react(toRagna[t]||t,ctx))r++;if(kesh.react(toKesh[t]||t,ctx))k++;}}
    maxMatch=Math.max(maxMatch,match);}
  assert.ok(v<r,`Veyra ${v} is quieter than Ragna ${r}`);
  assert.ok(v/rounds>=.3&&v/rounds<=VEYRA_ORDINARY_PER_MATCH/5+.05,`ordinary lines a round: ${(v/rounds).toFixed(2)}`);
  assert.ok(maxMatch<=VEYRA_ORDINARY_PER_MATCH,`never more than ${VEYRA_ORDINARY_PER_MATCH} ordinary remarks a match (${maxMatch})`);
  assert.ok(vf>v*4,`${vf} faces vs ${v} lines`);
  // At a Tavern table she is one of the quieter guests (Edrin .6 … Bramm 1.15).
  assert.ok(TAVERN_GUEST_TALK.veyra>TAVERN_GUEST_TALK.edrin&&TAVERN_GUEST_TALK.veyra<TAVERN_GUEST_TALK.bramm);
});

test('player on one card: alert and focused — one reaction at most, often only a look',()=>{
  let spoke=0;
  for(let seed=1;seed<=400;seed++){
    let clock=50000;const v=createVeyraController({random:seeded(seed),now:()=>clock});
    assert.ok(['player_one_card','silent_thinking'].includes(v.observe('player_one_card').expression));
    const line=v.react('player_one_card');if(line){spoke++;assert.match(line.voice,/^veyra_player_one_card_0[14]$/);}
    assert.equal(v.snapshot().state,'watchful');
    clock+=1000;if(line)assert.equal(v.react('player_one_card',{persist:true}),null);
  }
  assert.ok(spoke>400*.3&&spoke<400*.6,`spoke ${spoke}/400`);
  assert.equal(ready().react('player_one_card',{playerStillToPlay:true}),null,'the player may go out right now: she only watches');
  assert.equal(ready().react('own_one_card',{ownTurn:true}),null);
  const own=ready().react('own_one_card');if(own)assert.match(own.voice,/^veyra_one_card_0[13]$/);
});

test('results: from the right pool; a round may pass with only a look; a match always gets its line',()=>{
  const pools={round_win:/^veyra_round_win_02$/,round_loss:/^veyra_round_loss_0[12]$/,match_win:/^veyra_match_win_0[23]$/,match_loss:/^veyra_match_loss_02$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let seed=1;seed<=30;seed++){const r=createVeyraController({random:seeded(seed)}).react(trigger,{},true);assert.match(r.voice,pattern);assert.equal(r.priority,'CRITICAL');assert.equal(r.nextState,'result');}
  const pack=AUTHORED_CHARACTERS.veyra;assert.ok(pack.resultVoiceChance('round_win')<1&&pack.resultVoiceChance('round_loss')<1);assert.equal(pack.resultVoiceChance('match_win'),1);assert.equal(pack.resultVoiceChance('match_loss'),1);
  for(const face of Object.values(pack.resultFaces))assert.ok(VEYRA_EXPRESSIONS.includes(face));
  const app=read('../dist/app.js');
  assert.match(app,/if\(resultSpeaks\(pack,trigger\)\)runCharacter\(trigger,/);assert.match(app,/characterController\.setState\('result'\);setCharacterExpression\(pack\.resultFaces/);
  assert.equal(AUTHORED_CHARACTERS.gorvan.resultVoiceChance,undefined,'Gorvan is unchanged');
  assert.match(app,/if\(reaction\.category==='result'&&audioSystem\.voiceSource&&audioSystem\.voicePriority<VOICE_RANK\.CRITICAL\)/);
});

test('the Duel classifier names moments from her side; her lines land on fitting faces',()=>{
  const base={humanCount:5,ownCount:5,oldHuman:5,oldOwn:5};
  assert.deepEqual(duelEventFor({...base,humanCount:1,oldHuman:2,played:{playerId:'p0'}}),['player_one_card',{}]);
  assert.equal(duelEventFor({...base,penalty:{playerId:'p1',amount:2}})[0],'curse_taken');
  assert.equal(duelEventFor({...base,penalty:{playerId:'p0',amount:2}})[0],'curse_landed');
  const pose=id=>VEYRA_REACTIONS.find(item=>item.id===id).expression;
  assert.equal(pose('curse_01'),'curse_disapproval');assert.equal(pose('king_02'),'king_skeptical');assert.equal(pose('stop_01'),'stop_pleased');assert.equal(pose('intro_03'),'intro_intrigued');
  assert.equal(pose('player_good_move_02'),'surprised');assert.equal(pose('draw_02'),'draw_considering');assert.equal(pose('player_one_card_01'),'player_one_card');assert.equal(pose('match_loss_02'),'match_loss');
  // Her resting face is comfortable and self-assured; no frantic state exists.
  assert.ok(!VEYRA_STATES.includes('panic'));assert.equal(createVeyraController().defaultExpression(),'default');
  assert.doesNotMatch(read('../dist/styles.css'),/veyra[^{]*\{[^}]*(glow|animation)/i);
});

test('banter: the funny exchanges stay, the omen-era ones are retired; each is one performance in authored order',()=>{
  const byId=Object.fromEntries(TAVERN_BANTER.map(b=>[b.id,b]));
  for(const gone of ['veyra_kesh_screaming','veyra_edrin_signs','gorvan_veyra_signs','veyra_ragna_followed'])assert.equal(byId[gone],undefined,`${gone} is retired`);
  for(const voice of ['kesh_banter_veyra_02a','veyra_banter_kesh_02b','kesh_banter_veyra_02c','veyra_banter_edrin_01a','edrin_banter_veyra_01b','veyra_banter_edrin_01c','veyra_banter_gorvan_01a','veyra_banter_ragna_03a','ragna_banter_veyra_03b','veyra_banter_ragna_03e'])assert.equal(BANTER_RECORDINGS[voice],undefined,`${voice} is not part of any exchange`);
  assert.deepEqual(byId.veyra_kesh_flame.lines.map(l=>l[1]),['veyra_banter_kesh_01a','kesh_banter_veyra_01b','veyra_banter_kesh_01c']);
  assert.deepEqual(byId.veyra_ragna_focus.lines.map(l=>l[1]),['veyra_banter_ragna_01a','ragna_banter_veyra_01d'],'the Ragna exchange stays two lines');
  for(const kept of ['veyra_ragna_sacred','veyra_edrin_bones','veyra_bramm_warning','veyra_bramm_destiny','bramm_veyra_cursed_table','gorvan_veyra_flame','gorvan_veyra_shadow','gorvan_veyra_seven','veyra_gorvan_prophecy','vampire_concern'])assert.ok(byId[kept],kept);
  // Every exchange she is in plays complete: every line resolves for its audio policy, never half voiced.
  for(const b of TAVERN_BANTER.filter(item=>item.lines.some(([guest])=>guest==='veyra')))for(const [guest,voice] of b.lines){
    for(const locale of b.audio==='all'?['en','he']:['en']){const v=resolveCharacterVoice(voice,locale);assert.ok(v,`${voice} ${locale}`);assert.ok(fs.statSync(new URL(v.src)).size>1024);assert.match(v.src,new RegExp(`/assets/${guest}/voice/`));}
    if(b.audio==='en'&&BANTER_RECORDINGS[voice])assert.equal(resolveCharacterVoice(voice,'he'),null,`${voice}: no Hebrew take`);
  }
  // Gorvan's conversations stay English audio only: in Hebrew they are text, every line silent.
  for(const b of TAVERN_BANTER.filter(item=>item.lines.some(([guest])=>guest==='gorvan')&&item.lines.some(([guest])=>guest==='veyra'))){
    assert.equal(b.audio,'en',b.id);
    let clock=1e6;const seats=Object.fromEntries([...new Set(b.lines.map(([g])=>g))].map((g,i)=>[`p${i+1}`,g]));const d=createTavernDirector({seats,random:()=>0,now:()=>clock,locale:()=>'he'});const plan=d.forceBanter(b.id);
    assert.ok(plan.lines.every(line=>line.silent),`${b.id}: no Hebrew audio, no English fallback`);
  }
  let clock=1e6;const d=createTavernDirector({seats:{p1:'veyra',p2:'kesh'},random:()=>0,now:()=>clock});for(let i=0;i<5;i++)d.event('move',{actor:'p0'});
  const plan=d.event('idle',{current:'p0'});assert.equal(plan.banter,'veyra_kesh_flame');assert.equal(plan.lines.length,3);assert.deepEqual(plan.lines.map(l=>l.seat),['p1','p2','p1']);
  assert.equal(d.event('one_card',{actor:'p0',busy:true}).lines.length,0);
  const app=read('../dist/app.js');assert.match(app,/function performGuestLines\(lines/);assert.match(app,/if\(index>=lines\.length\)\{guests\.speaking=false;/);
});

test('loud kept takes are trimmed on the one voice path; the recordings themselves are untouched',()=>{
  for(const [take,gain] of Object.entries(VEYRA_VOICE_TRIM)){assert.ok(gain>0&&gain<1,take);const voice=take.replace(/_he$/,''),locale=take.endsWith('_he')?'he':'en';const r=resolveCharacterVoice(voice,locale);assert.ok(r,`${take} is a kept take`);assert.equal(r.gain,gain);}
  assert.equal(resolveCharacterVoice('veyra_intro_03','en').gain,1);assert.equal(resolveCharacterVoice('edrin_intro_01','en').gain??1,1,'other characters play as recorded');
  assert.match(read('../dist/platform/audio.js'),/const trim=resolveCharacterVoice\(name,locale\)\?\.gain\?\?1,node=this\.makeSource\(buffer,'voice',\{volume:volume\*trim\}\)/);
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
