import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BRAMM_EXPRESSIONS, BRAMM_REACTIONS, BRAMM_VOICE_LIBRARY, brammExpressionURL, brammExpressionsReady, createBrammController, preloadBrammExpressions, resolveBrammReaction, resolveBrammVoice } from '../dist/duel/bramm.js';

test('Bramm pack registers every supplied voice and expression asset',()=>{
  assert.equal(Object.keys(BRAMM_VOICE_LIBRARY).length,40,'41 recorded lines, one_card_02 retired by the owner');
  assert.equal(BRAMM_EXPRESSIONS.length,37);
  for(const definition of Object.values(BRAMM_VOICE_LIBRARY)){const bytes=fs.readFileSync(fileURLToPath(definition.src));assert.ok(bytes.length>128);}
  for(const reaction of BRAMM_REACTIONS){
    assert.ok(reaction.captions.en);assert.ok(reaction.captions.he);assert.doesNotMatch(reaction.captions.he,/\[[^\]]+\]/);
    const localized=resolveBrammVoice(reaction.voice,'he');if(reaction.voice==='bramm_win_05'){assert.equal(localized,null);continue;}assert.match(localized.src,/_he\.mp3$/);assert.equal(localized.caption,reaction.captions.he);
    if(reaction.voice!=='bramm_win_05'){const bytes=fs.readFileSync(fileURLToPath(localized.src));assert.ok(bytes.length>128);}
  }
  for(const expression of BRAMM_EXPRESSIONS){const bytes=fs.readFileSync(fileURLToPath(brammExpressionURL(expression)));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
});

test('Bramm resolves exact bilingual captions without changing the base reaction identity',()=>{
  const samples=[
    ['one_card_01','...No.','אוי לא..'],
    ['win_04','Never in doubt.','איזה מודאג, מה מודאג.. הייתי רגוע כל המשחק.'],
    ['win_08','Good game. For you.','משחק טוב. יחסית.'],
    ['loss_01','...Again.','לא נחשב.. עוד פעם.']
  ];
  for(const [id,en,he] of samples){const base=BRAMM_REACTIONS.find(item=>item.id===id),english=resolveBrammReaction(base,'en'),hebrew=resolveBrammReaction(base,'he');assert.equal(english.caption,en);assert.equal(hebrew.caption,he);assert.equal(english.voice,hebrew.voice);assert.equal(hebrew.locale,'he');}
});

test('the complete Bramm expression manifest preloads and decodes once',async()=>{
  const OriginalImage=globalThis.Image;let created=0,decoded=0;
  globalThis.Image=class FakeImage{
    set src(value){this._src=value;this.complete=true;this.naturalWidth=512;created++;queueMicrotask(()=>this.onload?.());}
    get src(){return this._src;}
    async decode(){decoded++;}
  };
  try{
    const first=await preloadBrammExpressions(),second=await preloadBrammExpressions();
    assert.equal(first.length,BRAMM_EXPRESSIONS.length);assert.equal(second,first);
    assert.equal(created,BRAMM_EXPRESSIONS.length);assert.equal(decoded,BRAMM_EXPRESSIONS.length);
    assert.equal(brammExpressionsReady(),true);
  }finally{globalThis.Image=OriginalImage;}
});

test('Lucky becomes Still lucky after another strong player move',()=>{
  const bramm=createBrammController({random:()=>0,now:()=>10000});
  assert.equal(bramm.react('player_good_move',{},true).voice,'bramm_player_good_move_01');
  assert.equal(bramm.react('player_good_move',{},true).voice,'bramm_player_good_move_02');
  assert.equal(bramm.snapshot().state,'irritated');
});

test('mocking a player draw unlocks the contextual Don’t callback',()=>{
  const bramm=createBrammController({random:()=>0,now:()=>10000});
  assert.equal(bramm.react('player_draw',{},true).voice,'bramm_player_draw_01');
  assert.equal(bramm.react('bramm_draw',{},true).voice,'bramm_bramm_draw_01');
  assert.equal(bramm.snapshot().flags.bramm_has_been_forced_to_draw_after_mock,true);
});

