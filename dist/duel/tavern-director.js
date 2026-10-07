import { AUTHORED_CHARACTERS } from './characters.js';

// ─────────────────────────────────────────────────────────────────────────────
// Voiced Tavern guests. Now and then Bramm, Edrin, Ragna or Kesh happens to be
// playing at a Tavern table. Each guest is data — the owner-approved list of
// recordings that make sense at a four-seat table, how readily they talk, and
// the faces they pull — and ONE table-wide director decides whether anybody
// speaks at all. Most eligible moments stay silent. Lines never overlap, never
// repeat within a match, and two guests do not double the chatter.
// Only existing recordings are used; nothing is generated.
// ─────────────────────────────────────────────────────────────────────────────

const L=(prefix,...ids)=>ids.map(id=>`${prefix}_${id}`);

// Tavern-safe allowlists (owner-approved, v101). Trigger names are seen from the
// speaker's seat: `own_*` happened to them, `other_*` to someone else at the table.
export const TAVERN_GUEST_POOLS=Object.freeze({
  kesh:Object.freeze({
    intro:L('kesh','intro_01','intro_02','intro_03'),
    idle:L('kesh','idle_01','idle_02','idle_03'),slow:L('kesh','idle_04'),
    other_good_move:L('kesh','player_good_move_01','player_good_move_02','player_good_move_03'),
    own_good_move:L('kesh','good_move_01','good_move_02','good_move_03'),
    setback:L('kesh','annoyed_01','annoyed_02','annoyed_03'),
    // "The signs were wrong" — only after he really consulted the stone (the tell).
    surprised:L('kesh','surprised_01','surprised_02','surprised_03'),
    other_draw:L('kesh','player_draw_01','player_draw_02'),own_draw:L('kesh','draw_01','draw_02','draw_03'),
    skip:L('kesh','skip_01','skip_02'),curse:L('kesh','curse_01','curse_02'),reverse:L('kesh','reverse_01','reverse_02'),king:L('kesh','king_01','king_02'),
    other_one_card:L('kesh','player_one_card_01','player_one_card_02','player_one_card_03'),own_one_card:L('kesh','one_card_01','one_card_02'),
    round_win:L('kesh','round_win_01','round_win_02','round_win_03'),round_loss:L('kesh','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('kesh','match_win_01','match_win_02','match_win_03'),match_loss:L('kesh','match_loss_01','match_loss_02','match_loss_03'),
    // Only while the rune-stone tell is actually happening at this table.
    omen:L('kesh','omen_01','omen_02','omen_03')
  }),
  edrin:Object.freeze({
    intro:L('edrin','intro_01','intro_02','intro_03'),idle:L('edrin','idle_01','idle_02','idle_03'),
    other_good_move:L('edrin','player_good_move_01','player_good_move_02','player_good_move_03'),own_good_move:L('edrin','good_move_01','good_move_02','good_move_03'),
    other_draw:L('edrin','player_draw_01'),own_draw:L('edrin','draw_01','draw_02'),
    other_one_card:L('edrin','player_one_card_01','player_one_card_02'),own_one_card:L('edrin','one_card_01','one_card_02'),
    round_win:L('edrin','round_win_01','round_win_02','round_win_03'),round_loss:L('edrin','round_loss_01','round_loss_03'),
    match_win:L('edrin','match_win_02','match_win_03'),match_loss:L('edrin','match_loss_01','match_loss_02','match_loss_03'),
    brutal:L('edrin','brutal_move_01','brutal_move_02')
  }),
  ragna:Object.freeze({
    intro:L('ragna','intro_03'),idle:L('ragna','idle_03'),slow:L('ragna','idle_01','idle_02'),
    // Her tavern shouting: rare so it stays funny (at most one per match).
    shout:L('ragna','idle_04','noise_01'),
    other_good_move:L('ragna','player_good_move_01','player_good_move_02','player_good_move_03'),own_good_move:L('ragna','good_move_01','good_move_02','good_move_03'),
    other_draw:L('ragna','player_draw_02'),own_draw:L('ragna','draw_01','draw_03'),
    // "Stupid." and "Wrong card. My fault." only after her own knowing slip cost her a draw — as in a Duel.
    self_mistake:L('ragna','self_mistake_01','draw_02'),
    other_one_card:L('ragna','player_one_card_01','player_one_card_02','player_one_card_03','player_one_card_04'),own_one_card:L('ragna','one_card_01','one_card_02','one_card_03'),
    round_win:L('ragna','round_win_01','round_win_02','round_win_04'),round_loss:L('ragna','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('ragna','match_win_01','match_win_03'),match_loss:L('ragna','match_loss_01','match_loss_03')
  }),
  bramm:Object.freeze({
    intro:L('bramm','intro_01','intro_02'),idle:L('bramm','idle_01','idle_02'),
    // He addresses whoever's turn or move it is.
    taunt:L('bramm','taunt_01'),slow:L('bramm','taunt_02'),mock:L('bramm','mock_move_01','mock_move_02'),
    other_good_move:L('bramm','player_good_move_01','player_good_move_02'),other_draw:L('bramm','player_draw_01'),
    own_good_move:L('bramm','bramm_good_move_01','bramm_good_move_02'),own_draw:L('bramm','bramm_draw_02'),setback:L('bramm','excuse_01','excuse_02'),
    other_one_card:L('bramm','player_one_card_01','player_one_card_03','player_one_card_05','player_one_card_06','player_one_card_07'),
    round_win:L('bramm','round_win_01','round_win_02','round_win_03','round_win_04'),round_loss:L('bramm','loss_01'),
    match_win:L('bramm','win_01','win_02','win_04','win_06','win_07','win_09','win_10'),match_loss:L('bramm','match_loss_01','match_loss_02','match_loss_03')
  })
});

// "Still lucky." only follows his own "Lucky." earlier in the same match.
const REQUIRES=Object.freeze({bramm_player_good_move_02:'bramm_player_good_move_01'});
// After "QUIET! THERE'S A GAME ON!" Ragna sometimes adds "Thank you." as one performance.
const FOLLOW_UPS=Object.freeze({ragna_idle_04:{voice:'ragna_idle_05',chance:.6,delay:900}});

// How readily each guest talks (Edrin especially little: he is only half watching).
export const TAVERN_GUEST_TALK=Object.freeze({kesh:1,edrin:.6,ragna:1,bramm:1.15});
// Chance that an eligible moment produces a line, for one guest at the table, before
// cooldowns and budgets. Most moments stay silent.
export const TAVERN_TRIGGER_CHANCE=Object.freeze({
  intro:.55,idle:.3,slow:.35,taunt:.18,mock:.1,shout:.22,
  other_good_move:.2,own_good_move:.14,setback:.3,surprised:.5,other_draw:.22,own_draw:.12,self_mistake:.65,
  skip:.25,curse:.2,reverse:.14,king:.24,brutal:.45,omen:.55,
  other_one_card:.3,own_one_card:.3,
  round_win:.35,round_loss:.12,match_win:.85,match_loss:.5
});
const HIGH=new Set(['other_one_card','own_one_card']),RESULT=new Set(['round_win','round_loss','match_win','match_loss']),INTRO='intro';
// Two guests share the moments, they do not double them.
export const TWO_GUEST_SCALE=.6;
// One ordinary line per hand for the whole table, one last-card line per hand, and at most three
// non-result lines per guest per match (two when two guests share the table): a guest says
// roughly 2–5 things over five hands, and a banter is a once-in-a-while treat.
export const TAVERN_TIMING=Object.freeze({casualGap:15000,casualEvents:3,highGap:5000,banterGap:40000,perGuestCap:3,pairGuestCap:2,banterChance:.13,idleBanterChance:.14,maxBanters:2});

// Silent faces: what each guest's face does when something happens near them.
const FACES=Object.freeze({
  kesh:{own_draw:['bad_draw','save_for_later'],other_one_card:['player_one_card'],own_one_card:['kesh_one_card','road_clear'],other_good_move:['interesting_choice','close_observation'],own_good_move:['good_move_satisfaction','expected_result'],skip:['skip_interrupted'],curse:['curse_observation'],reverse:['reverse_observation'],king:['king_observation'],setback:['plans_disrupted','dry_annoyance'],idle:['watching_fire','drinking','intro_quiet_signs'],surprised:['reconsidering_omen']},
  edrin:{own_draw:['draw_sigh','useless_card'],other_one_card:['player_one_card_notice'],own_one_card:['edrin_one_card_notice'],other_good_move:['mildly_impressed','approving'],own_good_move:['good_move_casual','good_move_thinking'],brutal:['oh_dear','apologetic'],idle:['drinking','idle_distracted','looking_for_drink','mug_in_wrong_hand_search'],other_draw:['sympathetic']},
  ragna:{own_draw:['forced_draw_angry','recovering_focus'],other_one_card:['player_one_card_focus','player_one_card_excited'],own_one_card:['ragna_one_card','finish_strong'],other_good_move:['impressed_good_move','game_gets_interesting'],own_good_move:['strong_move_satisfied','keep_up'],idle:['impatient_focus','eyes_on_table'],self_mistake:['angry_at_self'],other_draw:['player_draw_more_fight']},
  bramm:{own_draw:['14_blame_the_deck'],other_one_card:['17_one_card_sober_shock','20_one_card_panic'],other_good_move:['08_dismissive_lucky'],own_good_move:['10_satisfied_good_move','11_showing_off'],setback:['15_defensive_excuse','09_irritated_lucky'],idle:['34_drinking_relaxed','33_muttering'],other_draw:['12_mock_generous']}
});
const RESULT_FACES=Object.freeze({
  kesh:{round_win:'round_win',round_loss:'round_loss',match_win:'match_win',match_loss:'match_loss'},
  edrin:{round_win:'round_win_casual',round_loss:'round_loss',match_win:'match_win_content',match_loss:'match_loss_content'},
  ragna:{round_win:'round_win',round_loss:'round_loss_frustrated',match_win:'match_win_good_fight',match_loss:'match_loss_respect'},
  bramm:{round_win:'27_smug_unbeaten',round_loss:'31_again',match_win:'24_big_victory',match_loss:'30_defeated_sulk'}
});

// ── Banter: curated two-beat exchanges built only from existing recordings ────
// Each runs at most once a match, at most two a match, and only when every line
// is literally true at that moment. Silence beats a wrong line.
const brutal=c=>(c.amount||0)>=4||(c.victimCount??9)<=3;
export const TAVERN_BANTER=Object.freeze([
  {id:'silence_apparently',on:'idle',a:['ragna','ragna_idle_04'],b:['edrin','edrin_idle_01']},
  {id:'pay_attention',on:'slow',a:['ragna','ragna_idle_02'],b:['edrin','edrin_idle_02'],when:(c,s)=>c.current===s.edrin},
  {id:'one_card_pressure',on:'one_card',a:['ragna','ragna_one_card_02'],b:['edrin','edrin_idle_01'],when:(c,s)=>c.actor===s.ragna,chance:.1},
  {id:'demands_admiration',on:'good_move',a:['bramm','bramm_bramm_good_move_02'],b:['kesh','kesh_player_good_move_03'],when:(c,s)=>c.actor===s.bramm},
  {id:'tavern_reviews',on:'idle',a:['bramm','bramm_idle_02'],b:['edrin','edrin_idle_03']},
  {id:'keep_up',on:'good_move',a:['ragna','ragna_good_move_02'],b:['bramm','bramm_excuse_01'],when:(c,s)=>c.actor===s.ragna&&c.victim===s.bramm},
  {id:'two_opinions',on:'good_move',a:['ragna','ragna_player_good_move_01'],b:['bramm','bramm_player_good_move_01'],when:(c,s)=>c.actor!==s.ragna&&c.actor!==s.bramm},
  // Edrin's apologies need a genuinely brutal Curse of his (the same test as his own "brutal" line).
  {id:'sorry_doesnt_count',on:'penalty',a:['edrin','edrin_brutal_move_01'],b:['bramm','bramm_excuse_01'],when:(c,s)=>c.source===s.edrin&&c.victim===s.bramm&&brutal(c)},
  {id:'oh_dear_damn',on:'penalty',a:['edrin','edrin_brutal_move_02'],b:['ragna','ragna_draw_01'],when:(c,s)=>c.source===s.edrin&&c.victim===s.ragna&&brutal(c)},
  {id:'victory_thirst',on:'match_end',a:['bramm','bramm_win_09'],b:['edrin','edrin_match_loss_03'],when:(c,s)=>c.champion===s.bramm,chance:.4},
  {id:'quiet_bramm',on:'slow',a:['bramm','bramm_taunt_02'],b:['ragna','ragna_idle_04'],when:(c,s)=>c.current!==s.bramm&&c.current!==s.ragna},
  // A setback is Bramm's reading of a Shield, a King or a big Curse landing on him.
  {id:'house_rule',on:['skip','king','penalty'],a:['bramm','bramm_excuse_02'],b:['kesh','kesh_annoyed_03'],when:(c,s,type)=>c.victim===s.bramm&&(type!=='penalty'||(c.amount||0)>=4)}
]);

export const reactionFor=(guest,voice)=>AUTHORED_CHARACTERS[guest]?.reactions.find(item=>item.voice===voice)||null;
export const guestHasVoice=(guest,voice,locale)=>!!AUTHORED_CHARACTERS[guest]?.resolveVoice(voice,locale);
export const allTavernVoices=guest=>[...new Set(Object.values(TAVERN_GUEST_POOLS[guest]||{}).flat().concat(guest==='ragna'?['ragna_idle_05']:[]))];

// `seats` maps seat id → guest id (e.g. {p2:'ragna',p3:'bramm'}).
export function createTavernDirector({seats={},random=Math.random,now=()=>Date.now(),locale=()=>'en',initial=null}={}){
  const guestSeats=Object.entries(seats),bySeat=new Map(guestSeats),seatOf=Object.fromEntries(guestSeats.map(([seat,id])=>[id,seat]));
  const scale=guestSeats.length>=2?TWO_GUEST_SCALE:1,T=TAVERN_TIMING;
  const used=new Set(initial?.used||[]),usedWords=new Set(initial?.usedWords||[]),banters=new Set(initial?.banters||[]),casualBy={...(initial?.casualBy||{})};
  let lastSpokenAt=-Infinity,lastBanterAt=-Infinity,eventsSince=99,eventsThisRound=0,casualThisRound=0,highThisRound=0,shouts=initial?.shouts||0,lastFaceAt={},log=[...(initial?.log||[])];
  const words=(guest,voice)=>reactionFor(guest,voice)?.caption?.toLowerCase().replace(/[^a-z ]/g,'').trim();
  const available=(guest,voice,{allowUsed=false}={})=>{
    if(!reactionFor(guest,voice)||!guestHasVoice(guest,voice,locale()))return false;
    if(REQUIRES[voice]&&!used.has(REQUIRES[voice]))return false;
    if(!allowUsed&&(used.has(voice)||usedWords.has(words(guest,voice))))return false;
    return true;
  };
  const OMEN_BY_PHASE={touch:'kesh_omen_01',reading:'kesh_omen_02',realization:'kesh_omen_03'};
  const pick=(guest,trigger,{phase=null}={})=>{
    // Each moment of the stone tell has its own line.
    const pool=(trigger==='omen'?[OMEN_BY_PHASE[phase]].filter(Boolean):(TAVERN_GUEST_POOLS[guest]?.[trigger]||[])).filter(voice=>available(guest,voice));
    // Every line is heard at most once a match; when a pool is spent, that guest stays quiet.
    return pool.length?pool[Math.floor(random()*pool.length)]:null;
  };
  const say=(seat,guest,voice,extra={})=>({seat,guest,voice,reaction:reactionFor(guest,voice),...extra});
  const remember=(lines,{banter=null,trigger=null}={})=>{
    for(const line of lines){used.add(line.voice);usedWords.add(words(line.guest,line.voice));log.push({guest:line.guest,voice:line.voice,trigger,banter,at:Math.round(now())});}
    log=log.slice(-30);lastSpokenAt=now();eventsSince=0;
    if(banter){banters.add(banter);lastBanterAt=now();}
  };
  const cap=guestSeats.length>=2?T.pairGuestCap:T.perGuestCap;
  const gateCasual=guest=>eventsSince>=T.casualEvents&&now()-lastSpokenAt>=T.casualGap&&casualThisRound<1&&(casualBy[guest]||0)<cap;
  const gateHigh=guest=>now()-lastSpokenAt>=T.highGap&&highThisRound<1&&(casualBy[guest]||0)<cap;

  // Which trigger an event means for a given guest seat (null: nothing for them).
  function triggerFor(type,seat,guest,c){
    const own=c.actor===seat;
    switch(type){
      case 'intro':return 'intro';
      case 'idle':return guest==='bramm'&&c.current&&c.current!==seat&&random()<.4?'taunt':guest==='ragna'&&random()<.3?'shout':'idle';
      case 'slow':return c.current&&c.current!==seat?'slow':null;
      case 'move':return guest==='bramm'&&!own&&c.actor?'mock':null;
      case 'good_move':return own?'own_good_move':'other_good_move';
      case 'draw':if(own)return guest==='ragna'&&c.slip?'self_mistake':'own_draw';return guest==='bramm'?'other_draw':null;
      case 'penalty':
        if(c.victim===seat)return (c.amount||0)>=4&&(guest==='bramm'||guest==='kesh')?'setback':'own_draw';
        if(guest==='edrin'&&c.source===seat&&brutal(c))return 'brutal';
        if(guest==='kesh'&&(c.amount||0)>=2)return 'curse';
        return (c.amount||0)>=4?'other_draw':null;
      case 'skip':return c.victim===seat?(guest==='kesh'?'skip':guest==='bramm'?'setback':null):null;
      case 'king':if(guest==='kesh')return 'king';return guest==='bramm'&&c.victim===seat?'setback':null;
      case 'reverse':return guest==='kesh'?'reverse':null;
      case 'one_card':return own?'own_one_card':'other_one_card';
      case 'omen':return guest==='kesh'&&c.actor===seat?'omen':null;
      case 'omen_failed':return guest==='kesh'&&c.actor===seat?'surprised':null;
      case 'round_end':return c.winner===seat?'round_win':'round_loss';
      case 'match_end':return c.champion===seat?'match_win':'match_loss';
      default:return null;
    }
  }
  function faceFor(guest,trigger){const options=FACES[guest]?.[trigger];return options?options[Math.floor(random()*options.length)]:null;}

  function tryBanter(type,c){
    const chanceBase=type==='idle'||type==='slow'?T.idleBanterChance:T.banterChance;
    if(banters.size>=T.maxBanters||now()-lastBanterAt<T.banterGap)return null;
    if(type!=='match_end'&&(now()-lastSpokenAt<T.casualGap||eventsSince<T.casualEvents||casualThisRound>=1))return null;
    const candidates=TAVERN_BANTER.filter(b=>[].concat(b.on).includes(type)&&!banters.has(b.id)&&seatOf[b.a[0]]&&seatOf[b.b[0]]&&(type==='match_end'||((casualBy[b.a[0]]||0)<cap&&(casualBy[b.b[0]]||0)<cap))&&(!b.when||b.when(c,seatOf,type))&&available(b.a[0],b.a[1])&&available(b.b[0],b.b[1]));
    if(type==='slow'||type==='idle')for(const b of [...candidates])if(b.a[1]==='ragna_idle_04'||b.b[1]==='ragna_idle_04')if(shouts>=1)candidates.splice(candidates.indexOf(b),1);
    for(const b of candidates){
      if(random()>(b.chance??chanceBase))continue;
      const lines=[say(seatOf[b.a[0]],b.a[0],b.a[1]),say(seatOf[b.b[0]],b.b[0],b.b[1],{pause:600+Math.floor(random()*900)})];
      if([b.a[1],b.b[1]].includes('ragna_idle_04'))shouts++;
      remember(lines,{banter:b.id,trigger:type});
      for(const line of lines)if(!RESULT.has(type))casualBy[line.guest]=(casualBy[line.guest]||0)+1;
      if(type!=='match_end')casualThisRound++;
      return {banter:b.id,lines};
    }
    return null;
  }

  // One table event → at most one line (or one banter), plus a few silent faces.
  function event(type,c={}){
    if(!guestSeats.length)return {faces:[],lines:[]};
    const counted=!['idle','slow','omen','intro'].includes(type);
    if(counted){eventsSince++;eventsThisRound++;}
    const faces=[],guestsInvolved=guestSeats.map(([seat,guest])=>({seat,guest,trigger:triggerFor(type,seat,guest,c)})).filter(item=>item.trigger);
    const result=type==='round_end'||type==='match_end';
    let plan=null;
    if(!c.busy&&!c.muted){
      plan=tryBanter(type,c);
      if(!plan){
        // One line per event at most. Results: the winner first, then (rarely) one of the losing guests.
        const order=result?guestsInvolved.toSorted((a,b)=>(b.trigger.endsWith('win')?1:0)-(a.trigger.endsWith('win')?1:0)||random()-.5):guestsInvolved.toSorted(()=>random()-.5);
        for(const item of order){
          const {seat,guest,trigger}=item,high=HIGH.has(trigger),isResult=RESULT.has(trigger);
          if(trigger==='intro'&&c.introDone)break;
          if(trigger==='shout'&&shouts>=1)continue;
          if(!isResult&&trigger!==INTRO&&!(high?gateHigh(guest):gateCasual(guest)))continue;
          const voice=pick(guest,trigger,{phase:c.phase});if(!voice)continue;
          // One roll per moment for the whole table: the first guest who could speak gets the chance, nobody else.
          const chance=(TAVERN_TRIGGER_CHANCE[trigger]??0)*TAVERN_GUEST_TALK[guest]*(isResult||trigger===INTRO?1:scale);
          if(random()>chance)break;
          const lines=[say(seat,guest,voice)];
          const follow=FOLLOW_UPS[voice];if(follow&&random()<follow.chance&&available(guest,follow.voice,{allowUsed:true}))lines.push(say(seat,guest,follow.voice,{pause:follow.delay}));
          if(trigger==='shout')shouts++;
          remember(lines,{trigger});
          if(!isResult&&trigger!==INTRO){if(high)highThisRound++;else casualThisRound++;casualBy[guest]=(casualBy[guest]||0)+1;}
          plan={lines};break;
        }
      }
    }
    // Faces: everyone involved who is not speaking may react silently; results hold their face.
    const speaking=new Set((plan?.lines||[]).map(line=>line.seat));
    for(const {seat,guest,trigger} of guestsInvolved){
      if(speaking.has(seat))continue;
      if(result){const face=RESULT_FACES[guest]?.[trigger];if(face)faces.push({seat,expression:face,duration:0});continue;}
      const face=faceFor(guest,trigger);if(!face)continue;
      if(now()-(lastFaceAt[seat]||-Infinity)<2500&&!HIGH.has(trigger))continue;
      if(random()>(HIGH.has(trigger)?.9:trigger==='idle'?.6:.55))continue;
      lastFaceAt[seat]=now();faces.push({seat,expression:face,duration:HIGH.has(trigger)?2100:1700});
    }
    return {faces,lines:plan?.lines||[],banter:plan?.banter||null};
  }
  return Object.freeze({
    event,
    beginRound(){casualThisRound=0;highThisRound=0;eventsThisRound=0;eventsSince=99;},
    seats:()=>({...seats}),seatOf:guest=>seatOf[guest]||null,
    // Debug: play a given line or banter regardless of chance (still never repeats a banter).
    force(voice){const entry=guestSeats.find(([,guest])=>reactionFor(guest,voice));if(!entry)return null;const lines=[say(entry[0],entry[1],voice)];remember(lines,{trigger:'debug'});return {lines,faces:[]};},
    forceBanter(id){const b=TAVERN_BANTER.find(item=>item.id===id);if(!b||!seatOf[b.a[0]]||!seatOf[b.b[0]])return null;const lines=[say(seatOf[b.a[0]],b.a[0],b.a[1]),say(seatOf[b.b[0]],b.b[0],b.b[1],{pause:900})];remember(lines,{banter:b.id,trigger:'debug'});return {lines,faces:[],banter:b.id};},
    snapshot:()=>({seats:{...seats},used:[...used],usedWords:[...usedWords],banters:[...banters],casualBy:{...casualBy},shouts,log:log.map(item=>({...item}))}),
    cooldown:()=>({quietMs:Number.isFinite(lastSpokenAt)?Math.round(now()-lastSpokenAt):null,casualReadyInMs:Math.max(0,Math.round(T.casualGap-(now()-lastSpokenAt)))||0,eventsSince,casualThisRound,highThisRound,banterReadyInMs:Math.max(0,Math.round(T.banterGap-(now()-lastBanterAt)))||0,bantersThisMatch:banters.size})
  });
}
