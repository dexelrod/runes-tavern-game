import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';
import { createVoiceCatalog, lineFactory, normalizeLocale } from './authored-pack.js';

// ─────────────────────────────────────────────────────────────────────────────
// VEYRA 2.0 — the curse scholar. Fifth authored opponent on the shared framework
// (reaction table → shared controller → shared expression stage, speech bubble
// and the single Web Audio voice channel). Built on duel/authored-pack.js.
//
// A witch of about thirty: clever, self-assured, dry, a little dark, quietly
// competitive and now and then mischievous. She knows curses professionally and
// has opinions about them. She is capable of genuine surprise, and she does not
// interpret every card as a cosmic event: the supernatural is a remark, not a
// mechanic. (v111: the omen book, its lines and its faces were retired.)
//
// She speaks less than she used to — between Edrin and Bramm — and lets her face
// do most of the work. Her card play (game-ai/veteran.js → CONTROL_PROFILE) is
// unchanged: calm, competent, fair.
// ─────────────────────────────────────────────────────────────────────────────

// Character pack v2 (veyra_character_pack/v2/implementation/veyra_expression_manifest.json).
// 26 poses share one 640×640 canvas: the same 1920 px crop (the pack's 64 px inset
// removed) of every 2048 px painting, scaled uniformly and bottom-centre anchored,
// so swaps never jump. No props: game cards render separately. 20, 21, 25, 26 are
// conversational poses for banter (the pack names them after a voice stem).
export const VEYRA_EXPRESSION_FILES=Object.freeze({
  default:'01_default',intro_intrigued:'02_intro_intrigued',observing:'03_observing',amused:'04_amused',curious:'05_curious',surprised:'06_surprised',
  approving:'07_approving',strong_move:'08_strong_move',frustrated:'09_frustrated',draw_considering:'10_draw_considering',
  curse_disapproval:'11_curse_disapproval',stop_pleased:'12_stop_pleased',king_skeptical:'13_king_skeptical',
  player_one_card:'14_player_one_card',veyra_one_card:'15_veyra_one_card',
  round_win:'16_round_win',round_loss:'17_round_loss',match_win:'18_match_win',match_loss:'19_match_loss',
  banter_dry:'20_banter_dry',banter_explaining:'21_banter_explaining',friendly_smile:'22_friendly_smile',
  silent_doubt:'23_silent_doubt',silent_thinking:'24_silent_thinking',banter_correction:'25_banter_correction',banter_incredulous:'26_banter_incredulous'
});
export const VEYRA_EXPRESSIONS=Object.freeze(Object.keys(VEYRA_EXPRESSION_FILES));
export const VEYRA_DEFAULT_EXPRESSION='default';
export const veyraExpressionURL=(name=VEYRA_DEFAULT_EXPRESSION)=>new URL(`../assets/veyra/expressions/veyra_${VEYRA_EXPRESSION_FILES[name]||VEYRA_EXPRESSION_FILES[VEYRA_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
// The resting face and the looks that come first decode before she sits down; the
// rest follow in the background.
export const VEYRA_CRITICAL_EXPRESSIONS=Object.freeze(['default','intro_intrigued','amused','observing','silent_thinking','surprised','approving','strong_move','player_one_card','veyra_one_card','curious']);
const preloader=createExpressionPreloader({names:VEYRA_EXPRESSIONS,urlFor:veyraExpressionURL,label:'Veyra',critical:VEYRA_CRITICAL_EXPRESSIONS});
export const preloadVeyraExpressions=()=>preloader.preload();
export const veyraExpressionsReady=()=>preloader.ready();
export const normalizeVeyraLocale=normalizeLocale;

// Presentation states. `default` is comfortable and self-assured. When both hands
// run short she is `attentive` (watching the play). On the player's last card she
// is `watchful` — alert, focused. On her own last card she is `certain`.
export const VEYRA_STATES=Object.freeze(['default','attentive','watchful','certain','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'default',attentive:'observing',watchful:'player_one_card',certain:'veyra_one_card',result:null});

// The curated script (Veyra Script.txt), performance directions removed. Hebrew is the
// authored localisation, reproduced exactly; it is never generated. `he:null` marks a
// line whose Hebrew take was deliberately deleted: in Hebrew it does not exist at all
// (no English fallback). `s` is the longer take in seconds.
// Only the recordings that fit the new Veyra are here: calm, dry, confident, quietly
// amused, genuinely surprised. VEYRA_RETIRED (below) lists what was taken out.
export const VEYRA_SCRIPT=Object.freeze({
  intro_02:{en:"Quiet. Let me see.",he:null,s:3.0},
  intro_03:{en:"Oh. This will be interesting.",he:"או. זה הולך להיות מעניין.",s:2.59},
  intro_04:{en:"The fire doesn't like you tonight.",he:"האש לא חברותית הלילה.",s:2.77},
  player_good_move_01:{en:"Oh! Clever.",he:null,s:2.35},
  player_good_move_02:{en:"I did not see that.",he:"את זה לא ראיתי.",s:2.27},
  good_move_01:{en:"There.",he:"הנה.",s:1.41},
  good_move_02:{en:"Exactly where it was going.",he:"בדיוק לזה כיוונתי.",s:2.35},
  player_draw_01:{en:"There it is.",he:"התחלנו..",s:1.72},
  player_draw_02:{en:"More. Interesting.",he:"עוד. מעניין.",s:2.69},
  draw_02:{en:"Why this one?",he:"למה דווקא זה?",s:1.8},
  player_one_card_01:{en:"One? Already?",he:"קלף אחרון? כבר?",s:2.12},
  player_one_card_04:{en:"Don't move. I'm thinking.",he:"לא לזוז. אני חושבת.",s:2.43},
  one_card_01:{en:"Last card...",he:"קלף אחרון..",s:1.57},
  one_card_03:{en:"I know how this ends.",he:"אני יודעת איך זה נגמר.",s:1.88},
  curse_01:{en:"That is not a proper curse.",he:"זאת לא קללה אמיתית.",s:2.35},
  curse_02:{en:"Simple. Effective.",he:"פשוט. יעיל.",s:2.19},
  stop_01:{en:"No. Not yet.",he:"לא. עוד לא.",s:2.27},
  king_02:{en:"I don't trust crowns.",he:"אני לא סומכת על כתרים.",s:2.19},
  round_win_02:{en:"Again. I need to see something.",he:"שוב. אני צריכה לבדוק משהו.",s:3.24},
  round_loss_01:{en:"That wasn't right.",he:"זה לא היה נכון.",s:1.88},
  round_loss_02:{en:"Again. I missed something.",he:"שוב. פספסתי משהו.",s:2.59},
  match_win_02:{en:"I knew it.",he:"ידעתי.",s:1.57},
  match_win_03:{en:"Again tomorrow. I want to compare.",he:"שוב מחר. אני רוצה להשוות.",s:3.16},
  match_loss_02:{en:"I was completely wrong.",he:"טעיתי לגמרי.",s:2.27}
});
// Retired in v111 and never selectable anywhere (Duel, Tavern, banter, debug pools):
// the whole omen family, the frantic or shouted takes, and the lines that only make
// sense as an argument with the bones. The recordings stay archived in the owner's
// source folder (Runes Card Game/Veyra); none ship with the game.
export const VEYRA_RETIRED=Object.freeze([
  'intro_01','idle_01','idle_02','idle_03','idle_04','player_good_move_03','good_move_03','draw_01','draw_03',
  'player_one_card_02','player_one_card_03','one_card_02','stop_02','round_win_01','round_win_03','round_loss_03',
  'match_win_01','match_loss_01','match_loss_03',
  'omen_01','omen_02','omen_03','omen_04','omen_hit_01','omen_hit_02','omen_hit_03','omen_hit_04',
  'omen_miss_01','omen_miss_02','omen_miss_03','omen_miss_04'
].map(id=>`veyra_${id}`));

// Level trims for the few kept takes that sit hotter than the rest of the cast
// (integrated loudness above about −19.5 LUFS, or momentary peaks above −15). Applied
// as gain on the one Web Audio voice path; the recordings themselves are untouched.
export const VEYRA_VOICE_TRIM=Object.freeze({
  veyra_good_move_01_he:.72,veyra_good_move_02:.87,veyra_good_move_02_he:.89,
  veyra_player_one_card_01:.76,veyra_player_one_card_04:.73,veyra_player_one_card_04_he:.89,
  veyra_curse_01:.79,veyra_curse_01_he:.74,veyra_round_loss_01_he:.77,
  veyra_banter_kesh_01c:.78,veyra_banter_ragna_01a_he:.83,veyra_banter_ragna_02a:.68,veyra_banter_ragna_02c:.89
});

const line=lineFactory({prefix:'veyra',script:VEYRA_SCRIPT});
const result={category:'result',nextState:'result'};

export const VEYRA_REACTIONS=Object.freeze([
  // One intro at most per match. A first meeting always gets a line.
  line('intro_02','intro','silent_thinking','CRITICAL',{category:'intro'}),
  line('intro_03','intro','intro_intrigued','CRITICAL',{category:'intro',weight:({firstEncounter})=>firstEncounter?2:1}),
  // The one witch's remark in her opening: a tease, said with a wry smile.
  line('intro_04','intro','amused','CRITICAL',{category:'intro'}),

  // The player does something she did not see coming. She can be genuinely surprised.
  line('player_good_move_01','player_good_move','approving','MEDIUM',{probability:.24,weight:({big})=>big?1.4:1}),
  line('player_good_move_02','player_good_move','surprised','MEDIUM',{probability:.24}),

  // Her own strong play: quiet satisfaction, no vindication.
  line('good_move_01','own_good_move','strong_move','LOW',{probability:.16}),
  line('good_move_02','own_good_move','round_win','LOW',{probability:.16,weight:({big})=>big?1.5:1}),

  // The player has to take a pile of cards: she is interested, a little too pleased.
  line('player_draw_01','player_draw','observing','LOW',{probability:.18}),
  line('player_draw_02','player_draw','curious','LOW',{probability:.18,when:({haul})=>!!haul}),

  // Her own draw: a considering look at the card.
  line('draw_02','own_draw','draw_considering','LOW',{probability:.1}),

  // Player on one card: alert and focused. One line at most, often none.
  line('player_one_card_01','player_one_card','player_one_card','HIGH',{probability:.45,nextState:'watchful',weight:({persist})=>persist?.3:1.4}),
  line('player_one_card_04','player_one_card','silent_thinking','HIGH',{probability:.45,nextState:'watchful',weight:({persist})=>persist?1.6:1}),

  // Her own last card: calm anticipation.
  line('one_card_01','own_one_card','veyra_one_card','HIGH',{probability:.4,nextState:'certain'}),
  line('one_card_03','own_one_card','amused','HIGH',{probability:.4,nextState:'certain'}),

  // Special cards, contextually and not every time: commentary, not a rulebook.
  // A Curse on her offends her professionally; her own Curse is simply effective.
  line('curse_01','curse_taken','curse_disapproval','MEDIUM',{probability:.36}),
  line('curse_02','curse_landed','approving','MEDIUM',{probability:.24}),
  line('stop_01','stop_given','stop_pleased','MEDIUM',{probability:.24,weight:({urgent})=>urgent?2:1}),
  line('king_02','king','king_skeptical','MEDIUM',{probability:.32,when:({own})=>!own}),

  // Results: at most one line per hand, from the real match state. A round result may
  // pass with only a look (pack.resultVoiceChance in characters.js); a match never does.
  line('round_win_02','round_win','round_win','CRITICAL',result),
  line('round_loss_01','round_loss','round_loss','CRITICAL',result),
  line('round_loss_02','round_loss','silent_thinking','CRITICAL',{...result,weight:({close})=>close?1.5:1}),
  line('match_win_02','match_win','match_win','CRITICAL',{...result,weight:({close})=>close?1.4:1}),
  line('match_win_03','match_win','friendly_smile','CRITICAL',result),
  line('match_loss_02','match_loss','match_loss','CRITICAL',result)
]);

// Two takes were deliberately removed in Hebrew (intro_02, player_good_move_01).
// In Hebrew those lines are simply not in the pool: no English fallback.
export const VEYRA_ENGLISH_ONLY=Object.freeze(Object.keys(VEYRA_SCRIPT).filter(id=>!VEYRA_SCRIPT[id].he).map(id=>`veyra_${id}`));
const englishOnly=new Set(VEYRA_ENGLISH_ONLY);
const catalog=createVoiceCatalog({label:'Veyra',folder:'veyra',reactions:VEYRA_REACTIONS,
  audioFor:(voice,locale)=>locale==='he'?(englishOnly.has(voice)?null:'he'):'en',
  gainFor:(voice,take)=>VEYRA_VOICE_TRIM[take==='he'?`${voice}_he`:voice]??1});
export const VEYRA_VOICE_LIBRARY=catalog.library;
export const resolveVeyraVoice=catalog.resolveVoice;
export const resolveVeyraReaction=catalog.resolveReaction;
export const debugMarkVeyraVoiceMissing=catalog.markMissing;
export const veyraDebugMissingVoices=catalog.forcedMissing;
const hasVoice=catalog.hasVoice;

// ── Silent faces ──────────────────────────────────────────────────────────────
// Most moments get a look and no words: a glance at the play, a wry smile, a raised
// brow, a moment of real surprise. Nothing frantic; the biggest faces are kept for
// a real surprise and the end of a match.
const pickOf=(items,r)=>items[Math.floor(r()*items.length)];
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?.9:.6,duration:1700,pick:(ctx,r)=>ctx.big?(r()<.55?'surprised':'approving'):(r()<.5?'approving':'observing')},
  own_good_move:{p:.45,duration:1500,pick:(ctx,r)=>ctx.big?(r()<.6?'strong_move':'amused'):pickOf(['strong_move','amused','default'],r)},
  player_draw:{p:ctx=>ctx.haul?.8:.2,duration:1500,pick:(ctx,r)=>ctx.haul?(r()<.55?'amused':'curious'):'observing'},
  own_draw:{p:ctx=>ctx.forced?.8:.35,duration:1500,pick:(ctx,r)=>ctx.forced?(r()<.7?'frustrated':'silent_doubt'):'draw_considering'},
  curse_taken:{p:.75,duration:1600,pick:(ctx,r)=>r()<.75?'curse_disapproval':'frustrated'},
  curse_landed:{p:.5,duration:1500,pick:(ctx,r)=>r()<.55?'amused':'approving'},
  stop_taken:{p:.65,duration:1600,pick:(ctx,r)=>r()<.6?'silent_doubt':'frustrated'},
  stop_given:{p:.55,duration:1500,pick:(ctx,r)=>r()<.7?'stop_pleased':'amused'},
  king:{p:ctx=>ctx.own?.25:.8,duration:1700,pick:ctx=>ctx.own?'strong_move':'king_skeptical'},
  reverse:{p:.4,duration:1400,pick:(ctx,r)=>r()<.6?'observing':'curious'},
  player_one_card:{p:1,always:true,duration:2000,pick:(ctx,r)=>ctx.persist?'silent_thinking':(r()<.7?'player_one_card':'silent_thinking')},
  own_one_card:{p:1,always:true,duration:1800,pick:(ctx,r)=>r()<.65?'veyra_one_card':'amused'},
  close_game:{p:.7,duration:1800,pick:(ctx,r)=>r()<.6?'observing':'silent_thinking'},
  slow_player:{p:.65,duration:1800,pick:(ctx,r)=>r()<.5?'amused':'silent_doubt'},
  // A quiet stretch: she watches the table, thinks, smiles at something.
  idle_beat:{p:.55,duration:2400,pick:(ctx,r)=>ctx.concerned?'silent_thinking':pickOf(['observing','amused','silent_thinking','curious','observing','friendly_smile','silent_doubt'],r)},
  // The player drew off their last card: she relaxes.
  one_card_settled:{p:.7,always:true,duration:1500,pick:(ctx,r)=>r()<.6?'amused':'default'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','close_game','one_card_settled']);

// How much she talks (v111). Between Edrin and Bramm, and below the old Veyra:
// ~11 s and three meaningful actions between casual lines, two ordinary lines a hand
// at most, eight in a match, and no remark more than twice a match (an aside once). Silent looks are
// common. Results and last-card lines stand apart.
export const VEYRA_TIMING=Object.freeze({visualGap:2200,casualGap:11000,casualEvents:3,highGap:5000,highBudget:2,idleQuiet:20000});
export const VEYRA_ORDINARY_PER_MATCH=8;
const VEYRA_SPEC=Object.freeze({
  reactions:VEYRA_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:VEYRA_STATES,
  persistentStates:['default','attentive','watchful','certain','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:VEYRA_DEFAULT_EXPRESSION,
  timing:VEYRA_TIMING,
  roundBudget:c=>c.eventsThisRound>=40?3:2,
  counters:{recentRemarks:[],ordinary:0,said:{}},
  hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .15;
    if(reaction.trigger==='own_draw')return context.forced?.14:.05;
    if(reaction.trigger==='player_draw')return context.haul?.3:.04;
    if(reaction.trigger==='player_good_move'&&context.big)return .4;
    if(reaction.trigger==='king'&&context.broke)return .5;
    return reaction.probability;
  },
  // First meeting: one line. Later: often a line, sometimes only a look.
  planIntro:(context,random)=>context.firstEncounter?'voice':random()<.6?'voice':random()<.8?'expression':'none',
  introLook:random=>({expression:['amused','intro_intrigued','observing'][Math.floor(random()*3)],duration:2400}),
  suppress(trigger,context,{quiet}){
    // About to go straight out on her own turn: the result line will speak instead.
    if(trigger==='own_one_card'&&context.ownTurn)return true;
    // The player still holds the turn and may go out right now: she only watches.
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    if(trigger==='player_one_card'&&context.persist&&quiet<VEYRA_TIMING.casualGap)return true;
    return false;
  },
  enrich(trigger,context,counters){return {...context,recentRemarks:counters.recentRemarks||[]};},
  eligible(item,context,counters){
    if(item.when&&!item.when(context))return false;
    if(item.category==='intro'&&(counters.intros||0)>=1)return false;
    // At most eight ordinary remarks a match (last-card lines, intro and results stand apart).
    if(!['result','intro'].includes(item.category)&&item.priority!=='HIGH'&&(counters.ordinary||0)>=VEYRA_ORDINARY_PER_MATCH)return false;
    if(!['result','intro'].includes(item.category)&&(counters.recentRemarks||[])[0]===item.remark)return false;
    // A small, curated set: no remark comes back more than twice in a match, and the
    // little asides (her draws, her own good moves, your draws) only once.
    if(!['result','intro'].includes(item.category)&&(counters.said?.[item.voice]||0)>=(item.priority==='LOW'?1:2))return false;
    return true;
  },
  onRemember(reaction,counters){
    counters.recentRemarks=[reaction.remark,...(counters.recentRemarks||[]).filter(item=>item!==reaction.remark)].slice(0,4);
    if(!['result','intro'].includes(reaction.category)&&reaction.priority!=='HIGH')counters.ordinary=(counters.ordinary||0)+1;
    counters.said={...(counters.said||{}),[reaction.voice]:(counters.said?.[reaction.voice]||0)+1};
  },
  onObserve(trigger,context,{setBase}){if(trigger==='player_one_card')setBase('watchful');},
  baseFromTable({humanCount,ownCount}){
    if(humanCount===1)return 'watchful';
    if(ownCount===1)return 'certain';
    if(humanCount<=3&&ownCount<=3)return 'attentive';
    return 'default';
  },
  recovery:{from:'watchful',to:'default',visual:'one_card_settled'}
});
export function createVeyraController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(VEYRA_SPEC,{random,now,initial});
}
