import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';
import { createVoiceCatalog, lineFactory, normalizeLocale } from './authored-pack.js';

// ─────────────────────────────────────────────────────────────────────────────
// GORVAN. Formally Lord Gorvan; he would rather you didn't. Sixth authored
// opponent on the shared framework, built on duel/authored-pack.js.
//
// He looks and sounds like a classic villain and behaves like an extremely calm,
// polite, dry man who wants to sit in a tavern and play cards. The joke is the
// contrast, so it is never pushed: the smallest emotional range in the cast,
// acting in the eyes, a brow, the angle of the head. Silence suits him best,
// so he is also the quietest voice at the table.
//
// His voice is English only. In Hebrew the bubbles carry the authored Hebrew
// text over the English recording (there are no Hebrew takes and none are
// invented). No vampire mechanics: his AI (game-ai/veteran.js → PATIENT_PROFILE)
// is a fair, patient player and his few sound accents (app.js) are presentation.
// ─────────────────────────────────────────────────────────────────────────────

// Character pack (Gorvan/gorvan_character_pack/implementation/gorvan_expression_manifest.json).
// 24 poses share one 640×640 canvas: the same 1700 px crop of every 2048 px master
// (his seated bust and resting forearms, with the shared forearm baseline), scaled
// uniformly, so swaps never jump. 22–24 are silent glances.
export const GORVAN_EXPRESSION_FILES=Object.freeze({
  neutral:'01_neutral',formal:'02_formal',curious:'03_curious',retreat:'04_retreat',approval:'05_approval',impressed:'06_impressed',
  certainty:'07_certainty',sympathetic:'08_sympathetic',not_ideal:'09_not_ideal',attentive:'10_attentive',dry_amusement:'11_dry_amusement',rude:'12_rude',
  firm_stop:'13_firm_stop',pleasant:'14_pleasant',sincere_nod:'15_sincere_nod',another:'16_another',
  title_tired:'17_title_tired',title_patient:'18_title_patient',title_firm:'19_title_firm',title_resigned:'20_title_resigned',
  reminiscing:'21_reminiscing',silent_down:'22_silent_down',silent_opponent:'23_silent_opponent',silent_narrow:'24_silent_narrow'
});
export const GORVAN_EXPRESSIONS=Object.freeze(Object.keys(GORVAN_EXPRESSION_FILES));
export const GORVAN_DEFAULT_EXPRESSION='neutral';
export const gorvanExpressionURL=(name=GORVAN_DEFAULT_EXPRESSION)=>new URL(`../assets/gorvan/expressions/gorvan_${GORVAN_EXPRESSION_FILES[name]||GORVAN_EXPRESSION_FILES[GORVAN_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
const preloader=createExpressionPreloader({names:GORVAN_EXPRESSIONS,urlFor:gorvanExpressionURL,label:'Gorvan'});
export const preloadGorvanExpressions=()=>preloader.preload();
export const gorvanExpressionsReady=()=>preloader.ready();

// Presentation states. `default` is patient and still. Short hands: `attentive`
// (a narrower look). The player's last card: `watchful`. His own: `certain`.
export const GORVAN_STATES=Object.freeze(['default','attentive','watchful','certain','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'neutral',attentive:'silent_narrow',watchful:'attentive',certain:'certainty',result:null});

// Authored script (Gorvan Script.txt), performance directions removed. `en` is the
// recorded line; `he` is the authored Hebrew subtitle text, shown over the English
// voice. Owner-edited canonical lines (idle_03, idle_05, player_good_move_02,
// match_win_01) are the script's current text. Reverse 01/02 were deleted.
export const GORVAN_SCRIPT=Object.freeze({
  intro_01:{en:"Gorvan. Just Gorvan.",he:"גורבן. פשוט גורבן.",s:2.77},
  intro_02:{en:"Shall we?",he:"שנתחיל?",s:1.15},
  intro_03:{en:"Very well. One game.",he:"טוב מאוד. משחק אחד.",s:2.51},
  intro_04:{en:"No need for titles.",he:"אין צורך בתארים.",s:1.88},
  idle_01:{en:"Take your time. I have plenty.",he:"אין לחץ. יש לי זמן.",s:3.08},
  idle_02:{en:"The evening is still young.",he:"הערב עוד צעיר.",s:2.51},
  idle_03:{en:"Hm. I wonder.",he:"הממ. מעניין.",s:2.77},
  idle_04:{en:"You have a very steady pulse.",he:"הדופק שלך מאוד יציב.",s:2.85},
  idle_05:{en:"Nevermind, nevermind...",he:"לא משנה, לא משנה...",s:3.63},
  player_good_move_01:{en:"Excellent.",he:"מצוין.",s:1.31},
  player_good_move_02:{en:"Impressive. Most impressive.",he:"מרשים. מרשים מאוד.",s:3.4},
  player_good_move_03:{en:"I did not expect that.",he:"לזה לא ציפיתי.",s:1.96},
  player_good_move_04:{en:"Clever.",he:"חכם.",s:1.07},
  good_move_01:{en:"There.",he:"הנה.",s:0.99},
  good_move_02:{en:"That should do.",he:"זה אמור להספיק.",s:1.31},
  good_move_03:{en:"Better.",he:"יותר טוב.",s:1.49},
  good_move_04:{en:"Unfortunate.",he:"מצער.",s:1.8},
  player_draw_01:{en:"Unfortunate.",he:"לא נעים.",s:1.96},
  player_draw_02:{en:"Another one, then.",he:"עוד אחד, אם כך.",s:2.35},
  player_draw_03:{en:"My condolences.",he:"תנחומיי.",s:1.96},
  draw_01:{en:"Very well.",he:"שיהיה.",s:1.31},
  draw_02:{en:"Not ideal.",he:"לא אידיאלי.",s:1.49},
  draw_03:{en:"Hm. No.",he:"הממ. לא.",s:1.57},
  player_one_card_01:{en:"Ah. We should address that.",he:"אה. כדאי לטפל בזה.",s:2.43},
  player_one_card_02:{en:"Nearly there.",he:"כמעט שם.",s:1.72},
  player_one_card_03:{en:"Now this is interesting.",he:"עכשיו זה מעניין.",s:2.12},
  player_one_card_04:{en:"One card. Very good.",he:"קלף אחד. יפה מאוד.",s:2.59},
  one_card_01:{en:"One remains.",he:"נשאר אחד.",s:1.8},
  one_card_02:{en:"Nearly finished.",he:"כמעט סיימנו.",s:1.72},
  one_card_03:{en:"Do try to stop me.",he:"אפשר לנסות לעצור אותי.",s:2.19},
  curse_01:{en:"A curse. How quaint.",he:"קללה. מקסים.",s:2.69},
  curse_02:{en:"Effective.",he:"יעיל.",s:1.65},
  curse_received_01:{en:"Rude.",he:"חצוף.",s:1.41},
  stop_01:{en:"Not yet.",he:"עוד לא.",s:1.96},
  stop_02:{en:"Sensible.",he:"הגיוני.",s:2.04},
  king_01:{en:"Ah. Royalty.",he:"אה. אצולה.",s:2.43},
  king_02:{en:"I have had enough of kings.",he:"היו לי מספיק מלכים לחיים האלה.",s:2.35},
  round_win_01:{en:"There we are.",he:"הנה.",s:1.31},
  round_win_02:{en:"Another round?",he:"עוד סיבוב?",s:1.31},
  round_win_03:{en:"Still with me?",he:"עדיין איתי?",s:1.88},
  round_loss_01:{en:"Well played.",he:"משחק יפה.",s:1.57},
  round_loss_02:{en:"Hm. Very good.",he:"הממ. יפה מאוד.",s:1.88},
  round_loss_03:{en:"Again.",he:"שוב.",s:1.15},
  match_win_01:{en:"That was pleasant.",he:"זה היה נעים.",s:2.19},
  match_win_02:{en:"And that is that.",he:"וזהו זה.",s:2.12},
  match_win_03:{en:"Thank you for the diversion.",he:"תודה על ההפוגה.",s:1.88},
  match_win_04:{en:"Another evening, perhaps.",he:"אולי בערב אחר.",s:2.35},
  match_loss_01:{en:"Congratulations.",he:"ברכות.",s:2.04},
  match_loss_02:{en:"Hm. Well played.",he:"הממ. משחק יפה.",s:2.12},
  match_loss_03:{en:"Another?",he:"עוד אחד?",s:0.99},
  match_loss_04:{en:"I have survived worse.",he:"שרדתי דברים גרועים יותר.",s:3.24},
  title_01:{en:"Gorvan is fine.",he:"גורבן זה מספיק.",s:2.04},
  title_02:{en:"Please. Not the title.",he:"בבקשה. בלי התואר.",s:2.59},
  title_03:{en:"Do not call me that.",he:"אל תקראו לי ככה.",s:2.04},
  title_04:{en:"We are not doing this again.",he:"אנחנו לא עושים את זה שוב.",s:2.35},
  flavor_01:{en:"I've had sieges end sooner than this.",he:"ראיתי מצורים שנגמרו מהר יותר.",s:2.77},
  flavor_02:{en:"I remember when the rules were different.",he:"אני זוכר כשהחוקים היו אחרים.",s:2.69},
  flavor_03:{en:"No. Before your time.",he:"לא. לפני זמנך.",s:2.69},
  flavor_04:{en:"The usual, please.",he:"כרגיל, בבקשה.",s:2.19}});

const line=lineFactory({prefix:'gorvan',script:GORVAN_SCRIPT});
const result={category:'result',nextState:'result'};
// The house calls him "Lord Gorvan". He corrects it, a little more tiredly each time.
const title=step=>({category:'intro',when:({titleStep})=>titleStep===step});
const plainIntro={category:'intro',when:({titleStep})=>!titleStep};

export const GORVAN_REACTIONS=Object.freeze([
  // A first meeting is always "Gorvan. Just Gorvan."; later he has less to explain.
  line('intro_01','intro','formal','CRITICAL',{...plainIntro,weight:({firstEncounter})=>firstEncounter?1:.35}),
  line('intro_02','intro','formal','CRITICAL',{...plainIntro,when:({titleStep,firstEncounter})=>!titleStep&&!firstEncounter}),
  line('intro_03','intro','neutral','CRITICAL',{...plainIntro,when:({titleStep,firstEncounter})=>!titleStep&&!firstEncounter}),
  line('intro_04','intro','title_tired','CRITICAL',{...plainIntro,when:({titleStep,firstEncounter})=>!titleStep&&!firstEncounter}),
  // Title progression (a later meeting, now and then): tired → patient → firmer → resigned.
  line('title_01','intro','title_tired','CRITICAL',title(1)),
  line('title_02','intro','title_patient','CRITICAL',title(2)),
  line('title_03','intro','title_firm','CRITICAL',title(3)),
  line('title_04','intro','title_resigned','CRITICAL',title(4)),

  // Idles are rare and need real quiet. The pulse remark comes with its own
  // retraction ("Nevermind, nevermind..."), one performance in two beats.
  line('idle_02','idle_quiet','neutral','LOW',{category:'idle',probability:.2}),
  line('idle_03','idle_quiet','curious','LOW',{category:'idle',probability:.2}),
  line('idle_04','idle_quiet','attentive','LOW',{category:'idle',probability:.16,followUp:{id:'idle_05',delay:700},when:({playerOnOneCard})=>!playerOnOneCard}),
  line('idle_05','follow_up','retreat','LOW',{category:'idle'}),
  // Rare flavour: at most two a match. "No. Before your time." only ever follows the rules remark.
  line('flavor_01','idle_quiet','reminiscing','LOW',{category:'flavor',probability:.3,when:({longRound})=>!!longRound}),
  line('flavor_02','idle_quiet','dry_amusement','LOW',{category:'flavor',probability:.14,followUp:{id:'flavor_03',delay:1100}}),
  line('flavor_03','follow_up','reminiscing','LOW',{category:'flavor'}),
  line('flavor_04','idle_quiet','reminiscing','LOW',{category:'flavor',probability:.14}),
  // A player who sits on a decision: he has time. At most once a match.
  line('idle_01','slow_player','neutral','LOW',{category:'idle',probability:.4}),

  // Restrained, sincere approval.
  line('player_good_move_01','player_good_move','approval','MEDIUM',{probability:.1}),
  line('player_good_move_02','player_good_move','impressed','MEDIUM',{probability:.1,weight:({big})=>big?2.2:.6}),
  line('player_good_move_03','player_good_move','impressed','MEDIUM',{probability:.1,weight:({hurt})=>hurt?1.6:1}),
  line('player_good_move_04','player_good_move','approval','MEDIUM',{probability:.1}),

  // His own strong play. "Unfortunate." is almost an apology, for a move that hurt you.
  line('good_move_01','own_good_move','certainty','LOW',{probability:.08}),
  line('good_move_02','own_good_move','certainty','LOW',{probability:.08}),
  line('good_move_03','own_good_move','certainty','LOW',{probability:.08,weight:({wasBehind})=>wasBehind?2:1}),
  line('good_move_04','curse_landed','sympathetic','LOW',{probability:.16,weight:({haul})=>haul?1.8:1}),

  // The player has to take cards.
  line('player_draw_01','player_draw','sympathetic','LOW',{probability:.2,when:({haul})=>!!haul}),
  line('player_draw_02','player_draw','silent_down','LOW',{probability:.2,when:({haul})=>!haul}),
  line('player_draw_03','curse_landed','sympathetic','LOW',{probability:.16,when:({haul})=>!!haul}),

  // His own draws: mild, unbothered.
  line('draw_01','own_draw','neutral','LOW',{weight:({forced})=>forced?2:.6}),
  line('draw_02','own_draw','not_ideal','LOW'),
  line('draw_03','own_draw','not_ideal','LOW',{weight:({forced})=>forced?.4:1.4}),

  // The player's last card: attentive, never alarmed.
  line('player_one_card_01','player_one_card','attentive','HIGH',{probability:.5,nextState:'watchful',weight:({persist})=>persist?.4:1.3}),
  line('player_one_card_02','player_one_card','attentive','HIGH',{probability:.5,nextState:'watchful'}),
  line('player_one_card_03','player_one_card','attentive','HIGH',{probability:.5,nextState:'watchful'}),
  line('player_one_card_04','player_one_card','approval','HIGH',{probability:.5,nextState:'watchful'}),

  // His own last card. "Do try to stop me." is quiet confidence, not a threat.
  line('one_card_01','own_one_card','certainty','HIGH',{probability:.4,nextState:'certain'}),
  line('one_card_02','own_one_card','certainty','HIGH',{probability:.4,nextState:'certain'}),
  line('one_card_03','own_one_card','firm_stop','HIGH',{probability:.4,nextState:'certain'}),

  // Special cards, contextually.
  line('curse_received_01','curse_taken','rude','MEDIUM',{probability:.24,weight:({amount})=>(amount||2)>=4?1.4:1}),
  line('curse_01','curse_taken','dry_amusement','MEDIUM',{probability:.24,weight:({firstCurse})=>firstCurse?1.6:.5}),
  line('curse_02','curse_landed','approval','MEDIUM',{probability:.16}),
  line('stop_01','stop_given','firm_stop','MEDIUM',{probability:.2,weight:({urgent})=>urgent?2.4:.6}),
  line('stop_02','stop_taken','approval','MEDIUM',{probability:.13}),
  line('king_01','king','dry_amusement','MEDIUM',{probability:.22,when:({own})=>!own,weight:({broke})=>broke?.5:1}),
  line('king_02','king','title_patient','MEDIUM',{probability:.22,when:({own})=>!own,weight:({broke})=>broke?2.4:.3}),

  // Results: exactly one line per hand.
  line('round_win_01','round_win','certainty','CRITICAL',result),
  line('round_win_02','round_win','another','CRITICAL',result),
  line('round_win_03','round_win','dry_amusement','CRITICAL',{...result,weight:({lead})=>lead?1.6:.7}),
  line('round_loss_01','round_loss','sincere_nod','CRITICAL',result),
  line('round_loss_02','round_loss','approval','CRITICAL',result),
  line('round_loss_03','round_loss','another','CRITICAL',result),
  line('match_win_01','match_win','pleasant','CRITICAL',{...result,weight:({close})=>close?1.6:1.2}),
  line('match_win_02','match_win','neutral','CRITICAL',result),
  line('match_win_03','match_win','formal','CRITICAL',result),
  line('match_win_04','match_win','pleasant','CRITICAL',result),
  line('match_loss_01','match_loss','sincere_nod','CRITICAL',{...result,weight:({close})=>close?1:1.4}),
  line('match_loss_02','match_loss','sincere_nod','CRITICAL',result),
  line('match_loss_03','match_loss','another','CRITICAL',{...result,weight:({close})=>close?1.6:1}),
  line('match_loss_04','match_loss','dry_amusement','CRITICAL',{...result,weight:({close})=>close?.6:1.4})
]);

// English recordings only. In Hebrew the bubble shows the authored Hebrew text over
// the English take — no `_he` files exist and none are looked for.
const catalog=createVoiceCatalog({label:'Gorvan',folder:'gorvan',reactions:GORVAN_REACTIONS,audioFor:()=> 'en'});
export const GORVAN_VOICE_LIBRARY=catalog.library;
export const resolveGorvanVoice=catalog.resolveVoice;
export const resolveGorvanReaction=catalog.resolveReaction;
export const debugMarkGorvanVoiceMissing=catalog.markMissing;
export const gorvanDebugMissingVoices=catalog.forcedMissing;
export const normalizeGorvanLocale=normalizeLocale;

// Silent faces: small and frequent. A glance at a card, a look at you, a narrower
// assessment. Visual-only reactions are where most of his acting happens.
const pickOf=(items,r)=>items[Math.floor(r()*items.length)];
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?.8:.45,duration:1800,pick:(ctx,r)=>ctx.big?(r()<.5?'impressed':'approval'):'silent_opponent'},
  own_good_move:{p:.3,duration:1600,pick:(ctx,r)=>r()<.5?'silent_narrow':'certainty'},
  player_draw:{p:ctx=>ctx.haul?.6:.14,duration:1500,pick:ctx=>ctx.haul?'sympathetic':'silent_down'},
  own_draw:{p:ctx=>ctx.forced?.55:.25,duration:1500,pick:(ctx,r)=>ctx.forced?'not_ideal':(r()<.6?'silent_down':'not_ideal')},
  curse_taken:{p:.6,duration:1600,pick:(ctx,r)=>r()<.6?'rude':'dry_amusement'},
  curse_landed:{p:.4,duration:1500,pick:(ctx,r)=>ctx.haul?'sympathetic':(r()<.5?'silent_narrow':'silent_opponent')},
  stop_taken:{p:.5,duration:1500,pick:()=>'silent_opponent'},
  stop_given:{p:.4,duration:1500,pick:()=>'firm_stop'},
  king:{p:ctx=>ctx.own?.2:.6,duration:1600,pick:ctx=>ctx.own?'certainty':ctx.broke?'title_patient':'dry_amusement'},
  reverse:{p:.3,duration:1400,pick:()=>'curious'},
  player_one_card:{p:1,always:true,duration:2000,pick:()=>'attentive'},
  own_one_card:{p:1,always:true,duration:1800,pick:(ctx,r)=>r()<.7?'certainty':'silent_narrow'},
  close_game:{p:.6,duration:1800,pick:()=>'silent_narrow'},
  slow_player:{p:.5,duration:1800,pick:(ctx,r)=>r()<.6?'silent_opponent':'neutral'},
  idle_beat:{p:.45,duration:2400,pick:(ctx,r)=>ctx.concerned?'attentive':pickOf(['silent_down','silent_opponent','silent_narrow','curious','silent_down','reminiscing'],r)},
  one_card_settled:{p:.6,always:true,duration:1500,pick:(ctx,r)=>r()<.5?'neutral':'silent_down'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','close_game','one_card_settled','follow_up']);

const CASUAL_GAP=16000,GORVAN_ORDINARY_PER_MATCH=4;
const GORVAN_SPEC=Object.freeze({
  reactions:GORVAN_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:GORVAN_STATES,
  persistentStates:['default','attentive','watchful','certain','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:GORVAN_DEFAULT_EXPRESSION,
  // The quietest voice in the cast: four meaningful actions and ~16 s between casual
  // lines, one ordinary line a hand (two in a very long one). His face does the rest.
  timing:{visualGap:3000,casualGap:CASUAL_GAP,casualEvents:4,highGap:5000,highBudget:2,idleQuiet:24000},
  roundBudget:c=>c.eventsThisRound>=44?2:1,
  counters:{recentRemarks:[],flavors:0,patience:0,curses:0,ordinary:0},
  hasVoice:catalog.hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .15;
    if(reaction.trigger==='own_draw')return context.forced?.12:.04;
    if(reaction.trigger==='player_good_move'&&context.big)return .26;
    if(reaction.trigger==='king'&&context.broke)return .45;
    return reaction.probability;
  },
  // First meeting: one line ("Gorvan. Just Gorvan."). Later: a line, a look, or nothing.
  planIntro:(context,random)=>context.firstEncounter||context.titleStep?'voice':random()<.5?'voice':random()<.6?'expression':'none',
  introLook:random=>({expression:['formal','silent_opponent','neutral'][Math.floor(random()*3)],duration:2400}),
  suppress(trigger,context,{quiet}){
    if(trigger==='own_one_card'&&context.ownTurn)return true;
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    if(trigger==='player_one_card'&&context.persist&&quiet<CASUAL_GAP)return true;
    return false;
  },
  enrich(trigger,context,counters){return {...context,recentRemarks:counters.recentRemarks||[],firstCurse:!counters.curses,longRound:counters.eventsThisRound>=30};},
  eligible(item,context,counters){
    if(item.when&&!item.when(context))return false;
    if(item.category==='intro'&&(counters.intros||0)>=1)return false;
    if(item.trigger==='follow_up')return false;
    if(item.category==='flavor'&&counters.flavors>=2)return false;
    // When he does speak, it should matter: at most four ordinary remarks a match
    // (his last-card lines, the introduction and the results stand apart).
    if(!['result','intro'].includes(item.category)&&item.priority!=='HIGH'&&item.trigger!=='follow_up'&&(counters.ordinary||0)>=GORVAN_ORDINARY_PER_MATCH)return false;
    if(item.trigger==='slow_player'&&counters.patience>=1)return false;
    if(item.category!=='result'&&item.category!=='intro'&&(counters.recentRemarks||[])[0]===item.remark)return false;
    return true;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    if(!['idle','flavor'].includes(reaction.category))return false;
    if(context.playerOnOneCard||counters.idleThisRound>=1)return true;
    if(reaction.trigger==='idle_quiet'&&(sinceQuiet<timing.idleQuiet||counters.eventsThisRound<14))return true;
    return false;
  },
  onRemember(reaction,counters){
    counters.recentRemarks=[reaction.remark,...(counters.recentRemarks||[]).filter(item=>item!==reaction.remark)].slice(0,4);
    if(reaction.category==='flavor')counters.flavors++;
    if(!['result','intro'].includes(reaction.category)&&reaction.priority!=='HIGH'&&reaction.trigger!=='follow_up')counters.ordinary=(counters.ordinary||0)+1;
    if(reaction.trigger==='slow_player')counters.patience++;
    if(reaction.trigger==='curse_taken')counters.curses++;
  },
  onObserve(trigger,context,{setBase,counters}){if(trigger==='player_one_card')setBase('watchful');if(trigger==='curse_taken')counters.cursesSeen=(counters.cursesSeen||0)+1;},
  baseFromTable({humanCount,ownCount}){
    if(humanCount===1)return 'watchful';
    if(ownCount===1)return 'certain';
    if(humanCount<=3&&ownCount<=3)return 'attentive';
    return 'default';
  },
  recovery:{from:'watchful',to:'default',visual:'one_card_settled'}
});
export function createGorvanController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(GORVAN_SPEC,{random,now,initial});
}

