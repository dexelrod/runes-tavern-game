import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TAVERN_BANTER, TAVERN_GUEST_POOLS, TAVERN_TIMING, allTavernVoices, createTavernDirector, guestHasVoice, reactionFor } from '../dist/duel/tavern-director.js';
import { AUTHORED_CHARACTERS } from '../dist/duel/characters.js';
import { mulberry32 } from '../dist/game-engine/cards.js';
import { TAVERN_GUEST_ODDS, VOICED_TAVERN_GUESTS, createTavernMatch, restoreSession, serializeSession, tavernGuestsFor } from '../dist/game-engine/match.js';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { TAVERN_PRESSURE_PROFILE, TAVERN_VETERAN_PROFILE, PRESSURE_PROFILE, VETERAN_PROFILE } from '../dist/game-ai/veteran.js';
import { applyAction, createInitialState } from '../dist/game-engine/engine.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const seeded=seed=>mulberry32(seed);

// The owner-approved allowlist, exactly (v101). Deliberate differences from the brief:
// bramm_player_one_card_02 was retired in v87 and stays out; ragna_draw_02 ("Stupid.")
// is a self-mistake line only, as in her Duel; ragna_idle_05 is only ever the follow-up.
const APPROVED={
  kesh:['intro_01','intro_02','intro_03','idle_01','idle_02','idle_03','idle_04','player_good_move_01','player_good_move_02','player_good_move_03','good_move_01','good_move_02','good_move_03','annoyed_01','annoyed_02','annoyed_03','surprised_01','surprised_02','surprised_03','player_draw_01','player_draw_02','draw_01','draw_02','draw_03','skip_01','skip_02','curse_01','curse_02','reverse_01','reverse_02','king_01','king_02','player_one_card_01','player_one_card_02','player_one_card_03','one_card_01','one_card_02','round_win_01','round_win_02','round_win_03','round_loss_01','round_loss_02','round_loss_03','match_win_01','match_win_02','match_win_03','match_loss_01','match_loss_02','match_loss_03','omen_01','omen_02','omen_03'],
  edrin:['intro_01','intro_02','intro_03','idle_01','idle_02','idle_03','player_good_move_01','player_good_move_02','player_good_move_03','good_move_01','good_move_02','good_move_03','player_draw_01','draw_01','draw_02','player_one_card_01','player_one_card_02','one_card_01','one_card_02','round_win_01','round_win_02','round_win_03','round_loss_01','round_loss_03','match_win_02','match_win_03','match_loss_01','match_loss_02','match_loss_03','brutal_move_01','brutal_move_02'],
  ragna:['intro_03','idle_01','idle_02','idle_03','idle_04','noise_01','player_good_move_01','player_good_move_02','player_good_move_03','good_move_01','good_move_02','good_move_03','player_draw_02','draw_01','draw_02','draw_03','self_mistake_01','player_one_card_01','player_one_card_02','player_one_card_03','player_one_card_04','one_card_01','one_card_02','one_card_03','round_win_01','round_win_02','round_win_04','round_loss_01','round_loss_02','round_loss_03','match_win_01','match_win_03','match_loss_01','match_loss_03'],
  bramm:['intro_01','intro_02','taunt_01','taunt_02','mock_move_01','mock_move_02','player_good_move_01','player_good_move_02','player_draw_01','bramm_good_move_01','bramm_good_move_02','bramm_draw_02','excuse_01','excuse_02','player_one_card_01','player_one_card_03','player_one_card_05','player_one_card_06','player_one_card_07','loss_01','round_win_01','round_win_02','round_win_03','round_win_04','win_01','win_02','win_04','win_06','win_07','win_09','win_10','match_loss_01','match_loss_02','match_loss_03','idle_01','idle_02']
};
const FORBIDDEN=['ragna_intro_01','ragna_intro_02','ragna_intro_04','ragna_round_win_03','ragna_match_win_02','ragna_match_loss_02','bramm_intro_03','bramm_bramm_draw_01','bramm_win_03','bramm_win_05','bramm_win_08','bramm_player_one_card_02'];