test('one-card panic persists and recovery returns through relief',()=>{
  const bramm=createBrammController({random:()=>0,now:()=>10000});
  assert.equal(bramm.react('player_one_card',{},true).voice,'bramm_player_one_card_01');
  assert.equal(bramm.snapshot().state,'panic');
  assert.equal(bramm.react('one_card_persist',{},true).voice,'bramm_player_one_card_03','03 stays the later, desperate-defence line');
  assert.equal(bramm.oneCardRecovered().expression,'21_sudden_relief');
  assert.equal(bramm.snapshot().flags.bramm_survived_one_card_scare,true);
});

test('result selection uses one context-appropriate critical line',()=>{
  const bramm=createBrammController({random:()=>0,now:()=>10000});
  bramm.react('player_one_card',{},true);bramm.oneCardRecovered();
  const win=bramm.react('win',{survivedOneCard:true},true);
  assert.equal(win.voice,'bramm_win_05');assert.equal(win.priority,'CRITICAL');
  const matchLoss=createBrammController({random:()=>0,now:()=>10000}).react('match_loss',{},true);
  assert.match(matchLoss.voice,/^bramm_match_loss_0[123]$/);assert.equal(matchLoss.nextState,'defeated');
  const roundLoss=createBrammController({random:()=>0,now:()=>10000}).react('round_loss',{},true);
  assert.equal(roundLoss.voice,'bramm_loss_01');
});

test('reaction metadata stays data-driven and complete',()=>{
  for(const reaction of BRAMM_REACTIONS){for(const key of ['id','trigger','priority','voice','expression','duration'])assert.ok(reaction[key]);}
  assert.equal(new Set(BRAMM_REACTIONS.map(item=>item.voice)).size,40);
});

test('short-term character memory survives a saved-match restore',()=>{
  const first=createBrammController({random:()=>0,now:()=>10000});first.react('player_draw',{},true);first.react('player_one_card',{},true);
  const restored=createBrammController({random:()=>0,now:()=>20000,initial:first.snapshot()});
  assert.equal(restored.snapshot().state,'panic');
  assert.equal(restored.snapshot().flags.bramm_has_mocked_player_draw,true);
  assert.equal(restored.react('bramm_draw',{},true).voice,'bramm_bramm_draw_01');
});

test('ordinary voice waits for meaningful silence while visual reactions stay available',()=>{
  let time=0;const bramm=createBrammController({random:()=>0,now:()=>time});
  assert.equal(bramm.observe('player_draw').expression,'12_mock_generous');
  assert.equal(bramm.react('player_draw'),null);
  time=9000;bramm.observe('player_draw');
  assert.equal(bramm.react('player_draw').voice,'bramm_player_draw_01');
});

test('recent queue prevents an immediate repeated line and round budget resets explicitly',()=>{
  const bramm=createBrammController({random:()=>0,now:()=>20000});
  assert.equal(bramm.react('player_draw',{},true).voice,'bramm_player_draw_01');
  assert.equal(bramm.react('player_draw',{},true),null);
  bramm.beginRound();
  assert.equal(bramm.snapshot().counters.nonCriticalThisRound,0);
});

