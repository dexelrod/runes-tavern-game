import { createExpressionPreloader } from './expression-preload.js';
import { AUTHORED_PRIORITY_RANK, createAuthoredController } from './authored-controller.js';

// ─────────────────────────────────────────────────────────────────────────────
// EDRIN — the quiet tavern regular.
// Same character framework as Bramm (reaction table → controller → shared
// expression stage, speech bubble and Web Audio voice channel), very different
// behaviour: he speaks rarely, reacts mostly with his face, never panics, and
// treats his own excellent play as something that just sort of happened.
// ─────────────────────────────────────────────────────────────────────────────

const voiceAsset=name=>new URL(`../assets/edrin/voice/${name}.mp3`,import.meta.url).href;
const MISSING_VOICE_URL=new URL('../assets/edrin/voice/__missing__.mp3',import.meta.url).href;

// Character pack manifest (edrin_character_pack/implementation/edrin_expression_manifest.json).
// Every file shares one 512×768 transparent canvas, so expressions stay anchored.
export const EDRIN_EXPRESSION_FILES=Object.freeze({
  default:'01_default',intro_reluctant:'02_intro_reluctant',looking_for_drink:'03_looking_for_drink',casual_acceptance:'04_casual_acceptance',
  idle_distracted:'05_idle_distracted',idle_muttering:'06_idle_muttering',mildly_impressed:'07_mildly_impressed',surprised:'08_surprised',
  approving:'09_approving',good_move_casual:'10_good_move_casual',good_move_surprised:'11_good_move_surprised',good_move_thinking:'12_good_move_thinking',
  sympathetic:'13_sympathetic',draw_sigh:'14_draw_sigh',useless_card:'15_useless_card',player_one_card_notice:'16_player_one_card_notice',
  player_one_card_mild_concern:'17_player_one_card_mild_concern',edrin_one_card_notice:'18_edrin_one_card_notice',edrin_one_card_confused:'19_edrin_one_card_confused',
  round_win_surprised:'20_round_win_surprised',round_win_casual:'21_round_win_casual',round_win_looking_for_drink:'22_round_win_looking_for_drink',
  round_loss:'23_round_loss',round_loss_distracted:'24_round_loss_distracted',match_win_surprised:'25_match_win_surprised',match_win_content:'26_match_win_content',
  match_loss_content:'27_match_loss_content',match_loss_confused:'28_match_loss_confused',match_loss_brightening:'29_match_loss_brightening',
  apologetic:'30_apologetic',oh_dear:'31_oh_dear',drinking:'32_drinking',mug_in_wrong_hand_search:'33_mug_in_wrong_hand_search',focused:'34_focused',
  // v115: shouted back into his chair (the drink exchanges).
  scolded:'35_scolded'
});
export const EDRIN_EXPRESSIONS=Object.freeze(Object.keys(EDRIN_EXPRESSION_FILES));
export const EDRIN_DEFAULT_EXPRESSION='default';
export const edrinExpressionURL=(name=EDRIN_DEFAULT_EXPRESSION)=>new URL(`../assets/edrin/expressions/edrin_${EDRIN_EXPRESSION_FILES[name]||EDRIN_EXPRESSION_FILES.default}.webp`,import.meta.url).href;
const preloader=createExpressionPreloader({names:EDRIN_EXPRESSIONS,urlFor:edrinExpressionURL,label:'Edrin'});
export const preloadEdrinExpressions=()=>preloader.preload();
export const edrinExpressionsReady=()=>preloader.ready();

export const normalizeEdrinLocale=locale=>locale==='he'?'he':'en';