test('Tavern pools are exactly the approved allowlist; nothing else can ever play',()=>{
  for(const [guest,ids] of Object.entries(APPROVED)){
    const pooled=new Set(Object.values(TAVERN_GUEST_POOLS[guest]).flat());
    assert.deepEqual([...pooled].toSorted(),ids.map(id=>`${guest}_${id}`).filter(v=>v!=='ragna_idle_05').toSorted(),guest);
    for(const voice of allTavernVoices(guest)){assert.ok(reactionFor(guest,voice),`${voice} is a real recording`);}
  }
  const everything=Object.values(TAVERN_GUEST_POOLS).flatMap(p=>Object.values(p).flat()).concat(TAVERN_BANTER.flatMap(b=>[b.a[1],b.b[1]]),['ragna_idle_05']);
  for(const voice of FORBIDDEN)assert.ok(!everything.includes(voice),`${voice} must not be used at the Tavern`);
  // Banter only uses allowlisted lines.
  for(const b of TAVERN_BANTER)for(const [guest,voice] of [b.a,b.b])assert.ok(Object.values(TAVERN_GUEST_POOLS[guest]).flat().includes(voice),`${b.id}: ${voice}`);
  // Every allowlisted take exists on disk in each language it was recorded in.
  for(const guest of Object.keys(APPROVED))for(const voice of allTavernVoices(guest))for(const locale of ['en','he']){const v=AUTHORED_CHARACTERS[guest].resolveVoice(voice,locale);if(v)assert.ok(fs.statSync(new URL(v.src)).size>1024,`${voice} ${locale}`);}
});

// A realistic Tavern Match event stream: four seats, five hands, idle ticks, results.
function playMatch(seats,{seed=1,locale='en',muted=false}={}){
  let clock=0;const random=seeded(seed),director=createTavernDirector({seats,random,now:()=>clock,locale:()=>locale});
  const ids=['p0','p1','p2','p3'],said=[],plans=[];let busyUntil=0;
  const fire=(type,c)=>{const plan=director.event(type,{...c,busy:clock<busyUntil,muted});if(plan.lines.length){plans.push({type,plan,at:clock});said.push(...plan.lines);busyUntil=clock+plan.lines.length*3200;}return plan;};
  fire('intro',{});
  for(let round=0;round<5;round++){
    director.beginRound();
    for(let i=0;i<64;i++){
      clock+=1800+Math.floor(random()*900);
      const actor=ids[i%4],r=random(),other=ids[(i+1)%4];
      if(r<.04)fire('one_card',{actor});
      else if(r<.12)fire('penalty',{victim:other,amount:random()<.3?4:2,source:actor,victimCount:6});
      else if(r<.18)fire('skip',{actor,victim:other});
      else if(r<.24)fire('good_move',{actor,victim:other});
      else if(r<.27)fire('king',{actor,victim:null});
      else if(r<.30)fire('reverse',{actor});
      else if(r<.45)fire('draw',{actor,slip:false});
      else fire('move',{actor});
      if(i%14===13)fire('idle',{current:ids[(i+2)%4]});
      if(i%31===30)fire('slow',{current:'p0'});
    }
    clock+=4000;fire(round===4?'match_end':'round_end',round===4?{champion:ids[Math.floor(random()*4)]}:{winner:ids[Math.floor(random()*4)]});
  }
  return {said,plans,director};
}
const PAIRS=[['bramm','ragna'],['bramm','edrin'],['bramm','kesh'],['ragna','edrin'],['ragna','kesh'],['edrin','kesh']];

