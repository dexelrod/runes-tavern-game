import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';
import { createVoiceCatalog, lineFactory, normalizeLocale } from './authored-pack.js';

// ─────────────────────────────────────────────────────────────────────────────
// THE BOUNTY HUNTER (צייד הראשים). Seventh authored opponent, built on the
// shared pack (duel/authored-pack.js) like Veyra and Gorvan. He has no personal
// name and none is ever given.
//
// A professional with time to kill: there is a table, there are cards, and he is
// waiting for something else anyway. Monotone, practical, terse, a little
// judgemental, fully attentive and emotionally flat. Not tragic, not brooding,
// not theatrical, not trying to look dangerous. His lack of enthusiasm is the
// character, so nothing here tries to animate him.
//
// THE HELMET IS HIS FACE. It never comes off, the visor stays dark and its
// geometry never changes. His acting is head angle, shoulders, hands, card
// handling, pauses and stillness — the smallest physical range in the cast — so
// most of his reactions are silent and he is one of the quietest voices at the
// table. His big script exists so he never repeats himself, not so he talks.
//
// His voice is English only (no `_he` files exist or are looked for). In Hebrew
// the bubble shows the authored Hebrew text over the English take — the same
// rule as Gorvan. His AI (game-ai/veteran.js → THREAT_PROFILE) is a fair,
// practical risk assessor; there are no bounty mechanics of any kind.
// ─────────────────────────────────────────────────────────────────────────────

