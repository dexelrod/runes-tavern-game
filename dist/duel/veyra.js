import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';
import { createVoiceCatalog, lineFactory, normalizeLocale } from './authored-pack.js';

// ─────────────────────────────────────────────────────────────────────────────
// VEYRA — the omen-reader. Fifth authored opponent on the shared framework
// (reaction table → shared controller → shared expression stage, speech bubble
// and the single Web Audio voice channel). Built on duel/authored-pack.js.
//
// A rural witch, about forty, intelligent and obsessive. She reads meaning into
// carved bones, a candle flame, colours, cards and coincidences, and she argues
// with all of them. Kesh watches the universe; Veyra argues with it.
//
// Her signs are superstition, never knowledge. She can be completely wrong, and
// when she is she blames the bones, reinterprets, or decides the failure was the
// omen. Her bones and her candle are ordinary objects: no glow, no magic.
// Her card play (game-ai/veteran.js → CONTROL_PROFILE) is calm and competent;
// the chaos is in how she reads the table, not in what she plays.
// ─────────────────────────────────────────────────────────────────────────────

// Character pack (veyra_character_pack/implementation/veyra_expression_manifest.json).
// 61 poses share one 640×640 canvas: the same 1920 px crop (the pack's clear 64 px
// inset removed) of every 2048 px master, scaled uniformly and bottom-centre
// anchored, so swaps never jump. Bones in hand: 01 03 09 21 25 27 34 35 36 46 53 60.
// Candle: 05 08 28 56 59 60. Props appear only where her line is about them.
export const VEYRA_EXPRESSION_FILES=Object.freeze({
  default_observant:'01_default_observant',intro_something_wrong:'02_intro_something_wrong',intro_bones:'03_intro_bones',intro_interested:'04_intro_interested',intro_fire_unfriendly:'05_intro_fire_unfriendly',
  idle_did_you_see_that:'06_idle_did_you_see_that',idle_means_something:'07_idle_means_something',idle_flame_stop:'08_idle_flame_stop',idle_bones_make_up_minds:'09_idle_bones_make_up_minds',
  player_good_move_reconsidering:'10_player_good_move_reconsidering',player_good_move_excited:'11_player_good_move_excited',
  good_move_satisfied:'12_good_move_satisfied',good_move_vindicated:'13_good_move_vindicated',good_move_knew_it:'14_good_move_knew_it',
  player_draw_there_it_is:'15_player_draw_there_it_is',player_draw_interested:'16_player_draw_interested',
  draw_no_no_no:'17_draw_no_no_no',draw_why_this_one:'18_draw_why_this_one',draw_reinterpretation:'19_draw_reinterpretation',
  player_one_card_alarm:'20_player_one_card_alarm',player_one_card_bones:'21_player_one_card_bones',player_one_card_connecting:'22_player_one_card_connecting',player_one_card_thinking:'23_player_one_card_thinking',
  veyra_one_card:'24_veyra_one_card',veyra_one_card_bones:'25_veyra_one_card_bones',veyra_one_card_certain:'26_veyra_one_card_certain',
  omen_reading_bones:'27_omen_reading_bones',omen_watching_flame:'28_omen_watching_flame',omen_sudden_certainty:'29_omen_sudden_certainty',omen_uneasy:'30_omen_uneasy',
  omen_hit_exploding:'31_omen_hit_exploding',omen_hit_pointing:'32_omen_hit_pointing',omen_hit_delighted:'33_omen_hit_delighted',omen_hit_smug:'34_omen_hit_smug',
  omen_miss_arguing_bones:'35_omen_miss_arguing_bones',omen_miss_shut_up:'36_omen_miss_shut_up',omen_miss_rationalizing:'37_omen_miss_rationalizing',omen_miss_meaning_changed:'38_omen_miss_meaning_changed',
  curse_offended:'39_curse_offended',curse_approving:'40_curse_approving',stop_pleased:'41_stop_pleased',stop_interpreting:'42_stop_interpreting',king_suspicious:'43_king_suspicious',
  round_win_pattern:'44_round_win_pattern',round_win_need_to_see:'45_round_win_need_to_see',round_win_bones:'46_round_win_bones',
  round_loss_wrong:'47_round_loss_wrong',round_loss_obsessed:'48_round_loss_obsessed',round_loss_show_me_again:'49_round_loss_show_me_again',
  match_win_understands:'50_match_win_understands',match_win_knew_it:'51_match_win_knew_it',match_win_compare:'52_match_win_compare',
  match_loss_bones_explain:'53_match_loss_bones_explain',match_loss_completely_wrong:'54_match_loss_completely_wrong',match_loss_losing_was_sign:'55_match_loss_losing_was_sign',
  banter_kesh_look:'56_banter_kesh_look',banter_kesh_incredulous:'57_banter_kesh_incredulous',banter_kesh_correcting:'58_banter_kesh_correcting',
  banter_ragna_flame:'59_banter_ragna_flame',banter_edrin_explaining:'60_banter_edrin_explaining',banter_edrin_exasperated:'61_banter_edrin_exasperated'
});
export const VEYRA_EXPRESSIONS=Object.freeze(Object.keys(VEYRA_EXPRESSION_FILES));
export const VEYRA_DEFAULT_EXPRESSION='default_observant';
export const veyraExpressionURL=(name=VEYRA_DEFAULT_EXPRESSION)=>new URL(`../assets/veyra/expressions/veyra_${VEYRA_EXPRESSION_FILES[name]||VEYRA_EXPRESSION_FILES[VEYRA_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
// The resting face and the reactions that come first decode before she sits down;
// the rest follow in the background (her pack is half again the size of Kesh's).
export const VEYRA_CRITICAL_EXPRESSIONS=Object.freeze(['default_observant','intro_something_wrong','intro_bones','intro_interested','intro_fire_unfriendly','idle_means_something','idle_did_you_see_that','stop_interpreting','player_good_move_reconsidering','good_move_satisfied','draw_why_this_one','draw_no_no_no','player_one_card_alarm','player_one_card_connecting','veyra_one_card','omen_reading_bones','omen_watching_flame','omen_sudden_certainty','omen_uneasy','omen_hit_exploding','omen_hit_pointing','omen_miss_rationalizing','omen_miss_shut_up']);
const preloader=createExpressionPreloader({names:VEYRA_EXPRESSIONS,urlFor:veyraExpressionURL,label:'Veyra',critical:VEYRA_CRITICAL_EXPRESSIONS});
export const preloadVeyraExpressions=()=>preloader.preload();
export const veyraExpressionsReady=()=>preloader.ready();
export const normalizeVeyraLocale=normalizeLocale;

// Presentation states. `default` holds the bones and studies the table. When both
// hands run short she is `attentive` (watching every card). On the player's last
// card she is `watchful` — fixated, connecting signs. On her own last card she is
// `certain`: the pattern is resolving.
export const VEYRA_STATES=Object.freeze(['default','attentive','watchful','certain','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'default_observant',attentive:'stop_interpreting',watchful:'idle_means_something',certain:'veyra_one_card',result:null});

// Authored script (Veyra Script.txt), performance directions removed. Hebrew is the
// authored localisation, reproduced exactly; it is never generated. `he:null` marks
// the two lines whose Hebrew take was deliberately deleted: in Hebrew those lines do
// not exist at all (no English fallback). `s` is the longer take in seconds.
// Deleted lines (King 01, both Reverse lines, the cut Ragna banter) are not here.
export const VEYRA_SCRIPT=Object.freeze({
  intro_01:{en:"Something is wrong already.",he:"כבר משהו לא בסדר..",s:2.59},
  intro_02:{en:"Quiet. Let me see.",he:null,s:3.0},
  intro_03:{en:"Oh. This will be interesting.",he:"או. זה הולך להיות מעניין.",s:2.59},
  intro_04:{en:"The fire doesn't like you tonight.",he:"האש לא חברותית הלילה.",s:2.77},
  idle_01:{en:"Did you see that?",he:"עוד מישהו ראה את זה?",s:1.96},
  idle_02:{en:"No... that means something.",he:"לא... זה אומר משהו.",s:3.0},
  idle_03:{en:"Stop moving.",he:"תפסיקי לזוז.",s:2.27},
  idle_04:{en:"Make up your minds.",he:"תחליטו כבר.",s:1.88},
  player_good_move_01:{en:"Oh! Clever.",he:null,s:2.35},
  player_good_move_02:{en:"I did not see that.",he:"את זה לא ראיתי.",s:2.27},
  player_good_move_03:{en:"Yes! That's the kind of trouble I meant!",he:"כן! על צרות כאלה דיברתי!",s:3.16},
  good_move_01:{en:"There.",he:"הנה.",s:1.41},
  good_move_02:{en:"Exactly where it was going.",he:"בדיוק לזה כיוונתי.",s:2.35},
  good_move_03:{en:"I knew something was coming.",he:"ידעתי שמשהו מגיע.",s:2.69},
  player_draw_01:{en:"There it is.",he:"התחלנו..",s:1.72},
  player_draw_02:{en:"More. Interesting.",he:"עוד. מעניין.",s:2.69},
  draw_01:{en:"No, no, no.",he:"לא, לא, לא.",s:2.04},
  draw_02:{en:"Why this one?",he:"למה דווקא זה?",s:1.8},
  draw_03:{en:"...Actually. Keep talking.",he:"...בעצם. תמשיכו לדבר.",s:2.85},
  player_one_card_01:{en:"One? Already?",he:"קלף אחרון? כבר?",s:2.12},
  player_one_card_02:{en:"You didn't tell me that!",he:"את זה לא אמרתן לי!",s:2.35},
  player_one_card_03:{en:"Wait. Wait. This fits.",he:"רגע. רגע. זה מסתדר.",s:2.35},
  player_one_card_04:{en:"Don't move. I'm thinking.",he:"לא לזוז. אני חושבת.",s:2.43},
  one_card_01:{en:"Last card...",he:"קלף אחרון..",s:1.57},
  one_card_02:{en:"Say something useful.",he:"תגידו משהו מועיל.",s:2.27},
  one_card_03:{en:"I know how this ends.",he:"אני יודעת איך זה נגמר.",s:1.88},
  omen_01:{en:"Someone is drawing before this is over.",he:"מישהו פה עוד הולך למשוך קלפים.",s:3.08},
  omen_02:{en:"Red brings trouble tonight.",he:"אדום מביא צרות הלילה.",s:2.85},
  omen_03:{en:"This game will turn on itself.",he:"המשחק הזה עוד יתהפך על עצמו.",s:2.51},
  omen_04:{en:"Someone is going to regret a Curse.",he:"מישהו עוד יתחרט על קללה.",s:3.0},
  omen_hit_01:{en:"I TOLD YOU!",he:"אמרתי לכם!!",s:1.8},
  omen_hit_02:{en:"THERE! Did you see it?!",he:"הנה! ראיתם את זה?!",s:2.04},
  omen_hit_03:{en:"Exactly! Exactly!",he:"בדיוק! בדיוק!",s:2.04},
  omen_hit_04:{en:"The bones don't lie.",he:"העצמות לא משקרות.",s:2.19},
  omen_miss_01:{en:"No. You were very clear.",he:"לא. הייתן מאוד ברורות.",s:2.69},
  omen_miss_02:{en:"Oh, shut up.",he:"אוי, סתמו.",s:1.72},
  omen_miss_03:{en:"I read it too early.",he:"קראתי את זה מוקדם מדי.",s:2.04},
  omen_miss_04:{en:"The meaning changed.",he:"המשמעות השתנתה.",s:1.72},
  curse_01:{en:"That is not a proper curse.",he:"זאת לא קללה אמיתית.",s:2.35},
  curse_02:{en:"Simple. Effective.",he:"פשוט. יעיל.",s:2.19},
  stop_01:{en:"No. Not yet.",he:"לא. עוד לא.",s:2.27},
  stop_02:{en:"Something wanted that stopped.",he:"משהו רצה שזה ייעצר.",s:2.69},
  king_02:{en:"I don't trust crowns.",he:"אני לא סומכת על כתרים.",s:2.19},
  round_win_01:{en:"Good. The pattern holds.",he:"יופי. הדפוס מחזיק.",s:2.51},
  round_win_02:{en:"Again. I need to see something.",he:"שוב. אני צריכה לבדוק משהו.",s:3.24},
  round_win_03:{en:"Don't get smug.",he:"אל תתלהבו מעצמכן.",s:2.19},
  round_loss_01:{en:"That wasn't right.",he:"זה לא היה נכון.",s:1.88},
  round_loss_02:{en:"Again. I missed something.",he:"שוב. פספסתי משהו.",s:2.59},
  round_loss_03:{en:"No... show me again.",he:"לא... תראו לי שוב.",s:3.16},
  match_win_01:{en:"There. That's what it was saying.",he:"הנה. זה מה שזה ניסה להגיד.",s:2.77},
  match_win_02:{en:"I knew it.",he:"ידעתי.",s:1.57},
  match_win_03:{en:"Again tomorrow. I want to compare.",he:"שוב מחר. אני רוצה להשוות.",s:3.16},
  match_loss_01:{en:"You have explaining to do.",he:"יש לכן הרבה מה להסביר.",s:2.93},
  match_loss_02:{en:"I was completely wrong.",he:"טעיתי לגמרי.",s:2.27},
  match_loss_03:{en:"Wait. Unless losing was the sign.",he:"רגע. אלא אם ההפסד היה הסימן.",s:3.24}});

const line=lineFactory({prefix:'veyra',script:VEYRA_SCRIPT});
const result={category:'result',nextState:'result'};
const omen=kind=>({category:'omen',when:context=>context.kind===kind});

export const VEYRA_REACTIONS=Object.freeze([
  // One intro at most per match. A first meeting always gets a line.
  line('intro_01','intro','intro_something_wrong','CRITICAL',{category:'intro'}),
  line('intro_02','intro','intro_bones','CRITICAL',{category:'intro'}),
  line('intro_03','intro','intro_interested','CRITICAL',{category:'intro',weight:({firstEncounter})=>firstEncounter?1.4:1}),
  line('intro_04','intro','intro_fire_unfriendly','CRITICAL',{category:'intro'}),

  // Signs in the room. They need real quiet; the flame and the bones get told off.
  line('idle_01','idle_quiet','idle_did_you_see_that','LOW',{category:'idle',probability:.3}),
  line('idle_02','idle_quiet','idle_means_something','LOW',{category:'idle',probability:.3}),
  line('idle_03','idle_quiet','idle_flame_stop','LOW',{category:'idle',probability:.26}),
  line('idle_04','idle_quiet','idle_bones_make_up_minds','LOW',{category:'idle',probability:.26}),

  // The player does something she did not foresee. Trouble excites her, even her own.
  line('player_good_move_01','player_good_move','player_good_move_reconsidering','MEDIUM',{probability:.2}),
  line('player_good_move_02','player_good_move','player_good_move_reconsidering','MEDIUM',{probability:.2}),
  line('player_good_move_03','player_good_move','player_good_move_excited','MEDIUM',{probability:.2,weight:({hurt,omenActive})=>(hurt?2:1)*(omenActive?1.6:1)}),

  // Her own strong play: it went where she knew it would.
  line('good_move_01','own_good_move','good_move_satisfied','LOW',{probability:.14}),
  line('good_move_02','own_good_move','good_move_vindicated','LOW',{probability:.14,weight:({big})=>big?1.5:1}),
  line('good_move_03','own_good_move','good_move_knew_it','LOW',{probability:.14}),

  // The player has to take cards: she watches far too closely.
  line('player_draw_01','player_draw','player_draw_there_it_is','LOW',{probability:.24}),
  line('player_draw_02','player_draw','player_draw_interested','LOW',{probability:.24,when:({haul})=>!!haul}),

  // Her own draws: rejection, suspicion, then a sudden new reading.
  line('draw_01','own_draw','draw_no_no_no','LOW',{weight:({forced})=>forced?3:.3}),
  line('draw_02','own_draw','draw_why_this_one','LOW',{weight:({forced})=>forced?.2:1.3}),
  line('draw_03','own_draw','draw_reinterpretation','LOW',{weight:({forced})=>forced?.2:1}),

  // Player on one card: suddenly alert, then the bones, then a theory.
  line('player_one_card_01','player_one_card','player_one_card_alarm','HIGH',{probability:.6,nextState:'watchful',weight:({persist})=>persist?.3:1.3}),
  line('player_one_card_02','player_one_card','player_one_card_bones','HIGH',{probability:.6,nextState:'watchful'}),
  line('player_one_card_03','player_one_card','player_one_card_connecting','HIGH',{probability:.6,nextState:'watchful',weight:({omenActive})=>omenActive?1.8:1}),
  line('player_one_card_04','player_one_card','player_one_card_thinking','HIGH',{probability:.6,nextState:'watchful',weight:({persist})=>persist?1.6:1}),

  // Her own last card: the pattern is resolving.
  line('one_card_01','own_one_card','veyra_one_card','HIGH',{probability:.5,nextState:'certain'}),
  line('one_card_02','own_one_card','veyra_one_card_bones','HIGH',{probability:.5,nextState:'certain'}),
  line('one_card_03','own_one_card','veyra_one_card_certain','HIGH',{probability:.5,nextState:'certain'}),

  // Omens. The omen book (below) decides when she declares one and which; the
  // line here must match the omen she actually declared.
  line('omen_01','omen','omen_reading_bones','MEDIUM',omen('draw')),
  line('omen_02','omen','omen_watching_flame','MEDIUM',omen('red')),
  line('omen_03','omen','omen_sudden_certainty','MEDIUM',omen('turn')),
  line('omen_04','omen','omen_uneasy','MEDIUM',omen('regret')),
  // Something close enough happened. Her biggest moments; the first is the loudest.
  line('omen_hit_01','omen_hit','omen_hit_exploding','HIGH',{category:'omen_hit',weight:({hits})=>(hits||0)===0?2.4:.7}),
  line('omen_hit_02','omen_hit','omen_hit_pointing','HIGH',{category:'omen_hit',weight:({hits})=>(hits||0)===0?1.8:.8}),
  line('omen_hit_03','omen_hit','omen_hit_delighted','HIGH',{category:'omen_hit'}),
  line('omen_hit_04','omen_hit','omen_hit_smug','HIGH',{category:'omen_hit',weight:({hits})=>(hits||0)>0?1.8:.6}),
  // Nothing happened: she argues with the bones, or the meaning changed.
  line('omen_miss_01','omen_miss','omen_miss_arguing_bones','MEDIUM',{category:'omen_miss'}),
  line('omen_miss_02','omen_miss','omen_miss_shut_up','MEDIUM',{category:'omen_miss'}),
  line('omen_miss_03','omen_miss','omen_miss_rationalizing','MEDIUM',{category:'omen_miss'}),
  line('omen_miss_04','omen_miss','omen_miss_meaning_changed','MEDIUM',{category:'omen_miss'}),

  // Special cards, contextually and not every time: commentary, not a rulebook.
  // A Curse on her offends her professionally; her own Curse is simply effective.
  line('curse_01','curse_taken','curse_offended','MEDIUM',{probability:.3}),
  line('curse_02','curse_landed','curse_approving','MEDIUM',{probability:.22}),
  line('stop_01','stop_given','stop_pleased','MEDIUM',{probability:.24,weight:({urgent})=>urgent?2:1}),
  line('stop_02','stop_taken','stop_interpreting','MEDIUM',{probability:.24}),
  line('king_02','king','king_suspicious','MEDIUM',{probability:.3,when:({own})=>!own}),

  // Results: exactly one line per hand, from the real match state.
  line('round_win_01','round_win','round_win_pattern','CRITICAL',result),
  line('round_win_02','round_win','round_win_need_to_see','CRITICAL',result),
  line('round_win_03','round_win','round_win_bones','CRITICAL',{...result,weight:({hitThisRound})=>hitThisRound?2:1}),
  line('round_loss_01','round_loss','round_loss_wrong','CRITICAL',result),
  line('round_loss_02','round_loss','round_loss_obsessed','CRITICAL',{...result,weight:({close})=>close?1.5:1}),
  line('round_loss_03','round_loss','round_loss_show_me_again','CRITICAL',{...result,weight:({missedThisRound})=>missedThisRound?2:1}),
  // Win: the pattern made sense. Loss: fascinated by what she misread.
  line('match_win_01','match_win','match_win_understands','CRITICAL',{...result,weight:({hitThisMatch})=>hitThisMatch?2.2:.8}),
  line('match_win_02','match_win','match_win_knew_it','CRITICAL',result),
  line('match_win_03','match_win','match_win_compare','CRITICAL',result),
  line('match_loss_01','match_loss','match_loss_bones_explain','CRITICAL',result),
  line('match_loss_02','match_loss','match_loss_completely_wrong','CRITICAL',{...result,weight:({close})=>close?.7:1.1}),
  // Her defining final beat: the failure itself was the sign.
  line('match_loss_03','match_loss','match_loss_losing_was_sign','CRITICAL',{...result,weight:({missedThisMatch})=>missedThisMatch?3.2:1.8})
]);

// Two takes were deliberately removed in Hebrew (intro_02, player_good_move_01).
// In Hebrew those lines are simply not in the pool: no English fallback.
export const VEYRA_ENGLISH_ONLY=Object.freeze(Object.keys(VEYRA_SCRIPT).filter(id=>!VEYRA_SCRIPT[id].he).map(id=>`veyra_${id}`));
const englishOnly=new Set(VEYRA_ENGLISH_ONLY);
const catalog=createVoiceCatalog({label:'Veyra',folder:'veyra',reactions:VEYRA_REACTIONS,audioFor:(voice,locale)=>locale==='he'?(englishOnly.has(voice)?null:'he'):'en'});
export const VEYRA_VOICE_LIBRARY=catalog.library;
export const resolveVeyraVoice=catalog.resolveVoice;
export const resolveVeyraReaction=catalog.resolveReaction;
export const debugMarkVeyraVoiceMissing=catalog.markMissing;
export const veyraDebugMissingVoices=catalog.forcedMissing;
const hasVoice=catalog.hasVoice;

// ── Silent faces ──────────────────────────────────────────────────────────────
// Veyra is expressive enough that she does not need to speak to react. Most
// moments get a look; the big, loud poses (31/32) are kept for omens that land.
// Props follow the moment: the bones only when she consults them, the candle
// only when she is reading the flame.
const pickOf=(items,r)=>items[Math.floor(r()*items.length)];
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?.95:.7,duration:1700,pick:(ctx,r)=>ctx.big&&r()<.45?'player_good_move_excited':(r()<.6?'player_good_move_reconsidering':'idle_did_you_see_that')},
  own_good_move:{p:.5,duration:1500,pick:(ctx,r)=>pickOf(['good_move_satisfied','good_move_knew_it','good_move_vindicated'],r)},
  player_draw:{p:ctx=>ctx.haul?.85:.2,duration:1500,pick:ctx=>ctx.haul?'player_draw_interested':'player_draw_there_it_is'},
  own_draw:{p:ctx=>ctx.forced?.85:.4,duration:1500,pick:(ctx,r)=>ctx.forced?'draw_no_no_no':(r()<.6?'draw_why_this_one':'draw_reinterpretation')},
  curse_taken:{p:.75,duration:1600,pick:()=>'curse_offended'},
  curse_landed:{p:.55,duration:1500,pick:()=>'curse_approving'},
  stop_taken:{p:.75,duration:1600,pick:()=>'stop_interpreting'},
  stop_given:{p:.6,duration:1500,pick:()=>'stop_pleased'},
  king:{p:ctx=>ctx.own?.2:.85,duration:1700,pick:ctx=>ctx.own?'good_move_satisfied':'king_suspicious'},
  reverse:{p:.6,duration:1500,pick:(ctx,r)=>r()<.55?'idle_did_you_see_that':'idle_means_something'},
  player_one_card:{p:1,always:true,duration:2000,pick:(ctx,r)=>ctx.persist?'player_one_card_thinking':(r()<.55?'player_one_card_alarm':'player_one_card_connecting')},
  own_one_card:{p:1,always:true,duration:1800,pick:(ctx,r)=>r()<.6?'veyra_one_card':'veyra_one_card_certain'},
  omen_hit:{p:1,always:true,duration:2200,pick:(ctx,r)=>r()<.5?'omen_hit_pointing':'omen_hit_delighted'},
  omen_miss:{p:1,always:true,duration:2000,pick:(ctx,r)=>r()<.55?'omen_miss_rationalizing':'omen_miss_shut_up'},
  close_game:{p:.8,duration:1800,pick:()=>'stop_interpreting'},
  slow_player:{p:.7,duration:1800,pick:(ctx,r)=>r()<.5?'intro_something_wrong':'idle_means_something'},
  // While an omen is open she keeps checking it: the bones for a drawing or a Curse, the flame for red.
  idle_beat:{p:.6,duration:2400,pick:(ctx,r)=>{
    if(ctx.concerned)return 'player_one_card_thinking';
    if(ctx.omen&&r()<.55)return ctx.omen==='red'?'omen_watching_flame':ctx.omen==='turn'?'idle_means_something':'omen_reading_bones';
    return pickOf(['idle_means_something','intro_something_wrong','idle_did_you_see_that','intro_bones','idle_means_something','intro_something_wrong'],r);
  }},
  one_card_settled:{p:.7,always:true,duration:1500,pick:(ctx,r)=>r()<.6?'draw_reinterpretation':'good_move_knew_it'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','close_game','one_card_settled','omen','omen_hit','omen_miss']);

// ── The omen book ─────────────────────────────────────────────────────────────
// Character presentation, never a rule: an omen changes nothing in the game and
// she never knows anything you don't. Now and then she declares one; the book
// remembers it for a while and watches ordinary public events. If something close
// enough happens she explodes ("I TOLD YOU!"). If the omen runs out she argues
// with the bones. When a hand ends first, the omen simply lapses (silently: the
// result line owns that moment). Nothing steers the cards toward an omen.
// Read generously, the way she would:
//   draw   "Someone is drawing before this is over."  — a Curse is taken, or someone
//          nearly out has to draw.
//   red    "Red brings trouble tonight."               — a Burgundy Curse or Shield hurts
//          someone, or Burgundy is called and someone cannot follow it.
//   turn   "This game will turn on itself."            — a Turnabout, a Curse thrown back,
//          a King breaking a Curse, or the lead changing hands.
//   regret "Someone is going to regret a Curse."       — a Curse thrown back or broken by a
//          King, or whoever cursed this hand ends up drawing.
export const VEYRA_OMEN_KINDS=Object.freeze(['draw','red','turn','regret']);
export const VEYRA_OMEN_LINES=Object.freeze({draw:'omen_01',red:'omen_02',turn:'omen_03',regret:'omen_04'});
// Tuning, in counted table actions (a card played or drawn) and active seconds. One
// omen a hand at most; each omen once a match; a Tavern table is quieter. `settle`:
// the table has to move on before anything counts as the sign — an omen that comes
// true on the very next card feels like a cheat, not a story.
export const VEYRA_OMEN_TUNING=Object.freeze({
  duel:Object.freeze({chance:.12,earliest:3,latest:12,settle:3,settleMs:6500,expire:18,perMatch:3,minGap:1}),
  tavern:Object.freeze({chance:.08,earliest:4,latest:18,settle:4,settleMs:7000,expire:20,perMatch:2,minGap:1})
});
// One table update → the public facts an omen can be read from.
export function veyraOmenEvent({mode='duel',played=null,playedCard=null,stop=null,stack=null,penalty=null,draw=null,reverse=null,closed=null,topColor=null,activeColor=null,counts={},previousCounts={},penaltyBefore=false,cursers=[]}={}){
  const drawer=penalty?.playerId||draw?.playerId||null,before=drawer?(previousCounts[drawer]??counts[drawer]??9):9;
  // The lead: who holds the fewest cards, and by how much.
  const lead=c=>{const entries=Object.entries(c);if(entries.length<2)return null;const sorted=entries.toSorted((x,y)=>x[1]-y[1]);return sorted[0][1]<sorted[1][1]?{id:sorted[0][0],margin:sorted[1][1]-sorted[0][1]}:null;};
  // A four-seat table is busier, so it takes a little more to count.
  const busy=mode!=='duel',was=lead(previousCounts),now=lead(counts);
  return {
    penalty:penalty?{amount:penalty.amount||1,playerId:penalty.playerId}:null,
    curseColor:penalty?topColor:null,
    skip:!!stop,cardColor:stop||closed?playedCard?.color??null:null,
    painfulDraw:!!draw&&before<=(busy?1:2),
    offColour:!!draw&&activeColor==='red',
    reverse:!!reverse||playedCard?.type==='reverse',
    stackBack:(stack?.amount||0)>=4,
    kingBreak:playedCard?.type==='king'&&penaltyBefore,
    leadFlip:!!was&&!!now&&was.id!==now.id&&now.margin>=(busy?3:2),
    curserDraws:!!drawer&&cursers.includes(drawer)
  };
}
export function veyraOmenMatches(kind,e={}){
  const curse=(e.penalty?.amount||0)>=2;
  switch(kind){
    case 'draw':return curse||!!e.painfulDraw;
    case 'red':return (curse&&e.curseColor==='red')||(!!e.skip&&e.cardColor==='red')||!!e.offColour;
    case 'turn':return !!e.reverse||!!e.stackBack||!!e.kingBreak||!!e.leadFlip;
    case 'regret':return !!e.stackBack||!!e.kingBreak||!!e.curserDraws;
    default:return false;
  }
}
export function createVeyraOmenBook({mode='duel',random=Math.random,now=()=>Date.now(),initial=null}={}){
  const T=VEYRA_OMEN_TUNING[mode]||VEYRA_OMEN_TUNING.duel;
  const s={active:null,used:[],declared:0,hits:0,misses:0,events:0,declaredThisRound:false,roundsSince:9,hitThisRound:false,missedThisRound:false,hitThisMatch:false,missedThisMatch:false,...(initial||{})};
  // A restored omen restarts its clock (the time spent away is not table time).
  if(s.active)s.active={...s.active,time:now()};
  const book={
    mode,
    get active(){return s.active?.kind||null;},
    // A counted table action happened (a card played, a card drawn).
    tick(){s.events++;},
    // Should she declare one now? Public context only.
    wantsToDeclare({activeColor=null,tension=false}={}){
      if(s.active||s.declaredThisRound||s.declared>=T.perMatch||s.roundsSince<T.minGap||tension)return null;
      if(s.events<T.earliest||s.events>T.latest||random()>T.chance)return null;
      const fresh=VEYRA_OMEN_KINDS.filter(kind=>!s.used.includes(kind));if(!fresh.length)return null;
      // The flame likes red when red is on the table; nothing else is weighted.
      const weight=kind=>kind==='red'&&activeColor==='red'?1.6:1;
      const total=fresh.reduce((sum,kind)=>sum+weight(kind),0);let roll=random()*total;
      for(const kind of fresh){roll-=weight(kind);if(roll<0)return kind;}
      return fresh.at(-1);
    },
    // Only an omen she actually voiced is remembered.
    declare(kind){if(!VEYRA_OMEN_KINDS.includes(kind))return null;s.active={kind,at:s.events,time:now()};s.used=[...new Set([...s.used,kind])];s.declared++;s.declaredThisRound=true;s.roundsSince=0;return kind;},
    // A table event (public facts) → {result:'hit'|'miss',kind} or null.
    observe(e={}){
      if(!s.active)return null;const kind=s.active.kind,settled=s.events-s.active.at>=T.settle&&now()-(s.active.time??-Infinity)>=T.settleMs;
      if(settled&&veyraOmenMatches(kind,e)){s.active=null;s.hits++;s.hitThisRound=true;s.hitThisMatch=true;return {result:'hit',kind};}
      if(s.events-s.active.at>=T.expire){s.active=null;s.misses++;s.missedThisRound=true;s.missedThisMatch=true;return {result:'miss',kind};}
      return null;
    },
    // A hand ended with the omen still open: it lapses without a word.
    beginRound(){if(s.active){s.active=null;s.missedThisMatch=true;}s.events=0;if(s.declaredThisRound)s.roundsSince=0;else s.roundsSince++;s.declaredThisRound=false;s.hitThisRound=false;s.missedThisRound=false;},
    endRound(){if(s.active){s.active=null;s.missedThisRound=true;s.missedThisMatch=true;}},
    story:()=>({hits:s.hits,misses:s.misses,hitThisRound:s.hitThisRound,missedThisRound:s.missedThisRound,hitThisMatch:s.hitThisMatch,missedThisMatch:s.missedThisMatch,omenActive:!!s.active,omen:s.active?.kind||null}),
    snapshot:()=>JSON.parse(JSON.stringify(s))
  };
  return book;
}

const CASUAL_GAP=11000;
const VEYRA_SPEC=Object.freeze({
  reactions:VEYRA_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:VEYRA_STATES,
  persistentStates:['default','attentive','watchful','certain','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:VEYRA_DEFAULT_EXPRESSION,
  // More voice than Kesh, still well short of constant: ~11 s and three actions
  // between casual lines, two ordinary lines a hand (three in a long one). Omen
  // payoffs (HIGH) keep a small allowance of their own so the story can land.
  timing:{visualGap:2200,casualGap:CASUAL_GAP,casualEvents:3,highGap:3800,highBudget:3,idleQuiet:18000},
  roundBudget:c=>c.eventsThisRound>=36?3:2,
  counters:{recentRemarks:[],hits:0},
  hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .22;
    if(reaction.trigger==='own_draw')return context.forced?.24:.07;
    if(reaction.trigger==='player_draw')return context.haul?.28:.04;
    if(reaction.trigger==='player_good_move'&&context.big)return .38;
    if(reaction.trigger==='king'&&context.broke)return .55;
    if(reaction.category==='omen')return 1;
    if(reaction.category==='omen_hit')return .92;
    if(reaction.category==='omen_miss')return .75;
    return reaction.probability;
  },
  // First meeting: one line. Later: usually a line, sometimes only a look.
  planIntro:(context,random)=>context.firstEncounter?'voice':random()<.68?'voice':random()<.75?'expression':'none',
  introLook:random=>({expression:['intro_something_wrong','intro_bones','omen_watching_flame'][Math.floor(random()*3)],duration:2400}),
  suppress(trigger,context,{quiet}){
    // About to go straight out on her own turn: the result line will speak instead.
    if(trigger==='own_one_card'&&context.ownTurn)return true;
    // The player still holds the turn and may go out right now: she only stares.
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    if(trigger==='player_one_card'&&context.persist&&quiet<CASUAL_GAP)return true;
    return false;
  },
  enrich(trigger,context,counters){return {...context,recentRemarks:counters.recentRemarks||[],hits:counters.hits||0};},
  eligible(item,context,counters){
    if(item.when&&!item.when(context))return false;
    if(item.category==='intro'&&(counters.intros||0)>=1)return false;
    if(!['result','intro','omen','omen_hit'].includes(item.category)&&(counters.recentRemarks||[])[0]===item.remark)return false;
    return true;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    if(reaction.category!=='idle')return false;
    if(context.playerOnOneCard||counters.idleThisRound>=1)return true;
    if(reaction.trigger==='idle_quiet'&&(sinceQuiet<timing.idleQuiet||counters.eventsThisRound<10))return true;
    return false;
  },
  onRemember(reaction,counters){
    counters.recentRemarks=[reaction.remark,...(counters.recentRemarks||[]).filter(item=>item!==reaction.remark)].slice(0,4);
    if(reaction.category==='omen_hit')counters.hits=(counters.hits||0)+1;
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