test('restraint: a single guest speaks a handful of times a match; Edrin least of all',()=>{
  for(const guest of ['bramm','edrin','ragna','kesh'])for(const locale of ['en','he']){
    let total=0;for(let seed=1;seed<=60;seed++)total+=playMatch({p2:guest},{seed,locale}).said.length;
    const avg=total/60;assert.ok(avg>=1.5&&avg<=6.5,`${guest} ${locale}: ${avg.toFixed(2)} lines a match`);
    if(guest==='edrin')assert.ok(avg<=4.5,`Edrin is the quietest (${avg.toFixed(2)})`);
  }
});

test('two guests share the moments: they do not double the talk',()=>{
  for(const [a,b] of PAIRS){
    let solo=0,pair=0;for(let seed=1;seed<=50;seed++){solo+=playMatch({p2:a},{seed}).said.length+playMatch({p2:b},{seed:seed+500}).said.length;pair+=playMatch({p1:a,p3:b},{seed:seed+900}).said.length;}
    assert.ok(pair<solo*.85,`${a}+${b}: ${pair} together vs ${solo} apart`);
  }
});

test('never two lines at once, never a repeat within a match, one line per event',()=>{
  for(const [a,b] of PAIRS)for(let seed=1;seed<=40;seed++){
    const {said,plans}=playMatch({p1:a,p3:b},{seed});
    const voices=said.map(line=>line.voice).filter(v=>v!=='ragna_idle_05');
    assert.equal(new Set(voices).size,voices.length,`${a}+${b} seed ${seed}: a line repeated`);
    for(const {plan} of plans){if(plan.lines.length===2)assert.ok(plan.banter||plan.lines[1].voice==='ragna_idle_05','two lines only as a banter or Ragna\'s "Thank you."');assert.ok(plan.lines.length<=2);}
  }
  // While anything is playing, nothing else starts.
  const d=createTavernDirector({seats:{p1:'bramm'},random:()=>0,now:()=>99999});
  assert.equal(d.event('one_card',{actor:'p0',busy:true}).lines.length,0);
});

test('banter is rare: at most two a match, each exchange once, and none when the line would be untrue',()=>{
  let total=0,matches=0;const seen=new Set();
  for(const [a,b] of PAIRS)for(let seed=1;seed<=80;seed++){const {plans}=playMatch({p1:a,p3:b},{seed});const banters=plans.filter(p=>p.plan.banter).map(p=>p.plan.banter);matches++;total+=banters.length;assert.ok(banters.length<=TAVERN_TIMING.maxBanters);assert.equal(new Set(banters).size,banters.length);for(const id of banters)seen.add(id);}
  assert.ok(total/matches<.8,`banter per two-guest match ${(total/matches).toFixed(2)}`);
  assert.ok(seen.size>=5,`several exchanges occur in practice (${[...seen].join(', ')})`);
  // Semantic gates, checked directly with chance forced on.
  const ready=seats=>{let clock=100000;const d=createTavernDirector({seats,random:()=>0,now:()=>clock});for(let i=0;i<6;i++)d.event('move',{actor:null});return d;};
  assert.equal(ready({p1:'ragna',p2:'edrin'}).event('slow',{current:'p0'}).banter,null,'"Eyes on the table" goes to Edrin only when it is his turn');
  assert.equal(ready({p1:'ragna',p2:'edrin'}).event('slow',{current:'p2'}).banter,'pay_attention');
  assert.equal(ready({p1:'edrin',p2:'ragna'}).event('penalty',{source:'p1',victim:'p3',amount:4}).banter,null,'Ragna only says "Damn it." when she is the one drawing');
  assert.equal(ready({p1:'edrin',p2:'ragna'}).event('penalty',{source:'p1',victim:'p2',amount:2,victimCount:7}).banter,null,'a mild +2 mid-hand is not brutal');
  assert.equal(ready({p1:'edrin',p2:'ragna'}).event('penalty',{source:'p1',victim:'p2',amount:4,victimCount:9}).banter,'oh_dear_damn');
  // "House rule." answers a real setback for Bramm (a Shield, a King, a big Curse) — never anyone else's.
  assert.equal(ready({p1:'bramm',p2:'kesh'}).event('skip',{actor:'p0',victim:'p1'}).banter,'house_rule');
  assert.equal(ready({p1:'bramm',p2:'kesh'}).event('skip',{actor:'p0',victim:'p3'}).banter,null);
  assert.equal(ready({p1:'bramm',p2:'kesh'}).event('penalty',{source:'p0',victim:'p1',amount:2,victimCount:8}).banter,null,'a +2 is not worth an invented rule');
  assert.equal(ready({p1:'ragna',p2:'bramm'}).event('good_move',{actor:'p1',victim:'p3'}).banter,null,'"Keep up." → "That doesn\'t count." needs Bramm to be the one hurt');
  assert.equal(ready({p1:'ragna',p2:'bramm'}).event('good_move',{actor:'p0',victim:'p3'}).banter,'two_opinions');
  assert.equal(ready({p1:'bramm',p2:'edrin'}).event('match_end',{champion:'p0'}).banter,null,'victory banter only when Bramm really won');
  // Edrin's "Nice tavern, mostly." was only recorded in Hebrew: that exchange never runs in English.
  for(let seed=1;seed<=200;seed++){let clock=1e6;const d=createTavernDirector({seats:{p1:'bramm',p2:'edrin'},random:seeded(seed),now:()=>clock,locale:()=>'en'});for(let i=0;i<5;i++)d.event('move',{actor:'p0'});assert.notEqual(d.event('idle',{current:'p0'}).banter,'tavern_reviews');}
});