// Character pack (bounty_hunter_character_pack, design C, locked). 17 seated states,
// 16 paintings (the fixed stare is the neutral painting held longer — by design).
// Every pose is the same 1760 px crop of its shared 2048 px canvas (x 144–1904,
// y 160–1920: the union of every pose's bounds), scaled uniformly to 640×640, so a
// swap never jumps. Never mirrored: the straps, belt case and wear are asymmetric;
// the separate left/right glances are chosen from the real seating.
export const BOUNTY_HUNTER_EXPRESSION_FILES=Object.freeze({
  neutral:'01_neutral',attention:'02_attention',approval:'03_approval',doubtful:'04_doubtful',fixed_stare:'01_neutral',
  dismissal:'06_dismissal',focus:'07_focus',resigned:'08_resigned',rare_amusement:'09_rare_amusement',
  partner_left:'10_partner_left',partner_right:'11_partner_right',hand_glance:'12_hand_glance',adjustment:'13_adjustment',
  card_inspect:'14_card_inspect',card_place:'15_card_place',firm_stop:'16_firm_stop',
  // v115: the one time he raises his voice ("SIT. DOWN."). Same 1760 px crop as every pose.
  sit_down:'17_sit_down'
});
export const BOUNTY_HUNTER_EXPRESSIONS=Object.freeze(Object.keys(BOUNTY_HUNTER_EXPRESSION_FILES));
export const BOUNTY_HUNTER_DEFAULT_EXPRESSION='neutral';
export const bountyHunterExpressionURL=(name=BOUNTY_HUNTER_DEFAULT_EXPRESSION)=>new URL(`../assets/bounty_hunter/expressions/bounty_hunter_${BOUNTY_HUNTER_EXPRESSION_FILES[name]||BOUNTY_HUNTER_EXPRESSION_FILES[BOUNTY_HUNTER_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
// The resting state and the looks that come first decode before he sits down; the
// rest (card handling, the left/right glances, the rare one) follow in the background.
export const BOUNTY_HUNTER_CRITICAL_EXPRESSIONS=Object.freeze(['neutral','attention','approval','focus','hand_glance','doubtful','resigned']);
const preloader=createExpressionPreloader({names:BOUNTY_HUNTER_EXPRESSIONS,urlFor:bountyHunterExpressionURL,label:'Bounty Hunter',critical:BOUNTY_HUNTER_CRITICAL_EXPRESSIONS});
export const preloadBountyHunterExpressions=()=>preloader.preload();
export const bountyHunterExpressionsReady=()=>preloader.ready();
// Where he looks when someone else at a Tavern table speaks (or when he answers them):
// toward their actual seat. `ahead` is the player.
export const BOUNTY_HUNTER_LOOKS=Object.freeze({left:'partner_left',right:'partner_right',ahead:'attention'});

// Presentation states. `default`: still, attentive. The player's last card: `watchful`
// — professional focus, hands ready (new problem identified). His own last card:
// `certain`, which looks exactly like default: quiet progress, no gloating.
export const BOUNTY_HUNTER_STATES=Object.freeze(['default','attentive','watchful','certain','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'neutral',attentive:'neutral',watchful:'focus',certain:'neutral',result:null});

// The approved script (Bounty Hunter script.txt), verbatim. Performance tags ([monotone],
// [flatly], [same tone]…) are VO direction only and are not part of the text. `he` is the
// supplied Hebrew localisation, exactly; `s` the take in seconds.
// The script has no Turnabout, Quickstep, Rune or Frost lines (deleted): those cards get
// a look at most, never words.
export const BOUNTY_HUNTER_SCRIPT=Object.freeze({
  intro_01:{en:"Hello.",he:"שלום.",s:0.99},
  intro_02:{en:"I'm here for the game.",he:"באתי בשביל המשחק.",s:1.72},
  intro_03:{en:"No contract. Relax.",he:"אין חוזה. אפשר להירגע.",s:2.35},
  intro_04:{en:"Deal.",he:"לחלק.",s:1.15},
  intro_05:{en:"We don't need introductions.",he:"אין צורך בהיכרות.",s:1.96},
  idle_01:{en:"Your turn.",he:"תורך.",s:1.15},
  idle_02:{en:"Still here.",he:"עדיין פה.",s:1.41},
  idle_03:{en:"I've waited longer.",he:"חיכיתי יותר מזה.",s:1.65},
  idle_04:{en:"Quiet table.",he:"שולחן שקט.",s:1.49},
  idle_05:{en:"Good.",he:"יופי.",s:1.07},
  idle_06:{en:"This is taking a while.",he:"זה לוקח זמן.",s:2.12},
  idle_07:{en:"Better than watching a road.",he:"עדיף מלשמור על דרך.",s:2.04},
  player_good_move_01:{en:"Good.",he:"טוב.",s:1.15},
  player_good_move_02:{en:"Competent.",he:"מקצועי.",s:1.23},
  player_good_move_03:{en:"Didn't expect that.",he:"לזה לא ציפיתי.",s:1.8},
  player_good_move_04:{en:"Clean.",he:"נקי.",s:1.15},
  player_good_move_05:{en:"That works.",he:"זה עובד.",s:1.23},
  good_move_01:{en:"Done.",he:"בוצע.",s:1.07},
  good_move_02:{en:"That works.",he:"זה עובד.",s:1.41},
  good_move_03:{en:"Better.",he:"יותר טוב.",s:1.07},
  good_move_04:{en:"Next.",he:"הבא.",s:1.23},
  player_draw_01:{en:"Draw.",he:"למשוך.",s:1.15},
  player_draw_02:{en:"Bad hand.",he:"יד גרועה.",s:1.49},
  player_draw_03:{en:"Happens.",he:"קורה.",s:2.12},
  draw_01:{en:"Fine.",he:"בסדר.",s:1.15},
  draw_02:{en:"Useless.",he:"חסר תועלת.",s:1.31},
  draw_03:{en:"Another.",he:"עוד אחד.",s:1.07},
  draw_04:{en:"Could be worse.",he:"יכול להיות גרוע יותר.",s:1.65},
  player_one_card_01:{en:"One left.",he:"נשאר אחד.",s:1.41},
  player_one_card_02:{en:"That's a problem.",he:"זאת בעיה.",s:1.57},
  player_one_card_03:{en:"Need to stop that.",he:"צריך לעצור את זה.",s:1.8},
  player_one_card_04:{en:"Alright.",he:"טוב.",s:1.23},
  one_card_01:{en:"Last one.",he:"אחרון.",s:1.23},
  one_card_02:{en:"Almost done.",he:"כמעט סיימנו.",s:1.49},
  one_card_03:{en:"Your move.",he:"תורך.",s:1.41},
  curse_01:{en:"Take two.",he:"קח שניים.",s:1.23},
  curse_02:{en:"That should slow you down.",he:"זה אמור להאט אותך.",s:2.04},
  curse_received_01:{en:"Of course.",he:"ברור.",s:1.31},
  curse_received_02:{en:"Fine.",he:"בסדר.",s:1.07},
  stop_01:{en:"Stop.",he:"עצור.",s:1.15},
  stop_02:{en:"Not happening.",he:"לא יקרה.",s:1.49},
  crossbow_01:{en:"Let's clear these.",he:"בוא ניפטר מאלה.",s:1.65},
  crossbow_02:{en:"Good.",he:"טוב.",s:1.07},
  runed_crossbow_01:{en:"Useful.",he:"שימושי.",s:1.57},
  runed_crossbow_02:{en:"That saves time.",he:"זה חוסך זמן.",s:1.65},
  king_01:{en:"King.",he:"מלך.",s:0.99},
  king_02:{en:"Useful card.",he:"קלף שימושי.",s:1.57},
  round_win_01:{en:"Good.",he:"טוב.",s:1.07},
  round_win_02:{en:"Again.",he:"שוב.",s:1.15},
  round_win_03:{en:"One down.",he:"אחד מאחורינו.",s:1.49},
  round_win_04:{en:"Keep dealing.",he:"תמשיך לחלק.",s:1.31},
  round_loss_01:{en:"Again.",he:"שוב.",s:1.15},
  round_loss_02:{en:"My mistake.",he:"טעות שלי.",s:1.49},
  round_loss_03:{en:"Misjudged that.",he:"הערכתי את זה לא נכון.",s:1.8},
  round_loss_04:{en:"Deal.",he:"לחלק.",s:1.15},
  match_win_01:{en:"That's it.",he:"זהו.",s:1.23},
  match_win_02:{en:"Good game.",he:"משחק טוב.",s:1.31},
  match_win_03:{en:"Time well spent.",he:"הזמן עבר טוב.",s:1.8},
  match_win_04:{en:"I'll be around.",he:"אהיה בסביבה.",s:1.41},
  match_loss_01:{en:"You won.",he:"ניצחת.",s:1.23},
  match_loss_02:{en:"Fair enough.",he:"הוגן.",s:1.31},
  match_loss_03:{en:"Again, if you want.",he:"שוב, אם בא לך.",s:2.19},
  match_loss_04:{en:"I'll remember that.",he:"אני אזכור את זה.",s:1.8}
});
export const BOUNTY_HUNTER_DELETED=Object.freeze(['turnabout_01','turnabout_02','quickstep_01','quickstep_02','rune_01','rune_02','frost_01','frost_02']);

const line=lineFactory({prefix:'bounty_hunter',script:BOUNTY_HUNTER_SCRIPT});
const result={category:'result',nextState:'result'};
const intro={category:'intro'};

export const BOUNTY_HUNTER_REACTIONS=Object.freeze([
  // Almost aggressively ordinary. A first meeting is always "Hello."
  line('intro_01','intro','neutral','CRITICAL',{...intro,weight:({firstEncounter})=>firstEncounter?1:1.2}),
  line('intro_02','intro','neutral','CRITICAL',{...intro,when:({firstEncounter})=>!firstEncounter}),
  line('intro_03','intro','attention','CRITICAL',{...intro,when:({firstEncounter})=>!firstEncounter}),
  line('intro_04','intro','neutral','CRITICAL',{...intro,when:({firstEncounter})=>!firstEncounter}),
  line('intro_05','intro','neutral','CRITICAL',{...intro,when:({firstEncounter})=>!firstEncounter,weight:()=>.7}),

  // Quiet stretches. Rare, and they need real quiet.
  line('idle_02','idle_quiet','neutral','LOW',{category:'idle',probability:.11}),
  line('idle_04','idle_quiet','neutral','LOW',{category:'idle',probability:.11}),
  line('idle_05','idle_quiet','approval','LOW',{category:'idle',probability:.08}),
  line('idle_07','idle_quiet','adjustment','LOW',{category:'flavor',probability:.12}),
  // A player who sits on a decision. At most once a match.
  line('idle_01','slow_player','attention','LOW',{category:'idle',probability:.34}),
  line('idle_03','slow_player','neutral','LOW',{category:'idle',probability:.3}),
  line('idle_06','slow_player','fixed_stare','LOW',{category:'idle',probability:.26,when:({longRound})=>!!longRound}),

  // Praise, extremely limited. "Didn't expect that." is significant for him: a real play.
  line('player_good_move_01','player_good_move','approval','MEDIUM',{probability:.11,weight:({big})=>big?.6:1}),
  line('player_good_move_02','player_good_move','approval','MEDIUM',{probability:.11}),
  line('player_good_move_03','player_good_move','attention','MEDIUM',{probability:.11,when:({big})=>!!big,weight:()=>1.5}),
  line('player_good_move_04','player_good_move','approval','MEDIUM',{probability:.11}),
  line('player_good_move_05','player_good_move','approval','MEDIUM',{probability:.11,weight:({big})=>big?.6:1}),

  // His own strong play: functional, no satisfaction.
  line('good_move_01','own_good_move','card_place','LOW',{probability:.06}),
  line('good_move_02','own_good_move','card_place','LOW',{probability:.06}),
  line('good_move_03','own_good_move','card_place','LOW',{probability:.06,weight:({wasBehind})=>wasBehind?2:1}),
  line('good_move_04','own_good_move','card_place','LOW',{probability:.06,weight:({playAgain})=>playAgain?2:1}),

  // The player takes cards. No sympathy, no gloating.
  line('player_draw_01','player_draw','neutral','LOW',{probability:.04,when:({haul})=>!haul}),
  line('player_draw_02','player_draw','neutral','LOW',{probability:.07,weight:({haul})=>haul?2:.6}),
  line('player_draw_03','player_draw','neutral','LOW',{probability:.07}),

  // His own draws: a minor inconvenience.
  line('draw_01','own_draw','hand_glance','LOW',{weight:({forced})=>forced?1.6:1}),
  line('draw_02','own_draw','card_inspect','LOW',{when:({forced})=>!forced}),
  line('draw_03','own_draw','card_inspect','LOW',{when:({drewBefore})=>!!drewBefore,weight:()=>1.6}),
  line('draw_04','own_draw','hand_glance','LOW',{weight:({haul,forced})=>haul?2.4:forced?1:.5}),

  // The player's last card: relaxed → professional attention. A new problem, identified.
  line('player_one_card_01','player_one_card','focus','HIGH',{probability:.5,nextState:'watchful',weight:({persist})=>persist?.3:1.4}),
  line('player_one_card_02','player_one_card','focus','HIGH',{probability:.5,nextState:'watchful'}),
  line('player_one_card_03','player_one_card','focus','HIGH',{probability:.5,nextState:'watchful'}),
  line('player_one_card_04','player_one_card','focus','HIGH',{probability:.5,nextState:'watchful'}),

  // His own last card: quiet progress.
  line('one_card_01','own_one_card','focus','HIGH',{probability:.35,nextState:'certain'}),
  line('one_card_02','own_one_card','neutral','HIGH',{probability:.35,nextState:'certain'}),
  line('one_card_03','own_one_card','neutral','HIGH',{probability:.35,nextState:'certain',when:({playerStillToPlay})=>!!playerStillToPlay}),

  // Special cards. "Take two." is only ever said when it is literally two.
  line('curse_01','own_curse','card_place','MEDIUM',{probability:.3,when:({amount})=>amount===2}),
  line('curse_02','own_curse','card_place','MEDIUM',{probability:.24,weight:({urgent})=>urgent?2:1}),
  line('curse_received_01','curse_taken','resigned','MEDIUM',{probability:.22}),
  line('curse_received_02','curse_taken','resigned','MEDIUM',{probability:.2}),
  line('stop_01','stop_given','firm_stop','MEDIUM',{probability:.2}),
  line('stop_02','stop_given','firm_stop','MEDIUM',{probability:.2,weight:({urgent})=>urgent?2.4:.5}),
  line('crossbow_01','own_crossbow','card_place','MEDIUM',{probability:.26}),
  line('crossbow_02','own_crossbow_done','focus','MEDIUM',{probability:.22}),
  line('runed_crossbow_01','own_runed_crossbow','focus','MEDIUM',{probability:.28}),
  line('runed_crossbow_02','own_runed_crossbow','focus','MEDIUM',{probability:.24,weight:({run})=>(run||0)>=3?1.8:1}),
  line('king_01','own_king','card_inspect','MEDIUM',{probability:.24}),
  line('king_02','own_king','card_inspect','MEDIUM',{probability:.2,weight:({broke})=>broke?2:1}),

  // Results: restrained. A round result may pass with only a look; a match result always speaks.
  line('round_win_01','round_win','approval','CRITICAL',result),
  line('round_win_02','round_win','neutral','CRITICAL',result),
  line('round_win_03','round_win','neutral','CRITICAL',result),
  line('round_win_04','round_win','neutral','CRITICAL',result),
  line('round_loss_01','round_loss','neutral','CRITICAL',result),
  line('round_loss_02','round_loss','hand_glance','CRITICAL',result),
  line('round_loss_03','round_loss','hand_glance','CRITICAL',result),
  line('round_loss_04','round_loss','neutral','CRITICAL',result),
  line('match_win_01','match_win','neutral','CRITICAL',result),
  line('match_win_02','match_win','neutral','CRITICAL',result),
  line('match_win_03','match_win','neutral','CRITICAL',result),
  line('match_win_04','match_win','dismissal','CRITICAL',result),
  line('match_loss_01','match_loss','neutral','CRITICAL',result),
  line('match_loss_02','match_loss','approval','CRITICAL',result),
  line('match_loss_03','match_loss','neutral','CRITICAL',result),
  // "I'll remember that." is not a threat: the same neutral state as everything else.
  line('match_loss_04','match_loss','neutral','CRITICAL',result)
]);

// English recordings only. In Hebrew the bubble shows the supplied Hebrew text over the
// English take — no `_he` files exist and none are looked for (the Gorvan rule).
const catalog=createVoiceCatalog({label:'Bounty Hunter',folder:'bounty_hunter',reactions:BOUNTY_HUNTER_REACTIONS,audioFor:()=>'en'});
export const BOUNTY_HUNTER_VOICE_LIBRARY=catalog.library;
export const resolveBountyHunterVoice=catalog.resolveVoice;
export const resolveBountyHunterReaction=catalog.resolveReaction;
export const debugMarkBountyHunterVoiceMissing=catalog.markMissing;
export const bountyHunterDebugMissingVoices=catalog.forcedMissing;
export const normalizeBountyHunterLocale=normalizeLocale;

// Silent body language: one small movement, held, then back to neutral. This is where
// nearly all of his acting happens. `rare_amusement` is never used here — it belongs to
// one line in one conversation.
const pickOf=(items,r)=>items[Math.floor(r()*items.length)];
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?.75:.4,duration:1700,pick:(ctx,r)=>ctx.big?(r()<.6?'approval':'attention'):(r()<.5?'attention':'approval')},
  own_good_move:{p:.3,duration:1400,pick:(ctx,r)=>r()<.6?'card_place':'hand_glance'},
  own_curse:{p:.45,duration:1400,pick:()=>'card_place'},
  own_crossbow:{p:.4,duration:1500,pick:()=>'card_place'},
  own_crossbow_done:{p:.35,duration:1400,pick:()=>'hand_glance'},
  own_runed_crossbow:{p:.45,duration:1500,pick:()=>'focus'},
  own_king:{p:.45,duration:1500,pick:()=>'card_inspect'},
  player_draw:{p:ctx=>ctx.haul?.4:.12,duration:1400,pick:()=>'attention'},
  own_draw:{p:ctx=>ctx.forced?.5:.3,duration:1500,pick:(ctx,r)=>ctx.haul?'resigned':ctx.forced?(r()<.5?'resigned':'hand_glance'):(r()<.6?'card_inspect':'hand_glance')},
  curse_taken:{p:.55,duration:1700,pick:(ctx,r)=>r()<.7?'resigned':'fixed_stare'},
  curse_landed:{p:.25,duration:1300,pick:()=>'hand_glance'},
  stop_taken:{p:.5,duration:2000,pick:(ctx,r)=>r()<.6?'fixed_stare':'doubtful'},
  stop_given:{p:.45,duration:1400,pick:()=>'firm_stop'},
  king:{p:.45,duration:1600,pick:(ctx,r)=>ctx.broke?'resigned':(r()<.5?'attention':'doubtful')},
  // Turnabout, Quickstep, Rune and the rest: a look, never a word.
  reverse:{p:.25,duration:1300,pick:()=>'attention'},
  own_move:{p:.06,duration:1200,pick:(ctx,r)=>r()<.5?'card_place':'hand_glance'},
  player_neutral_move:{p:.06,duration:1200,pick:()=>'attention'},
  player_one_card:{p:1,always:true,duration:2100,pick:()=>'focus'},
  own_one_card:{p:1,always:true,duration:1600,pick:(ctx,r)=>r()<.6?'hand_glance':'neutral'},
  close_game:{p:.5,duration:1700,pick:()=>'attention'},
  slow_player:{p:.5,duration:2200,pick:(ctx,r)=>r()<.6?'fixed_stare':'adjustment'},
  idle_beat:{p:.4,duration:2200,pick:(ctx,r)=>ctx.concerned?'focus':pickOf(['hand_glance','adjustment','attention','neutral','hand_glance','adjustment'],r)},
  one_card_settled:{p:.6,always:true,duration:1400,pick:(ctx,r)=>r()<.5?'neutral':'adjustment'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','close_game','one_card_settled','follow_up']);

// The table update, read from his side, refined for the cards he has lines for: his own
// Curse ("Take two."), Crossbow, Runed Crossbow and King. Everything else stays the
// shared classifier's call (duel/authored-pack.js → duelEventFor).
export function bountyHunterEventFor(event,{played=null,playedCard=null,stack=null,opened=null,closed=null,crossbowRun=0,again=null,humanCount=7,cursedBefore=false,self='p1'}={}){
  const name=event?.[0];if(name==='player_one_card'||name==='own_one_card')return event;
  if(played?.playerId!==self)return event;
  if(playedCard?.type==='plus2'&&stack)return ['own_curse',{amount:stack.amount||2,urgent:humanCount<=2}];
  if(playedCard?.type==='king')return ['own_king',{broke:!!cursedBefore,urgent:humanCount<=2}];
  if(playedCard?.type==='superTaki')return ['own_runed_crossbow',{run:crossbowRun}];
  if(playedCard?.type==='taki'&&opened)return ['own_crossbow',{}];
  if(closed&&crossbowRun>=3)return ['own_crossbow_done',{run:crossbowRun}];
  if(name==='own_good_move'&&again)return ['own_good_move',{...event[1],playAgain:true}];
  return event;
}

// Tuning (v113, from real-time playtests): ~15 s and four counted actions between casual
// lines, one ordinary line a hand (two in a very long one), at most four ordinary remarks a
// match. The same words never come back while they are still among his last five remarks —
// across every category ("Good." is "Good." whether it praises you or closes a round).
export const BOUNTY_HUNTER_TIMING=Object.freeze({casualGap:15000,casualEvents:4,highGap:5000,highBudget:2,visualGap:2600,idleQuiet:26000,ordinaryPerMatch:4,recentRemarks:5,flavorPerMatch:1});
const T=BOUNTY_HUNTER_TIMING;
const BOUNTY_HUNTER_SPEC=Object.freeze({
  reactions:BOUNTY_HUNTER_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:BOUNTY_HUNTER_STATES,
  persistentStates:['default','attentive','watchful','certain','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:BOUNTY_HUNTER_DEFAULT_EXPRESSION,
  timing:{visualGap:T.visualGap,casualGap:T.casualGap,casualEvents:T.casualEvents,highGap:T.highGap,highBudget:T.highBudget,idleQuiet:T.idleQuiet},
  roundBudget:c=>c.eventsThisRound>=44?2:1,
  counters:{recentRemarks:[],flavors:0,patience:0,ordinary:0,drawStreak:0},
  hasVoice:catalog.hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .12;
    if(reaction.trigger==='own_draw')return context.haul?.2:context.forced?.1:.045;
    if(reaction.trigger==='player_good_move'&&context.big)return .28;
    return reaction.probability;
  },
  // First meeting: always "Hello." Later: a line about half the time, otherwise a look or nothing.
  planIntro:(context,random)=>context.firstEncounter?'voice':random()<.55?'voice':random()<.6?'expression':'none',
  introLook:random=>({expression:['attention','neutral','adjustment'][Math.floor(random()*3)],duration:2200}),
  suppress(trigger,context,{quiet}){
    if(trigger==='own_one_card'&&context.ownTurn)return true;
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    if(trigger==='player_one_card'&&context.persist&&quiet<T.casualGap)return true;
    return false;
  },
  enrich(trigger,context,counters){return {...context,recentRemarks:counters.recentRemarks||[],longRound:counters.eventsThisRound>=30,drewBefore:trigger==='own_draw'&&(counters.drawStreak||0)>=2};},
  eligible(item,context,counters){
    if(item.when&&!item.when(context))return false;
    if(item.category==='intro'&&(counters.intros||0)>=1)return false;
    if(item.category==='flavor'&&counters.flavors>=T.flavorPerMatch)return false;
    if(!['result','intro'].includes(item.category)&&item.priority!=='HIGH'&&(counters.ordinary||0)>=T.ordinaryPerMatch)return false;
    if(item.trigger==='slow_player'&&counters.patience>=1)return false;
    // Cross-category anti-repetition: if he has just said "Good.", he says nothing.
    const recent=counters.recentRemarks||[];
    if(item.category==='result'?recent.slice(0,2).includes(item.remark):recent.includes(item.remark))return false;
    return true;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    if(!['idle','flavor'].includes(reaction.category))return false;
    if(context.playerOnOneCard||counters.idleThisRound>=1)return true;
    if(reaction.trigger==='idle_quiet'&&(sinceQuiet<timing.idleQuiet||counters.eventsThisRound<14))return true;
    return false;
  },
  onRemember(reaction,counters){
    counters.recentRemarks=[reaction.remark,...(counters.recentRemarks||[]).filter(item=>item!==reaction.remark)].slice(0,T.recentRemarks);
    if(reaction.category==='flavor')counters.flavors++;
    if(!['result','intro'].includes(reaction.category)&&reaction.priority!=='HIGH')counters.ordinary=(counters.ordinary||0)+1;
    if(reaction.trigger==='slow_player')counters.patience++;
  },
  onObserve(trigger,context,{setBase,counters}){
    if(trigger==='player_one_card')setBase('watchful');
    // "Another." needs a second draw in a row of his own.
    if(trigger==='own_draw')counters.drawStreak=(counters.drawStreak||0)+1;else if(trigger.startsWith('own_'))counters.drawStreak=0;
  },
  baseFromTable({humanCount,ownCount}){
    if(humanCount===1)return 'watchful';
    if(ownCount===1)return 'certain';
    if(humanCount<=3&&ownCount<=3)return 'attentive';
    return 'default';
  },
  recovery:{from:'watchful',to:'default',visual:'one_card_settled'}
});
export function createBountyHunterController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(BOUNTY_HUNTER_SPEC,{random,now,initial});
}
