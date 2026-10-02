import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';

// ─────────────────────────────────────────────────────────────────────────────
// RAGNA — the northern warrior. Third authored opponent on the shared character
// framework (reaction table → shared controller → shared expression stage,
// speech bubble and Web Audio voice channel).
// Intense, blunt, disciplined. Treats RUNES as a contact sport, respects good
// play, owns her mistakes, and gets MORE energized when the game is close.
// Her wager talk is flavour only: the game has no wager economy and she never
// touches one.
// ─────────────────────────────────────────────────────────────────────────────

const voiceAsset=name=>new URL(`../assets/ragna/voice/${name}.mp3`,import.meta.url).href;
const MISSING_VOICE_URL=new URL('../assets/ragna/voice/__missing__.mp3',import.meta.url).href;

// Character pack manifest (ragna_character_pack/implementation/ragna_expression_manifest.json).
// All 40 files share one 640×679 transparent canvas (the 1536×1630 masters, scaled
// uniformly), bottom-centre anchored, so expressions never jump.
export const RAGNA_EXPRESSION_FILES=Object.freeze({
  default_focused:'01_default_focused',judging_wager:'02_judging_wager',wager_improved:'03_wager_improved',commanding_start:'04_commanding_start',double_it:'05_double_it',
  impatient_focus:'06_impatient_focus',eyes_on_table:'07_eyes_on_table',focus_self:'08_focus_self',yelling_at_tavern:'09_yelling_at_tavern',calm_after_outburst:'10_calm_after_outburst',
  impressed_good_move:'11_impressed_good_move',more_like_it:'12_more_like_it',game_gets_interesting:'13_game_gets_interesting',strong_move_satisfied:'14_strong_move_satisfied',keep_up:'15_keep_up',
  enjoying_challenge:'16_enjoying_challenge',player_draw_more_fight:'17_player_draw_more_fight',forced_draw_angry:'18_forced_draw_angry',angry_at_self:'19_angry_at_self',recovering_focus:'20_recovering_focus',
  player_one_card_excited:'21_player_one_card_excited',player_one_card_focus:'22_player_one_card_focus',player_one_card_pleased:'23_player_one_card_pleased',dont_make_it_easy:'24_dont_make_it_easy',
  ragna_one_card:'25_ragna_one_card',dont_distract_me:'26_dont_distract_me',finish_strong:'27_finish_strong',
  round_win:'28_round_win',round_win_more_gold:'29_round_win_more_gold',round_win_too_easy:'30_round_win_too_easy',
  round_loss_frustrated:'31_round_loss_frustrated',round_loss_again:'32_round_loss_again',round_loss_respect:'33_round_loss_respect',
  match_win_good_fight:'34_match_win_good_fight',match_win_rematch:'35_match_win_rematch',
  match_loss_fair_enough:'36_match_loss_fair_enough',match_loss_energized:'37_match_loss_energized',match_loss_respect:'38_match_loss_respect',
  noise_fury:'39_noise_fury',self_mistake:'40_self_mistake'
});
export const RAGNA_EXPRESSIONS=Object.freeze(Object.keys(RAGNA_EXPRESSION_FILES));
export const RAGNA_DEFAULT_EXPRESSION='default_focused';
export const ragnaExpressionURL=(name=RAGNA_DEFAULT_EXPRESSION)=>new URL(`../assets/ragna/expressions/ragna_${RAGNA_EXPRESSION_FILES[name]||RAGNA_EXPRESSION_FILES[RAGNA_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
const preloader=createExpressionPreloader({names:RAGNA_EXPRESSIONS,urlFor:ragnaExpressionURL,label:'Ragna'});
export const preloadRagnaExpressions=()=>preloader.preload();
export const ragnaExpressionsReady=()=>preloader.ready();

export const normalizeRagnaLocale=locale=>locale==='he'?'he':'en';

// Presentation states. `default` is forward, stern and ready. While the player
// sits on one card she is `hyperfocused` (excited, never afraid); on her own last
// card she is `finishing`; when both hands run short the game is `close` and she
// visibly enjoys it. Anger is a one-second flash (`angry`), then back to work.
export const RAGNA_STATES=Object.freeze(['default','close','hyperfocused','finishing','pleased','angry','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'default_focused',close:'enjoying_challenge',hyperfocused:'player_one_card_focus',finishing:'finish_strong',pleased:'more_like_it',angry:'forced_draw_angry',result:null});

// Authored script (Ragna Script.txt), performance directions removed. Hebrew is
// authored localisation and is reproduced exactly; it is never generated.
// ragna_player_draw_01 was deleted from the script and is intentionally absent.
export const RAGNA_SCRIPT=Object.freeze(
{"intro_01":{"en":"That's the bet? Put more down.","he":"זה ההימור? אני משחקת על יותר זהב בדרך כלל..."},
  "intro_02":{"en":"Better. Now we have a game.","he":"יותר טוב. עכשיו יש משחק."},
  "intro_03":{"en":"Sit straight. Focus. Let's play.","he":"יאללה, לשבת ישר, להתרכז, מתחילים."},
  "intro_04":{"en":"Double it.","he":"מכפילה את ההימור."},
  "idle_01":{"en":"Concentrate.","he":"פוקוס."},
  "idle_02":{"en":"Eyes on the table.","he":"עיניים על השולחן."},
  "idle_03":{"en":"Focus, Ragna.","he":"תתרכזי, ראגנה."},
  "idle_04":{"en":"QUIET! THERE'S A GAME ON!","he":"סתמו פיות! יש משחק פה!"},
  "idle_05":{"en":"Thank you.","he":"תודה."},
  "player_good_move_01":{"en":"Good.","he":"יפה! מהלך טוב!"},
  "player_good_move_02":{"en":"That's more like it.","he":"יותר טוב."},
  "player_good_move_03":{"en":"There we go!","he":"הנה! עכשיו מתחילים."},
  "good_move_01":{"en":"There.","he":"או, הנה."},
  "good_move_02":{"en":"Keep up.","he":"יאללה, לעמוד בקצב."},
  "good_move_03":{"en":"Good. Still awake.","he":"יופי, אני עדיין ערה."},
  "player_draw_02":{"en":"Good. More cards, longer fight.","he":"טוב. יותר קלפים, יותר משחק."},
  "draw_01":{"en":"Damn it.","he":"יא אללה!"},
  "draw_02":{"en":"Stupid.","he":"מהלך של מטומטמת!"},
  "draw_03":{"en":"Fine. I can work with that.","he":"בסדר. עובדים עם מה שיש."},
  "player_one_card_01":{"en":"There we go.","he":"הנה זה בא."},
  "player_one_card_02":{"en":"Now concentrate.","he":"עכשיו פוקוס."},
  "player_one_card_03":{"en":"Last card. Good.","he":"קלף אחד. טוב."},
  "player_one_card_04":{"en":"Don't make this easy.","he":"שלא יהיה קל מדי."},
  "one_card_01":{"en":"One left.","he":"קלף אחרון."},
  "one_card_02":{"en":"DON'T DISTRACT ME.","he":"לא להפריע עכשיו!"},
  "one_card_03":{"en":"Finish strong.","he":"צריכה לסיים חזק."},
  "round_win_01":{"en":"Good. Again.","he":"יופי, שוב."},
  "round_win_02":{"en":"Better. Next round.","he":"יותר טוב, הלאה."},
  "round_win_03":{"en":"More gold this time.","he":"הפעם מהמרים על יותר."},
  "round_win_04":{"en":"That's it?","he":"זה הכול?"},
  "round_loss_01":{"en":"Damn it.","he":"לעזאזל."},
  "round_loss_02":{"en":"Again... Again.","he":"עוד אחד."},
  "round_loss_03":{"en":"Good. Do it again.","he":"מעולה, עכשיו עוד פעם."},
  "match_win_01":{"en":"Good fight.","he":"קרב טוב."},
  "match_win_02":{"en":"Again. Double the wager.","he":"שוב. הפעם מכפילים."},
  "match_win_03":{"en":"Now that was worth playing.","he":"עכשיו זה כבר היה שווה משחק."},
  "match_loss_01":{"en":"Hah. Fair enough.","he":"הא. הוגן."},
  "match_loss_02":{"en":"Good. Double the wager. Rematch.","he":"טוב. מכפילים. משחק חוזר."},
  "match_loss_03":{"en":"That's how you play.","he":"ככה משחקים."},
  "noise_01":{"en":"WHO KEEPS MAKING THAT NOISE?!","he":"מי ממשיך לעשות את הרעש הזה?!"},
  "self_mistake_01":{"en":"Wrong card. My fault.","he":"קלף לא נכון. טעות שלי."}});

// `seconds` is the longer of the two recorded takes; it only sizes the bubble
// when a voice file cannot be played.
const line=(id,trigger,expression,priority,seconds,extra={})=>Object.freeze({
  id,trigger,voice:`ragna_${id}`,caption:RAGNA_SCRIPT[id].en,captions:Object.freeze({en:RAGNA_SCRIPT[id].en,he:RAGNA_SCRIPT[id].he}),expression,priority,
  category:extra.category||trigger,duration:Math.round(seconds*1000)+650,probability:extra.probability??1,cooldown:extra.cooldown??0,nextState:extra.nextState||null,weight:extra.weight||null,when:extra.when||null
});
const result={category:'result',nextState:'result'};

export const RAGNA_REACTIONS=Object.freeze([
  // One intro per match. A first meeting is a judgement or an order; "Better. Now
  // we have a game." only answers a raised stake — accepting her rematch after she
  // demanded double. No gold ever changes hands.
  line('intro_01','intro','judging_wager','CRITICAL',4.44,{category:'intro',weight:({firstEncounter,raised})=>raised?.4:firstEncounter?1:1}),
  line('intro_02','intro','wager_improved','CRITICAL',3.16,{category:'intro',when:({raised})=>!!raised,weight:()=>4}),
  line('intro_03','intro','commanding_start','CRITICAL',3.79,{category:'intro',weight:({firstEncounter,raised})=>raised?.4:firstEncounter?1.3:1}),
  line('intro_04','intro','double_it','CRITICAL',1.72,{category:'intro',when:({firstEncounter})=>!firstEncounter,weight:({raised})=>raised?1.5:.8}),

  // Concentration. 01/02 only when the player sits on a decision; 03 is rare and
  // to herself; 04 (+ the "Thank you." callback 05) and the noise line are rare
  // tavern outbursts — at most one shout per match.
  line('idle_01','slow_player','impatient_focus','LOW',1.80,{category:'idle',probability:.5}),
  line('idle_02','slow_player','eyes_on_table','LOW',1.80,{category:'idle',probability:.5}),
  line('idle_03','idle_quiet','focus_self','LOW',2.27,{category:'idle',probability:.14}),
  line('idle_04','tavern_outburst','yelling_at_tavern','LOW',2.77,{category:'shout',probability:.045}),
  line('idle_05','tavern_quiet','calm_after_outburst','LOW',1.65,{category:'shout_tail'}),
  line('noise_01','tavern_outburst','noise_fury','LOW',2.51,{category:'shout',probability:.045,weight:()=>.7}),

  // Genuine respect, never sarcasm.
  line('player_good_move_01','player_good_move','impressed_good_move','MEDIUM',2.43,{probability:.3,weight:({big})=>big?1.6:1}),
  line('player_good_move_02','player_good_move','more_like_it','MEDIUM',1.88,{probability:.3}),
  line('player_good_move_03','player_good_move','game_gets_interesting','MEDIUM',2.27,{probability:.3,weight:({big})=>big?1.3:1}),

  // Direct confidence, not boasting.
  line('good_move_01','ragna_good_move','strong_move_satisfied','LOW',1.72,{probability:.22}),
  line('good_move_02','ragna_good_move','keep_up','LOW',2.19,{probability:.22,weight:({humanCount})=>humanCount>=5?1.6:1}),
  line('good_move_03','ragna_good_move','enjoying_challenge','LOW',2.51,{probability:.22,weight:({close})=>close?2:.7}),

  // The fight gets longer: only for a real haul (a big Curse, or dragged off the last card).
  line('player_draw_02','player_draw','player_draw_more_fight','MEDIUM',3.97,{probability:.5,when:({longer})=>!!longer}),

  // Her own draws. Bad luck gets a curse word or a shrug — never self-blame.
  line('draw_01','ragna_draw','forced_draw_angry','LOW',1.65,{weight:({forced})=>forced?2.2:1}),
  line('draw_03','ragna_draw','recovering_focus','LOW',3.71,{weight:({forced})=>forced?1:1.6}),

  // Self-blame only after a decision of hers that she knew was second-best, and
  // only once it has cost her (she now has to draw). "Stupid." needs the draw.
  line('self_mistake_01','self_mistake','self_mistake','MEDIUM',2.77,{probability:.7}),
  line('draw_02','self_mistake','angry_at_self','MEDIUM',2.43,{probability:.7,when:({drew})=>!!drew,weight:()=>.8}),

  // Player on one card: excitement and focus, not panic.
  line('player_one_card_01','player_one_card','player_one_card_excited','HIGH',1.31,{probability:.6,nextState:'hyperfocused'}),
  line('player_one_card_02','player_one_card','player_one_card_focus','HIGH',2.27,{probability:.6,nextState:'hyperfocused'}),
  line('player_one_card_03','player_one_card','player_one_card_pleased','HIGH',2.59,{probability:.6,nextState:'hyperfocused'}),
  line('player_one_card_04','player_one_card','dont_make_it_easy','HIGH',2.35,{probability:.6,nextState:'hyperfocused',weight:({persist})=>persist?1.6:1}),

  // Her own last card: concentration on finishing properly, not smugness.
  line('one_card_01','ragna_one_card','ragna_one_card','MEDIUM',1.72,{probability:.45}),
  line('one_card_02','ragna_one_card','dont_distract_me','MEDIUM',1.96,{probability:.45,category:'shout',weight:()=>.2}),
  line('one_card_03','ragna_one_card','finish_strong','MEDIUM',2.19,{probability:.45}),

  // Results: exactly one line per hand, from the real match state.
  line('round_win_01','round_win','round_win','CRITICAL',2.43,result),
  line('round_win_02','round_win','round_win','CRITICAL',2.27,result),
  line('round_win_03','round_win','round_win_more_gold','CRITICAL',2.35,result),
  line('round_win_04','round_win','round_win_too_easy','CRITICAL',1.80,{...result,weight:({easy})=>easy?3.5:.15}),
  line('round_loss_01','round_loss','round_loss_frustrated','CRITICAL',1.96,result),
  line('round_loss_02','round_loss','round_loss_again','CRITICAL',2.51,result),
  line('round_loss_03','round_loss','round_loss_respect','CRITICAL',2.77,{...result,weight:({close})=>close?1.6:1}),
  line('match_win_01','match_win','match_win_good_fight','CRITICAL',1.80,{...result,weight:({close})=>close?1.4:1}),
  line('match_win_02','match_win','match_win_rematch','CRITICAL',2.43,{...result,weight:({close})=>close?.7:1.4}),
  line('match_win_03','match_win','match_win_good_fight','CRITICAL',2.77,{...result,weight:({close})=>close?2.4:.35}),
  line('match_loss_01','match_loss','match_loss_fair_enough','CRITICAL',2.27,{...result,weight:({close})=>close?.6:1.6}),
  line('match_loss_02','match_loss','match_loss_energized','CRITICAL',3.08,{...result,weight:({close})=>close?1.7:1}),
  line('match_loss_03','match_loss','match_loss_respect','CRITICAL',2.27,{...result,weight:({close})=>close?1.5:.9})
]);

// Lines whose demand for a rematch "doubles the wager": accepting her rematch
// after one of these is the only way the stakes ever "rise" (flavour only).
export const RAGNA_DOUBLE_LINES=Object.freeze(['ragna_match_win_02','ragna_match_loss_02']);

// Recorded takes that were not delivered: no Hebrew take of player_one_card_03.
const UNRECORDED=Object.freeze({ragna_player_one_card_03:Object.freeze(['he'])});
const debugMissing=new Set();
export function debugMarkRagnaVoiceMissing(name,missing=true){if(missing)debugMissing.add(name);else debugMissing.delete(name);return [...debugMissing];}
const hasVoice=(voice,locale)=>!(UNRECORDED[voice]||[]).includes(normalizeRagnaLocale(locale));

export const RAGNA_VOICE_LIBRARY=Object.freeze(Object.fromEntries(RAGNA_REACTIONS.map(item=>[item.voice,Object.freeze({
  src:voiceAsset(item.voice),
  sources:Object.freeze({en:voiceAsset(item.voice),he:voiceAsset(`${item.voice}_he`)}),
  caption:item.caption,captions:item.captions,priority:item.priority
})])));

export function resolveRagnaVoice(name,locale='en'){
  const definition=RAGNA_VOICE_LIBRARY[name];if(!definition)return null;
  const resolved=normalizeRagnaLocale(locale);if(!hasVoice(name,resolved))return null;
  return {name,locale:resolved,src:debugMissing.has(name)?MISSING_VOICE_URL:definition.sources[resolved],caption:definition.captions[resolved],priority:definition.priority};
}
export function resolveRagnaReaction(reaction,locale='en'){
  if(!reaction)return null;const resolved=normalizeRagnaLocale(locale);
  return {...reaction,voice:reaction.voice&&hasVoice(reaction.voice,resolved)?reaction.voice:null,locale:resolved,caption:reaction.captions?.[resolved]??reaction.caption};
}

// Expression-only beats. Her face carries far more than her voice. Anger is
// short and explosive; approval and appetite linger a little longer.
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?1:.7,duration:1700,pick:(ctx,r)=>ctx.big?'impressed_good_move':r()<.55?'more_like_it':'game_gets_interesting'},
  ragna_good_move:{p:.5,duration:1500,pick:(ctx,r)=>r()<.6?'strong_move_satisfied':'keep_up'},
  player_draw:{p:ctx=>ctx.longer?.9:(ctx.amount||1)>=2?.5:.12,duration:1600,pick:ctx=>ctx.longer||(ctx.amount||1)>=2?'player_draw_more_fight':'enjoying_challenge'},
  ragna_draw:{p:ctx=>ctx.forced?.9:.35,always:false,duration:ctx=>ctx.forced?1150:1000,pick:(ctx,r)=>ctx.forced||r()<.5?'forced_draw_angry':'recovering_focus'},
  self_mistake:{p:1,always:true,duration:1300,pick:()=>'angry_at_self'},
  player_one_card:{p:1,always:true,duration:1800,pick:()=>'player_one_card_excited'},
  ragna_one_card:{p:1,always:true,duration:1700,pick:()=>'ragna_one_card'},
  close_game:{p:.85,duration:1700,pick:(ctx,r)=>r()<.5?'game_gets_interesting':'enjoying_challenge'},
  slow_player:{p:.8,duration:1600,pick:(ctx,r)=>r()<.5?'impatient_focus':'eyes_on_table'},
  idle_beat:{p:.55,duration:2200,pick:(ctx,r)=>ctx.concerned?'player_one_card_focus':['impatient_focus','eyes_on_table','default_focused'][Math.floor(r()*3)]},
  one_card_settled:{p:.7,always:true,duration:1500,pick:(ctx,r)=>r()<.5?'player_draw_more_fight':'enjoying_challenge'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','tavern_outburst','tavern_quiet','close_game','one_card_settled']);
const IDLE_TRIGGERS=new Set(['idle_quiet','tavern_outburst']);

// Turn one table update into at most one Ragna trigger. Public facts only: what
// was played, who drew and how many, card counts — plus whether her own last
// decision was a knowing second-best (`slipBefore`, from her own planner).
export function ragnaEventFor({played=null,playedCard=null,stop=null,stack=null,penalty=null,draw=null,closed=null,crossbowRun=0,humanCount,ragnaCount,oldHuman=humanCount,oldRagna=ragnaCount,slipBefore=false}={}){
  const humanMove=played?.playerId==='p0',ragnaMove=played?.playerId==='p1',power=['king','plus2','superTaki'].includes(playedCard?.type);
  const close=humanCount<=3&&ragnaCount<=3;
  if(oldHuman>1&&humanCount===1)return ['player_one_card',{}];
  if(penalty?.playerId==='p0'&&((penalty.amount||0)>=4||oldHuman===1))return ['player_draw',{amount:penalty.amount,longer:true}];
  if(oldRagna>1&&ragnaCount===1)return ['ragna_one_card',{}];
  if(draw?.playerId==='p1'&&!penalty&&slipBefore)return ['self_mistake',{drew:true}];
  if(penalty?.playerId==='p1')return ['ragna_draw',{amount:penalty.amount||2,forced:true}];
  if(draw?.playerId==='p1')return ['ragna_draw',{amount:1,forced:false}];
  if(penalty?.playerId==='p0')return ['player_draw',{amount:penalty.amount||2}];
  if(draw?.playerId==='p0')return ['player_draw',{amount:1}];
  if(humanMove&&(playedCard?.type==='king'||(stack?.amount||0)>=4||(closed&&crossbowRun>=3)||(stop&&ragnaCount<=3)||(stack&&ragnaCount<=2)))return ['player_good_move',{big:playedCard?.type==='king'||(stack?.amount||0)>=4||crossbowRun>=4}];
  if(ragnaMove&&(stack||power||(closed&&crossbowRun>=2)||(stop&&humanCount<=3)))return ['ragna_good_move',{close,humanCount}];
  // The player is still hanging on one card after her turn: the pressure is on.
  if(ragnaMove&&humanCount===1&&oldHuman===1)return ['player_one_card',{persist:true}];
  if(ragnaMove)return ['ragna_move',{}];
  if(humanMove)return ['player_neutral_move',{}];
  return null;
}

const CASUAL_GAP=8000;
const RAGNA_SPEC=Object.freeze({
  reactions:RAGNA_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:RAGNA_STATES,
  persistentStates:['default','close','hyperfocused','finishing','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:RAGNA_DEFAULT_EXPRESSION,
  // More often than Edrin, far less than Bramm: two meaningful actions and ~8 s of active play between casual lines.
  timing:{visualGap:1800,casualGap:CASUAL_GAP,casualEvents:2,highGap:3500,highBudget:3,idleQuiet:16000},
  roundBudget:c=>c.eventsThisRound>=30?3:2,
  counters:{shouts:0,roundWins:0},
  hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .25;
    if(reaction.trigger==='ragna_draw')return context.forced?.32:.1;
    if(reaction.trigger==='player_good_move'&&context.big)return .5;
    return reaction.probability;
  },
  // Every match opens with exactly one line.
  planIntro:()=> 'voice',
  suppress(trigger,context,{quiet}){
    // About to go straight out on her own turn: the result line will speak instead.
    if(trigger==='ragna_one_card'&&context.ownTurn)return true;
    // The player still holds the turn and may go out right now: she just leans in.
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    // Still on one card a turn later: another line only after the ordinary cooldown.
    if(trigger==='player_one_card'&&context.persist&&quiet<CASUAL_GAP)return true;
    return false;
  },
  eligible(item,context,counters,random){
    if(item.when&&!item.when(context))return false;
    // The tavern shouting is funny because it is rare: one shout per match, and
    // "DON'T DISTRACT ME." only now and then, however the anti-repeat falls.
    if(item.category==='shout'&&(counters.shouts>=1||(item.trigger!=='tavern_outburst'&&random()>.25)))return false;
    return true;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    // At most one concentration line per round, never while the player is on one card.
    if(reaction.category==='idle'&&(counters.idleThisRound>=1||context.playerOnOneCard))return true;
    // Quiet-stretch lines (self-talk, tavern outbursts) need real quiet first.
    if(IDLE_TRIGGERS.has(reaction.trigger)&&(sinceQuiet<timing.idleQuiet||context.playerOnOneCard))return true;
    return false;
  },
  onRemember(reaction,counters){if(reaction.category==='shout')counters.shouts++;},
  // QUIET! THERE'S A GAME ON! … (the tavern goes quiet) … Thank you. One gag, two beats.
  decorate(reaction,context,random){return reaction.id==='idle_04'&&random()<.6?{followUp:{id:'idle_05',delay:900}}:null;},
  onObserve(trigger,context,{setBase}){if(trigger==='player_one_card')setBase('hyperfocused');},
  baseFromTable({humanCount,ragnaCount}){
    if(humanCount===1)return 'hyperfocused';
    if(ragnaCount===1)return 'finishing';
    if(humanCount<=3&&ragnaCount<=3)return 'close';
    return 'default';
  },
  transientFor(trigger,expression){
    if(['ragna_draw','self_mistake'].includes(trigger)&&['forced_draw_angry','angry_at_self'].includes(expression))return 'angry';
    if(trigger==='player_good_move')return 'pleased';
    return null;
  },
  recovery:{from:'hyperfocused',to:'default',visual:'one_card_settled'}
});
export function createRagnaController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(RAGNA_SPEC,{random,now,initial});
}