test('semantic safety: every line is true for the seat that says it',()=>{
  const always=seats=>{let clock=100000;const d=createTavernDirector({seats,random:()=>0,now:()=>clock});for(let i=0;i<6;i++)d.event('move',{actor:null});return d;};
  // Ragna's "Stupid." / "Wrong card. My fault." only after her own knowing slip.
  const plain=always({p2:'ragna'}).event('draw',{actor:'p2',slip:false}).lines[0]?.voice;assert.ok(!['ragna_draw_02','ragna_self_mistake_01'].includes(plain));
  assert.match(always({p2:'ragna'}).event('draw',{actor:'p2',slip:true}).lines[0].voice,/ragna_(self_mistake_01|draw_02)/);
  // "Still lucky." only after "Lucky."
  const d=always({p2:'bramm'});const first=d.event('good_move',{actor:'p0'}).lines[0]?.voice;assert.equal(first,'bramm_player_good_move_01');
  // A guest's own one-card line only for their own last card; others react to someone else's.
  assert.match(always({p2:'kesh'}).event('one_card',{actor:'p2'}).lines[0].voice,/kesh_one_card_0/);
  assert.match(always({p2:'kesh'}).event('one_card',{actor:'p1'}).lines[0].voice,/kesh_player_one_card_0/);
  // Results: the winner's line when a guest wins; a match line never stacks with a round line.
  assert.match(always({p1:'edrin',p2:'kesh'}).event('round_end',{winner:'p2'}).lines[0].voice,/kesh_round_win/);
  const end=always({p1:'edrin'}).event('match_end',{champion:'p1'});assert.equal(end.lines.length,1);assert.match(end.lines[0].voice,/edrin_match_win/);
  // Kesh's stone lines only as part of the tell, matched to its moment.
  assert.equal(always({p2:'kesh'}).event('omen',{actor:'p2',phase:'realization'}).lines[0].voice,'kesh_omen_03');
  assert.equal(always({p2:'kesh'}).event('omen',{actor:'p1',phase:'touch'}).lines.length,0);
  // Bramm's excuse only when the setback is his.
  assert.equal(always({p2:'bramm'}).event('skip',{actor:'p0',victim:'p1'}).lines.length,0);
  assert.match(always({p2:'bramm'}).event('skip',{actor:'p0',victim:'p2'}).lines[0].voice,/bramm_excuse_0/);
  // Muted (Settings off, or voices off): faces only.
  const muted=always({p2:'bramm'}).event('one_card',{actor:'p0',muted:true});assert.equal(muted.lines.length,0);assert.ok(muted.faces.length>=0);
});