// Presentation states. Most of a match is spent in `default`. `mildly_concerned`
// holds while the player sits on one card; `result` holds the result face until
// the next hand. The others are brief, expression-only beats.
export const EDRIN_STATES=Object.freeze(['default','focused','mildly_pleased','mildly_concerned','distracted','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'default',focused:'focused',mildly_pleased:'approving',mildly_concerned:'player_one_card_mild_concern',distracted:'idle_distracted',result:null});

export const EDRIN_PRIORITY_RANK=AUTHORED_PRIORITY_RANK;

// Authored script (Edrin Script.txt). Performance directions in brackets are
// never shown. Hebrew is authored localisation and is reproduced exactly.
// `seconds` is the longer of the two recorded takes; it only sizes the bubble
// when a voice file cannot be played.
const line=(id,trigger,en,he,expression,priority,seconds,extra={})=>Object.freeze({
  id,trigger,voice:`edrin_${id}`,caption:en,captions:Object.freeze({en,he}),expression,priority,
  category:extra.category||trigger,duration:Math.round(seconds*1000)+650,probability:extra.probability??1,cooldown:extra.cooldown??0,nextState:extra.nextState||null,weight:extra.weight||null
});

export const EDRIN_REACTIONS=Object.freeze([
  line('intro_01','intro','Right... one game, then.','טוב... משחק אחד וזהו.','intro_reluctant','CRITICAL',2.69,{category:'intro'}),
  line('intro_02','intro',"Hang on. Where's my drink?",'רגע... איפה השתייה שלי?','looking_for_drink','CRITICAL',3.0,{category:'intro'}),
  line('intro_03','intro','"Runes", is it? Fine.','"רונות", אה? שיהיה.','casual_acceptance','CRITICAL',2.35,{category:'intro'}),

  line('idle_01','idle_quiet','Got any ale or mead?','יש בירה? יין?','idle_distracted','LOW',2.59,{category:'idle',probability:.3}),
  line('idle_02','idle_quiet',"Could've sworn I had a drink.",'הייתי בטוח שהזמנתי משהו לשתות.','idle_muttering','LOW',2.93,{category:'idle',probability:.3}),
  line('idle_03','idle_quiet','Nice tavern, mostly.','טברנה נחמדה. בערך.','default','LOW',3.32,{category:'idle',probability:.3}),

  line('player_good_move_01','player_good_move',"Hm. That's clever.",'הממ. זה היה חכם.','mildly_impressed','MEDIUM',2.51,{probability:.2}),
  line('player_good_move_02','player_good_move',"Oh. Didn't expect that.",'אה. לזה לא ציפיתי.','surprised','MEDIUM',2.59,{probability:.2,weight:({big})=>big?2.5:1}),
  line('player_good_move_03','player_good_move','Nice one.','יפה.','approving','MEDIUM',1.49,{probability:.2}),

  line('good_move_01','edrin_good_move','There we are.','הנה, הנה..','good_move_casual','LOW',1.72,{probability:.15}),
  line('good_move_02','edrin_good_move','That worked.','אה. זה עבד.','good_move_surprised','LOW',2.04,{probability:.15}),
  line('good_move_03','edrin_good_move','Seemed like the right card.','נראה שזה היה הקלף הנכון.','good_move_thinking','LOW',2.19,{probability:.15}),

  line('player_draw_01','player_draw',"Ah. That's unfortunate.",'אה. לא נעים.','sympathetic','LOW',2.69,{probability:.12}),

  line('draw_01','edrin_draw',"Suppose I'll have that, then.",'טוב, נראה מה יש לזה להציע.','draw_sigh','LOW',3.79,{category:'edrin_draw',probability:.1,weight:({bad})=>bad?1:3}),
  line('draw_02','edrin_draw','Hm. Useless little thing.','הממ. קלף מיותר.','useless_card','LOW',3.47,{category:'edrin_draw',probability:.1,weight:({bad})=>bad?3:1}),

  // Player reaches one card: attentive, never panicked. 03 was cut from the script.
  line('player_one_card_01','player_one_card',"That's your last one, is it?",'קלף אחרון, אה?','player_one_card_notice','HIGH',3.08,{probability:.5,nextState:'mildly_concerned',weight:({scares})=>scares?1:2}),
  line('player_one_card_02','player_one_card','Hm. Probably ought to do something about that.','הממ. כנראה כדאי לעשות עם זה משהו.','player_one_card_mild_concern','HIGH',3.4,{probability:.5,nextState:'mildly_concerned',weight:({scares})=>scares?2:1}),

  line('one_card_01','edrin_one_card','Huh. Only one left.','קלף אחרון.','edrin_one_card_notice','MEDIUM',2.51,{probability:.42}),
  line('one_card_02','edrin_one_card',"That's good, isn't it?",'זה בסדר, לא?','edrin_one_card_confused','MEDIUM',2.27,{probability:.42}),

  line('brutal_move_01','brutal_move','Sorry about that.','סליחה על זה.','apologetic','MEDIUM',1.88,{probability:.5}),
  line('brutal_move_02','brutal_move','Oh dear.','אוי ואבוי.','oh_dear','MEDIUM',2.04,{probability:.5}),

  // Results. Round lines only while the match continues; match lines only at the end.
  line('round_win_01','round_win','Oh. I won.','אה. ניצחתי.','round_win_surprised','CRITICAL',1.96,{category:'result',nextState:'result',weight:({firstWin})=>firstWin?3:1}),
  line('round_win_02','round_win','Right. Another one, then.','טוב. עוד אחד, אז.','round_win_casual','CRITICAL',2.12,{category:'result',nextState:'result'}),
  line('round_win_03','round_win','Is there time for a sip?','יש זמן לשתות משהו?','round_win_looking_for_drink','CRITICAL',2.27,{category:'result',nextState:'result'}),
  // The second round-loss take was cut from the script.
  line('round_loss_01','round_loss','Ah. Lost that one.','אה. את זה הפסדתי.','round_loss','CRITICAL',2.43,{category:'result',nextState:'result'}),
  line('round_loss_03','round_loss','Another? Right.','עוד אחד? טוב.','round_loss_distracted','CRITICAL',2.12,{category:'result',nextState:'result'}),
  // The first match-win take was cut from the script.
  line('match_win_02','match_win',"Oh. That's it, then.",'אה, סיימנו?','match_win_surprised','CRITICAL',2.19,{category:'result',nextState:'result'}),
  line('match_win_03','match_win','Good. Drink time.','יופי. זמן לשתות.','match_win_content','CRITICAL',2.12,{category:'result',nextState:'result'}),
  line('match_loss_01','match_loss','Yes, yes... now, to find myself a drink.','כן... עכשיו למצוא משהו לשתות.','match_loss_content','CRITICAL',4.36,{category:'result',nextState:'result'}),
  line('match_loss_02','match_loss','Ah. Lost, did I?','אה, זהו?','match_loss_confused','CRITICAL',2.43,{category:'result',nextState:'result'}),
  line('match_loss_03','match_loss','Never mind. Ale.','לא נורא. בירה.','match_loss_brightening','CRITICAL',2.12,{category:'result',nextState:'result'})
]);

// Recorded takes that were not delivered. The English take of idle_03 does not
// exist, so in English that line is simply not chosen.
const UNRECORDED=Object.freeze({edrin_idle_03:Object.freeze(['en'])});
const debugMissing=new Set();
export function debugMarkEdrinVoiceMissing(name,missing=true){if(missing)debugMissing.add(name);else debugMissing.delete(name);return [...debugMissing];}
const hasVoice=(voice,locale)=>!(UNRECORDED[voice]||[]).includes(normalizeEdrinLocale(locale));

export const EDRIN_VOICE_LIBRARY=Object.freeze(Object.fromEntries(EDRIN_REACTIONS.map(item=>[item.voice,Object.freeze({
  src:voiceAsset(item.voice),
  sources:Object.freeze({en:voiceAsset(item.voice),he:voiceAsset(`${item.voice}_he`)}),
  caption:item.caption,captions:item.captions,priority:item.priority
})])));

export function resolveEdrinVoice(name,locale='en'){
  const definition=EDRIN_VOICE_LIBRARY[name];if(!definition)return null;
  const resolved=normalizeEdrinLocale(locale);if(!hasVoice(name,resolved))return null;
  return {name,locale:resolved,src:debugMissing.has(name)?MISSING_VOICE_URL:definition.sources[resolved],caption:definition.captions[resolved],priority:definition.priority};
}
export function resolveEdrinReaction(reaction,locale='en'){
  if(!reaction)return null;const resolved=normalizeEdrinLocale(locale);
  return {...reaction,voice:reaction.voice&&hasVoice(reaction.voice,resolved)?reaction.voice:null,locale:resolved,caption:reaction.captions?.[resolved]??reaction.caption};
}

// Expression-only beats. Edrin's face reacts far more often than he speaks.
// `always` beats ignore the visual throttle; everything else waits a moment so
// the artwork never cycles quickly.
const VISUALS=Object.freeze({
  player_good_move:{p:.7,duration:1700,pick:(ctx,r)=>ctx.big?'surprised':r()<.6?'mildly_impressed':'approving'},
  edrin_good_move:{p:.4,duration:1500,pick:(ctx,r)=>r()<.5?'good_move_casual':'good_move_thinking'},
  player_draw:{p:ctx=>(ctx.amount||1)>=2?.45:.16,duration:1600,pick:()=>'sympathetic'},
  edrin_draw:{p:ctx=>(ctx.amount||1)>=2||ctx.bad?.6:.22,duration:1600,pick:ctx=>(ctx.amount||1)>=2||ctx.bad?'useless_card':'draw_sigh'},
  player_one_card:{p:1,always:true,duration:1900,pick:()=>'player_one_card_notice'},
  edrin_one_card:{p:1,always:true,duration:2000,pick:()=>'edrin_one_card_notice'},
  brutal_move:{p:1,always:true,duration:2000,pick:(ctx,r)=>r()<.5?'oh_dear':'apologetic'},
  edrin_considering:{p:.55,duration:1300,pick:()=>'focused'},
  idle_beat:{p:.55,duration:2600,pick:(ctx,r)=>ctx.concerned?'focused':['idle_distracted','drinking','mug_in_wrong_hand_search','looking_for_drink'][Math.floor(r()*4)]},
  one_card_settled:{p:.5,always:true,duration:1700,pick:()=>'drinking'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','edrin_considering','one_card_settled']);
const VISUAL_GAP=2400,CASUAL_GAP=11000,CASUAL_EVENTS=3,HIGH_GAP=4000,IDLE_QUIET=18000;

// Turn one table update into at most one Edrin trigger. Only public facts are
// used: what was played, who drew, and how many cards each side holds.
export function edrinEventFor({played=null,playedCard=null,stop=null,stack=null,penalty=null,draw=null,closed=null,crossbowRun=0,humanCount,edrinCount,oldHuman=humanCount,oldEdrin=edrinCount}={}){
  const humanMove=played?.playerId==='p0',edrinMove=played?.playerId==='p1',power=['king','plus2','superTaki'].includes(playedCard?.type);
  if(oldHuman>1&&humanCount===1)return ['player_one_card',{}];
  // Brutal: a big stacked Curse, dragging the player off their last card, or a long Crossbow volley.
  if(penalty?.playerId==='p0'&&((penalty.amount||0)>=4||oldHuman===1))return ['brutal_move',{amount:penalty.amount,savedTheRound:oldHuman===1}];
  if(edrinMove&&closed&&crossbowRun>=4)return ['brutal_move',{chain:crossbowRun}];
  if(oldEdrin>1&&edrinCount===1)return ['edrin_one_card',{}];
  if(penalty?.playerId==='p1')return ['edrin_draw',{amount:penalty.amount||2,bad:true}];
  if(draw?.playerId==='p1')return ['edrin_draw',{amount:1,bad:false}];
  if(penalty?.playerId==='p0')return ['player_draw',{amount:penalty.amount||2}];
  if(draw?.playerId==='p0')return ['player_draw',{amount:1}];
  if(humanMove&&(playedCard?.type==='king'||(stack?.amount||0)>=4||(closed&&crossbowRun>=3)||(stop&&edrinCount<=2)))return ['player_good_move',{big:playedCard?.type==='king'||(stack?.amount||0)>=4||crossbowRun>=4}];
  if(edrinMove&&(stack||power||(closed&&crossbowRun>=2)||(stop&&humanCount<=3)))return ['edrin_good_move',{}];
  if(edrinMove)return ['edrin_move',{}];
  if(humanMove)return ['player_neutral_move',{}];
  return null;
}

// Edrin's rules on the shared authored-character controller.
const EDRIN_SPEC=Object.freeze({
  reactions:EDRIN_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:EDRIN_STATES,
  persistentStates:['default','mildly_concerned','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:'default',
  timing:{visualGap:VISUAL_GAP,casualGap:CASUAL_GAP,casualEvents:CASUAL_EVENTS,highGap:HIGH_GAP,highBudget:3,idleQuiet:IDLE_QUIET},
  counters:{scares:0,roundWins:0,intros:0},
  hasVoice,
  probabilityOf:(reaction,context)=>reaction.trigger==='edrin_draw'&&((context.amount||1)>=2||context.bad)?.2:reaction.probability,
  // First encounter: one line. Later matches: a line, a look, or nothing.
  planIntro:(context,random)=>context.firstEncounter?'voice':random()<.45?'voice':random()<.64?'expression':'none',
  introLook:random=>({expression:['intro_reluctant','casual_acceptance','looking_for_drink'][Math.floor(random()*3)],duration:2200}),
  suppress(trigger,context){
    // Still mid-turn on his last card, he is about to finish: the round result will speak instead.
    if(trigger==='edrin_one_card'&&context.ownTurn)return true;
    // The player still holds the turn and may go straight out; he just looks.
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    return false;
  },
  enrich(trigger,context,counters){
    if(trigger==='round_win'&&!counters.roundWins)context={...context,firstWin:true};
    if(trigger==='round_win')counters.roundWins++;
    if(trigger==='player_one_card')context={...context,scares:counters.scares};
    return context;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    if(reaction.category!=='idle')return false;
    if(sinceQuiet<timing.idleQuiet||context.playerOnOneCard)return true;
    return counters.idleThisRound>=2||(counters.idleThisRound===1&&counters.eventsThisRound<60);
  },
  onSpoken(trigger,counters){if(trigger==='player_one_card')counters.scares++;},
  onObserve(trigger,context,{setBase}){if(trigger==='player_one_card')setBase('mildly_concerned');},
  transientFor(trigger,expression){
    if(trigger==='edrin_considering')return 'focused';
    if(trigger==='idle_beat'&&expression!=='focused')return 'distracted';
    if(['player_good_move','edrin_good_move'].includes(trigger)&&expression!=='surprised')return 'mildly_pleased';
    return null;
  },
  // The player drew off their last card: Edrin relaxes. Sometimes he has a sip.
  recovery:{from:'mildly_concerned',to:'default',visual:'one_card_settled'}
});
export function createEdrinController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(EDRIN_SPEC,{random,now,initial});
}