test('every Bramm expression is reachable in play',()=>{
  const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),bramm=fs.readFileSync(new URL('../dist/duel/bramm.js',import.meta.url),'utf8'),staging=fs.readFileSync(new URL('../dist/duel/characters.js',import.meta.url),'utf8');
  const manifest=bramm.slice(bramm.indexOf('export const BRAMM_EXPRESSIONS'),bramm.indexOf(']);',bramm.indexOf('export const BRAMM_EXPRESSIONS')));
  const rest=bramm.replace(manifest,'')+staging+app+fs.readFileSync(new URL('../dist/duel/banter.js',import.meta.url),'utf8')+fs.readFileSync(new URL('../dist/duel/tavern-director.js',import.meta.url),'utf8');
  for(const expression of BRAMM_EXPRESSIONS)assert.ok(rest.includes(`'${expression}'`),`${expression} is never shown`);
});
test('every new match against Bramm opens with his voiced introduction',()=>{
  const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  // Bramm's intro never depends on whether you have met him before (Edrin's does).
  assert.match(app,/if\(isBrammDuel\(\)\)runCharacter\('intro',\{\},true\);else/);
  assert.match(app,/if\(!saved\)\{const epoch=sessionEpoch,firstEncounter=[^;]+;[\s\S]{0,900}?const timer=setTimeout\(\(\)=>\{if\(epoch!==sessionEpoch\)return;if\(isBrammDuel\(\)\)runCharacter\('intro',\{\},true\);/);
  const bramm=createBrammController({random:()=>0});assert.ok(bramm.react('intro',{},true).voice.startsWith('bramm_intro_'));
});

test('round and match results use separate pools, and the old loss line is round-only',()=>{
  const pools={round_win:/^bramm_round_win_0[1-4]$/,round_loss:/^bramm_loss_01$/,match_loss:/^bramm_match_loss_0[1-3]$/,win:/^bramm_win_\d\d$/};
  for(const [trigger,pattern] of Object.entries(pools))for(let i=0;i<30;i++){const voice=createBrammController().react(trigger,{},true)?.voice;assert.match(voice,pattern,`${trigger} → ${voice}`);}
  assert.ok(!BRAMM_REACTIONS.some(r=>r.trigger==='loss'),'no ambiguous "loss" trigger remains');
  const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/else runCharacter\('match_loss',\{\},true\);\n      \}else if\(isBrammDuel\(\)\)runCharacter\(opponentWon\?'round_win':'round_loss',\{\},true\);/);
});
test('player one-card reactions vary, never repeat back-to-back, and 04 does not exist',()=>{
  const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),bramm=fs.readFileSync(new URL('../dist/duel/bramm.js',import.meta.url),'utf8');
  assert.doesNotMatch(app+bramm,/one_card_04/);
  const seen=new Set();
  for(let seed=0;seed<200;seed++){let n=seed;const random=()=>((n=(n*9301+49297)%233280)/233280);const c=createBrammController({random});let last=null;
    for(let scare=0;scare<4;scare++){const r=c.react('player_one_card',{brammCards:scare*2},true);seen.add(r.voice);assert.notEqual(r.voice,last);last=r.voice;c.oneCardRecovered();}}
  for(const id of ['01','05','06','07'])assert.ok(seen.has(`bramm_player_one_card_${id}`),`one-card ${id} never chosen`);
  assert.ok(!seen.has('bramm_player_one_card_02'),'02 ("You\'ve got two") is retired');
  assert.ok(!seen.has('bramm_player_one_card_03'),'03 is not an instant reaction');
});
test('idle lines are rare: gated by cooldown, recent speech and a per-round budget',()=>{
  let clock=0;const c=createBrammController({random:()=>0,now:()=>clock});
  c.beginRound();for(let i=0;i<4;i++)c.observe('player_neutral_move');
  clock=60000;const first=c.react('idle_quiet');assert.match(first.voice,/^bramm_idle_0[12]$/);
  for(let i=0;i<4;i++)c.observe('player_neutral_move');clock+=60000;
  assert.equal(c.react('idle_quiet'),null,'a second idle needs a genuinely long round');
  c.react('bramm_good_move',{},true);for(let i=0;i<45;i++)c.observe('player_neutral_move');clock+=60000;
  assert.ok(c.react('idle_quiet'),'a very long round may allow one more');
  for(let i=0;i<60;i++)c.observe('player_neutral_move');clock+=60000;
  assert.equal(c.react('idle_quiet'),null,'never more than two in a round');
  clock=0;const fresh=createBrammController({random:()=>0,now:()=>clock});fresh.react('round_win',{},true);for(let i=0;i<4;i++)fresh.observe('player_neutral_move');clock=5000;
  assert.equal(fresh.react('idle_quiet'),null,'idle waits well after the last line');
});
test('anti-repeat is language independent',()=>{
  const c=createBrammController({random:()=>0});const a=c.react('match_loss',{},true),b=c.react('match_loss',{},true);
  assert.notEqual(a.voice,b.voice);assert.equal(resolveBrammReaction(a,'he').voice,a.voice);
  assert.match(resolveBrammVoice(a.voice,'he').src,/_he\.mp3$/);
});

test('consecutive round losses vary between "...Again." and an excuse',()=>{
  const c=createBrammController({random:()=>0});
  const lines=[0,1,2,3].map(()=>c.react('round_loss',{},true).voice);
  assert.equal(lines[0],'bramm_loss_01');
  for(let i=1;i<lines.length;i++)assert.notEqual(lines[i],lines[i-1]);
  assert.ok(lines.slice(1).some(v=>/bramm_excuse_0[12]/.test(v)));
});