test('appearance: about 30% of evenings one guest, about 7% two, never three; restored saves keep them',()=>{
  assert.deepEqual(TAVERN_GUEST_ODDS,{one:.3,two:.07});
  const counts=[0,0,0,0];for(let seed=0;seed<6000;seed++)counts[tavernGuestsFor(seed).filter(p=>p.voiced).length]++;
  assert.ok(counts[1]/6000>.27&&counts[1]/6000<.33&&counts[2]/6000>.05&&counts[2]/6000<.09&&counts[3]===0,counts.join());
  const m=createTavernMatch({seed:11,guests:['bramm','ragna']});const back=restoreSession(JSON.parse(JSON.stringify(serializeSession?serializeSession(m):m)));
  assert.deepEqual(back.roster.map(p=>p.nameKey),m.roster.map(p=>p.nameKey));
  assert.deepEqual(m.roster.filter(p=>p.voiced).map(p=>p.nameKey).toSorted(),['bramm','ragna']);
  const app=read('../dist/app.js');assert.match(app,/createTavernMatch\(\{seed:Date\.now\(\),voicedGuests:settings\.tavernGuests!==false,guests\}\)/);
  assert.match(app,/toggle\(c\.tavernGuests,'tavernGuests'\)/);assert.match(read('../dist/platform/storage.js'),/tavernGuests:true/);
  assert.match(app,/session\.tavernDirector=tavernGuests\.director\.snapshot\(\)/,'the director\'s memory (lines used, banters) is saved with the match');
});

test('table-strength AI for guests: personality without a boss seat',t=>{
  // Seeded so the measured win rate is the same on every run (CI included).
  const savedRandom=Math.random;Math.random=seeded(20261007);t.after(()=>{Math.random=savedRandom;});
  assert.equal(VOICED_TAVERN_GUESTS.find(g=>g.nameKey==='edrin').archetype,'tavern-veteran');assert.equal(VOICED_TAVERN_GUESTS.find(g=>g.nameKey==='ragna').archetype,'tavern-warrior');
  assert.equal(TAVERN_VETERAN_PROFILE.samples,0);assert.equal(TAVERN_PRESSURE_PROFILE.samples,0);
  assert.ok(TAVERN_VETERAN_PROFILE.mistakeRate>VETERAN_PROFILE.mistakeRate&&TAVERN_PRESSURE_PROFILE.mistakeRate>PRESSURE_PROFILE.mistakeRate);
  let wins=0;const N=120;
  for(let seed=1;seed<=N;seed++){const arch=['tavern-warrior','hunter','bard','scholar'],rot=seed%4,order=[...arch.slice(rot),...arch.slice(0,rot)];let s=createInitialState({playerCount:4,players:order.map((a,i)=>({id:`p${i}`,name:a,kind:'ai',archetype:a})),seed:seed*97+3});for(let i=0;i<4000&&s.phase==='playing';i++)s=applyAction(s,chooseBotAction(s));if(s.players.find(p=>p.id===s.winnerId)?.archetype==='tavern-warrior')wins++;}
  assert.ok(wins/N<.42,`Ragna at a four-seat table wins ${(100*wins/N).toFixed(1)}% (25% is an even share)`);
});

test('one table-wide voice: guest lines go through the shared voice path; generic quips yield',()=>{
  const app=read('../dist/app.js');
  assert.equal((app.match(/audioSystem\.playVoice\(/g)||[]).length,1);
  assert.match(app,/if\(tavernGuests&&\(audioSystem\.voiceSource\|\|tavernGuests\.speaking\|\|tavernGuests\.seats\[quip\?\.player\]\)\)return;/);
  assert.match(app,/if\(!isAuthoredDuel\(\)&&!keshSpoke\)\{/);
  assert.match(app,/function performGuestLines\(lines/);
});
