import { createExpressionPreloader } from './expression-preload.js';
import { createAuthoredController } from './authored-controller.js';

// ─────────────────────────────────────────────────────────────────────────────
// KESH — the Traveler. Fourth authored opponent on the shared character
// framework (reaction table → shared controller → shared expression stage,
// speech bubble and Web Audio voice channel).
// A quiet lizardfolk traveller who reads the table through signs and omens:
// roads, wind, fire, rivers. He watches everything and says very little. His
// face does most of the work; his voice is the rarest of the four.
// His signs are superstition, not magic. Sometimes they are right; sometimes
// he misreads them and says so. His carved rune stone is a stone he checks,
// never a spell: no glow, no particles, no hidden knowledge.
// ─────────────────────────────────────────────────────────────────────────────

const voiceAsset=name=>new URL(`../assets/kesh/voice/${name}.mp3`,import.meta.url).href;
const MISSING_VOICE_URL=new URL('../assets/kesh/voice/__missing__.mp3',import.meta.url).href;

// Character pack manifest (kesh_character_pack/implementation/kesh_expression_manifest.json).
// All 40 poses share one 640×640 transparent canvas: the same 1920 px crop of every
// 2048 px master, scaled uniformly and bottom-centre anchored, so swaps never jump.
// Rune stone poses: 03 07 18 19 29 31 34 38 39 40. Cup: 05 only. The bronze
// compass brooch is clothing, never the omen prop.
export const KESH_EXPRESSION_FILES=Object.freeze({
  default_observant:'01_default_observant',intro_studying_table:'02_intro_studying_table',intro_rune_touch:'03_intro_rune_touch',intro_quiet_signs:'04_intro_quiet_signs',
  drinking:'05_drinking',watching_fire:'06_watching_fire',turning_rune:'07_turning_rune',dry_amusement:'08_dry_amusement',
  player_good_move_approval:'09_player_good_move_approval',interesting_choice:'10_interesting_choice',close_observation:'11_close_observation',
  good_move_satisfaction:'12_good_move_satisfaction',expected_result:'13_expected_result',
  plans_disrupted:'14_plans_disrupted',dry_annoyance:'15_dry_annoyance',really:'16_really',
  genuine_surprise:'17_genuine_surprise',reconsidering_omen:'18_reconsidering_omen',rune_was_wrong:'19_rune_was_wrong',
  player_draw:'20_player_draw',kesh_draw:'21_kesh_draw',bad_draw:'22_bad_draw',save_for_later:'23_save_for_later',
  skip_interrupted:'24_skip_interrupted',curse_observation:'25_curse_observation',reverse_observation:'26_reverse_observation',king_observation:'27_king_observation',
  player_one_card:'28_player_one_card',player_one_card_signs:'29_player_one_card_signs',kesh_one_card:'30_kesh_one_card',road_clear:'31_road_clear',
  round_win:'32_round_win',round_loss:'33_round_loss',round_loss_misread:'34_round_loss_misread',
  match_win:'35_match_win',match_loss:'36_match_loss',match_loss_knowing_smile:'37_match_loss_knowing_smile',
  omen_touch:'38_omen_touch',omen_reading:'39_omen_reading',omen_realization:'40_omen_realization'
});
export const KESH_EXPRESSIONS=Object.freeze(Object.keys(KESH_EXPRESSION_FILES));
export const KESH_DEFAULT_EXPRESSION='default_observant';
export const keshExpressionURL=(name=KESH_DEFAULT_EXPRESSION)=>new URL(`../assets/kesh/expressions/kesh_${KESH_EXPRESSION_FILES[name]||KESH_EXPRESSION_FILES[KESH_DEFAULT_EXPRESSION]}.webp`,import.meta.url).href;
const preloader=createExpressionPreloader({names:KESH_EXPRESSIONS,urlFor:keshExpressionURL,label:'Kesh'});
export const preloadKeshExpressions=()=>preloader.preload();
export const keshExpressionsReady=()=>preloader.ready();

export const normalizeKeshLocale=locale=>locale==='he'?'he':'en';

// Presentation states. `default` is calm and still. When both hands run short he
// is `attentive` (closer, narrower eyes). While the player sits on one card he is
// `watchful` — he studies it; he never panics. On his own last card the road is
// `clear`. Short-lived looks (`reading`, `unsettled`) expire on their own.
export const KESH_STATES=Object.freeze(['default','attentive','watchful','clear','reading','unsettled','result']);
const STATE_EXPRESSIONS=Object.freeze({default:'default_observant',attentive:'close_observation',watchful:'player_one_card',clear:'kesh_one_card',reading:'omen_reading',unsettled:'plans_disrupted',result:null});

// Authored script (Kesh Script.txt), performance directions removed. Hebrew is
// authored localisation and is reproduced exactly; it is never generated.
export const KESH_SCRIPT=Object.freeze(
{"intro_01":{"en": "Every game leaves a trail.", "he": "כל משחק משאיר סימנים."},
  "intro_02":{"en": "Let us see where this road goes.", "he": "נראה לאן הדרך הזאת מובילה."},
  "intro_03":{"en": "The signs are quiet tonight.", "he": "הסימנים שקטים הלילה."},
  "idle_01":{"en": "The night is still young.", "he": "הלילה עוד צעיר."},
  "idle_02":{"en": "The fire knows.", "he": "האש יודעת."},
  "idle_03":{"en": "Hm. Different tonight.", "he": "הממ. משהו שונה הלילה."},
  "idle_04":{"en": "Still here, then.", "he": "עדיין כאן."},
  "player_good_move_01":{"en": "Nicely done.", "he": "מהלך יפה."},
  "player_good_move_02":{"en": "Bold choice.", "he": "בחירה מעניינת."},
  "player_good_move_03":{"en": "Interesting.", "he": "מעניין."},
  "good_move_01":{"en": "The road grows shorter.", "he": "הדרך מתקצרת."},
  "good_move_02":{"en": "So the sign has fallen.", "he": "כך נפל הסימן."},
  "good_move_03":{"en": "As expected.", "he": "כצפוי."},
  "annoyed_01":{"en": "The wind has changed.", "he": "הרוח השתנתה."},
  "annoyed_02":{"en": "I'll remember that.", "he": "את זה אני אזכור."},
  "annoyed_03":{"en": "Really?", "he": "באמת?"},
  "surprised_01":{"en": "The sign did not show this.", "he": "הסימן לא הראה את זה."},
  "surprised_02":{"en": "Hm. That's new.", "he": "הממ. זה חדש."},
  "surprised_03":{"en": "It was clearer earlier.", "he": "קודם זה היה ברור יותר."},
  "player_draw_01":{"en": "The road grows longer.", "he": "הדרך מתארכת."},
  "player_draw_02":{"en": "A longer journey, then.", "he": "דרך ארוכה יותר, אם כך."},
  "draw_01":{"en": "Another turn in the road.", "he": "עוד פנייה בדרך."},
  "draw_02":{"en": "Against the wind.", "he": "נגד הרוח."},
  "draw_03":{"en": "Perhaps later.", "he": "אולי אחר כך."},
  "skip_01":{"en": "The wind has changed.", "he": "הרוח השתנתה."},
  "skip_02":{"en": "So the sign has fallen.", "he": "כך נפל הסימן."},
  "curse_01":{"en": "The fire knows.", "he": "האש יודעת."},
  "curse_02":{"en": "The road grows longer.", "he": "הדרך מתארכת."},
  "reverse_01":{"en": "The river turns back.", "he": "הנהר חוזר לאחור."},
  "reverse_02":{"en": "A curious sign.", "he": "סימן מוזר."},
  "king_01":{"en": "The crown has spoken.", "he": "המלך אמר את דברו."},
  "king_02":{"en": "The signs didn't show this.", "he": "הסימנים לא הראו את זה."},
  "player_one_card_01":{"en": "The end is near.", "he": "הסוף קרוב."},
  "player_one_card_02":{"en": "The signs don't lie.", "he": "הסימנים לא משקרים."},
  "player_one_card_03":{"en": "So this is where the road leads.", "he": "אז לכאן הדרך הובילה."},
  "one_card_01":{"en": "One more step.", "he": "עוד צעד אחד."},
  "one_card_02":{"en": "The road is clear.", "he": "הדרך ברורה."},
  "round_win_01":{"en": "The road grows shorter.", "he": "הדרך מתקצרת."},
  "round_win_02":{"en": "So the sign has fallen.", "he": "כך נפל הסימן."},
  "round_win_03":{"en": "Another road remains.", "he": "עוד דרך לפנינו."},
  "round_loss_01":{"en": "The wind has changed.", "he": "הרוח השתנתה."},
  "round_loss_02":{"en": "Interesting.", "he": "מעניין."},
  "round_loss_03":{"en": "I misread that one.", "he": "את זה קראתי לא נכון."},
  "match_win_01":{"en": "And here the road ends.", "he": "וכאן הדרך נגמרת."},
  "match_win_02":{"en": "The signs were kind tonight.", "he": "הסימנים היו נדיבים הלילה."},
  "match_win_03":{"en": "A good journey.", "he": "דרך טובה."},
  "match_loss_01":{"en": "So this road was yours.", "he": "אז הדרך הזאת לא הייתה שלי."},
  "match_loss_02":{"en": "The signs don't lie.", "he": "הסימנים לא משקרים."},
  "match_loss_03":{"en": "Until the next road.", "he": "עד הדרך הבאה."},
  "omen_01":{"en": "There you are.", "he": "הנה אתה."},
  "omen_02":{"en": "A curious sign.", "he": "סימן מוזר."},
  "omen_03":{"en": "Ah. Of course.", "he": "אה. כמובן."}});

// Several authored lines share words ("The wind has changed." is a skip, a
// setback and a lost hand). Anti-repetition works on the remark as well as the
// recording, so the same words never come back to back from different files.
const remarkOf=id=>KESH_SCRIPT[id].en.toLowerCase().replace(/[^a-z ]/g,'').replace(/\bdid not\b/g,'didnt').replace(/\bsigns?\b/g,'sign').trim();

// `seconds` is the longer of the two recorded takes; it only sizes the bubble
// when a voice file cannot be played.
const line=(id,trigger,expression,priority,seconds,extra={})=>{
  const remark=remarkOf(id),own=extra.weight||null;
  return Object.freeze({
    id,trigger,voice:`kesh_${id}`,caption:KESH_SCRIPT[id].en,captions:Object.freeze({en:KESH_SCRIPT[id].en,he:KESH_SCRIPT[id].he}),expression,priority,remark,
    category:extra.category||trigger,duration:Math.round(seconds*1000)+650,probability:extra.probability??1,cooldown:extra.cooldown??0,nextState:extra.nextState||null,when:extra.when||null,
    // A remark heard in the last few lines is very unlikely to come back yet.
    weight:context=>(own?own(context):1)*(context.recentRemarks?.includes(remark)?.04:1)
  });
};
const result={category:'result',nextState:'result'};

export const KESH_REACTIONS=Object.freeze([
  // One intro at most per match. A first meeting always gets a line; later
  // meetings get a line, only a look, or nothing at all.
  line('intro_01','intro','intro_studying_table','CRITICAL',2.85,{category:'intro'}),
  line('intro_02','intro','intro_rune_touch','CRITICAL',2.77,{category:'intro',weight:({firstEncounter})=>firstEncounter?.7:1.2}),
  line('intro_03','intro','intro_quiet_signs','CRITICAL',2.27,{category:'intro'}),

  // Idles are rare and need real quiet. "Still here, then." is a dry nod to a
  // player who has been sitting on a decision — at most once a match.
  line('idle_01','idle_quiet','drinking','LOW',2.93,{category:'idle',probability:.22}),
  line('idle_02','idle_quiet','watching_fire','LOW',2.35,{category:'idle',probability:.22}),
  line('idle_03','idle_quiet','turning_rune','LOW',3.55,{category:'idle',probability:.18}),
  line('idle_04','slow_player','dry_amusement','LOW',1.72,{category:'idle',probability:.4}),

  // Quiet, genuine approval. Never sarcasm.
  line('player_good_move_01','player_good_move','player_good_move_approval','MEDIUM',1.65,{probability:.13,weight:({big})=>big?1.5:1}),
  line('player_good_move_02','player_good_move','interesting_choice','MEDIUM',1.57,{probability:.13}),
  line('player_good_move_03','player_good_move','close_observation','MEDIUM',1.8,{probability:.13}),

  // His own good play: he reads it, he does not celebrate it.
  line('good_move_01','kesh_good_move','good_move_satisfaction','LOW',2.19,{probability:.09,weight:({keshCount})=>keshCount<=3?1.6:1}),
  line('good_move_02','kesh_good_move','expected_result','LOW',2.12,{probability:.09}),
  line('good_move_03','kesh_good_move','expected_result','LOW',1.49,{probability:.09,weight:({big})=>big?.6:1.2}),

  // Something goes against him: dry, contained.
  line('annoyed_01','setback','plans_disrupted','MEDIUM',2.35,{probability:.24}),
  line('annoyed_02','setback','dry_annoyance','MEDIUM',1.8,{probability:.24}),
  line('annoyed_03','setback','really','MEDIUM',1.15,{probability:.24,weight:({haul})=>haul?2:1}),

  // The signs were wrong. Curiosity and reconsideration, never panic.
  line('surprised_01','omen_failed','genuine_surprise','MEDIUM',2.27,{probability:.5}),
  line('surprised_02','omen_failed','reconsidering_omen','MEDIUM',2.35,{probability:.5}),
  line('surprised_03','omen_failed','rune_was_wrong','MEDIUM',2.69,{probability:.5,weight:({told})=>told?1.6:.6}),

  // The player has to take cards. Only a real haul is worth a word.
  line('player_draw_01','player_draw','player_draw','LOW',2.27,{probability:.24,when:({haul})=>!!haul}),
  line('player_draw_02','player_draw','player_draw','LOW',2.85,{probability:.24,when:({haul})=>!!haul}),

  // His own draws: acceptance, a little disappointment, a card kept for later.
  line('draw_01','kesh_draw','kesh_draw','LOW',3.08,{weight:({forced})=>forced?.8:1.2}),
  line('draw_02','kesh_draw','bad_draw','LOW',1.96,{weight:({forced})=>forced?2:.5}),
  line('draw_03','kesh_draw','save_for_later','LOW',1.72,{weight:({forced})=>forced?.3:1.4}),

  // Card reactions that once lived in the shared "mysterious" quip pool now belong
  // to Kesh alone. Probability + cooldown: the player notices his worldview
  // slowly, one remark at a time.
  line('skip_01','skip','skip_interrupted','MEDIUM',1.88,{probability:.2}),
  line('skip_02','skip','expected_result','MEDIUM',3.0,{probability:.2}),
  line('curse_01','curse','curse_observation','MEDIUM',2.43,{probability:.18}),
  line('curse_02','curse','curse_observation','MEDIUM',2.43,{probability:.18,weight:({amount})=>(amount||2)>=4?1.8:1}),
  line('reverse_01','reverse','reverse_observation','MEDIUM',2.69,{probability:.16}),
  line('reverse_02','reverse','reverse_observation','MEDIUM',1.88,{probability:.16}),
  line('king_01','king','king_observation','MEDIUM',2.12,{probability:.24,weight:({broke})=>broke?.4:1}),
  line('king_02','king','genuine_surprise','MEDIUM',2.43,{probability:.24,when:({own})=>!own,weight:({broke})=>broke?2.6:.5}),

  // Player on one card: he studies the table. Not Bramm's panic, not Ragna's appetite.
  line('player_one_card_01','player_one_card','player_one_card','HIGH',2.43,{probability:.55,nextState:'watchful'}),
  line('player_one_card_02','player_one_card','player_one_card_signs','HIGH',2.12,{probability:.55,nextState:'watchful'}),
  line('player_one_card_03','player_one_card','player_one_card','HIGH',2.59,{probability:.55,nextState:'watchful',weight:({persist})=>persist?1.6:1}),

  // His own last card: the path has become clear. No celebration.
  line('one_card_01','kesh_one_card','kesh_one_card','HIGH',1.96,{probability:.45}),
  line('one_card_02','kesh_one_card','road_clear','HIGH',2.35,{probability:.45}),

  // Results: exactly one line per hand, from the real match state.
  line('round_win_01','round_win','round_win','CRITICAL',2.12,result),
  line('round_win_02','round_win','round_win','CRITICAL',2.93,result),
  line('round_win_03','round_win','expected_result','CRITICAL',2.19,{...result,weight:({lastRound})=>lastRound?.3:1}),
  line('round_loss_01','round_loss','round_loss','CRITICAL',2.43,result),
  line('round_loss_02','round_loss','interesting_choice','CRITICAL',1.88,{...result,weight:({close})=>close?1.5:1}),
  // "I misread that one." is earned: he consulted the stone this hand and lost it anyway.
  line('round_loss_03','round_loss','round_loss_misread','CRITICAL',2.77,{...result,weight:({told})=>told?3:.25}),
  line('match_win_01','match_win','match_win','CRITICAL',3.0,result),
  line('match_win_02','match_win','round_win','CRITICAL',2.51,result),
  line('match_win_03','match_win','match_win','CRITICAL',1.65,{...result,weight:({close})=>close?2:.8}),
  line('match_loss_01','match_loss','match_loss','CRITICAL',3.32,result),
  line('match_loss_02','match_loss','player_good_move_approval','CRITICAL',2.19,{...result,weight:({close})=>close?.6:1.4}),
  line('match_loss_03','match_loss','match_loss_knowing_smile','CRITICAL',2.69,{...result,weight:({close})=>close?1.5:1}),

  // Rune stone. Much rarer than the silent gesture: most tells say nothing.
  line('omen_01','omen','omen_touch','MEDIUM',2.19,{category:'omen',when:({phase})=>phase==='touch'}),
  line('omen_02','omen','omen_reading','MEDIUM',2.12,{category:'omen',when:({phase})=>phase==='reading'}),
  line('omen_03','omen','omen_realization','MEDIUM',2.27,{category:'omen',when:({phase})=>phase==='realization'})
]);

// Recorded takes that were not delivered: no Hebrew take of player_good_move_02.
// In Hebrew that line keeps its bubble but has no voice. Drop in
// kesh_player_good_move_02_he.mp3 and remove this entry to enable it.
const UNRECORDED=Object.freeze({kesh_player_good_move_02:Object.freeze(['he'])});
const debugMissing=new Set();
export function debugMarkKeshVoiceMissing(name,missing=true){if(missing)debugMissing.add(name);else debugMissing.delete(name);return [...debugMissing];}
export const keshDebugMissingVoices=()=>[...debugMissing];
const hasVoice=(voice,locale)=>!(UNRECORDED[voice]||[]).includes(normalizeKeshLocale(locale));
export const keshUnrecorded=()=>Object.entries(UNRECORDED).flatMap(([voice,locales])=>locales.map(locale=>`${voice}${locale==='he'?'_he':''}`));

export const KESH_VOICE_LIBRARY=Object.freeze(Object.fromEntries(KESH_REACTIONS.map(item=>[item.voice,Object.freeze({
  src:voiceAsset(item.voice),
  sources:Object.freeze({en:voiceAsset(item.voice),he:voiceAsset(`${item.voice}_he`)}),
  caption:item.caption,captions:item.captions,priority:item.priority
})])));

export function resolveKeshVoice(name,locale='en'){
  const definition=KESH_VOICE_LIBRARY[name];if(!definition)return null;
  const resolved=normalizeKeshLocale(locale);if(!hasVoice(name,resolved))return null;
  return {name,locale:resolved,src:debugMissing.has(name)?MISSING_VOICE_URL:definition.sources[resolved],caption:definition.captions[resolved],priority:definition.priority};
}
export function resolveKeshReaction(reaction,locale='en'){
  if(!reaction)return null;const resolved=normalizeKeshLocale(locale);
  const caption=reaction.captions?.[resolved]??reaction.caption;
  // A line without text is a content bug, but it must never break the match.
  if(reaction.voice&&!caption&&['localhost','127.0.0.1'].includes(globalThis.location?.hostname))console.error('[Kesh] Missing bubble text',reaction.id,resolved);
  return {...reaction,voice:reaction.voice&&hasVoice(reaction.voice,resolved)?reaction.voice:null,locale:resolved,caption:caption||''};
}

// Expression-only beats. This is how Kesh stays quiet and still feels present:
// he notices almost everything, and says almost nothing. Beats are small and
// held a little longer than Ragna's flashes, then he settles back.
const VISUALS=Object.freeze({
  player_good_move:{p:ctx=>ctx.big?.95:.6,duration:1900,pick:(ctx,r)=>ctx.big?(r()<.6?'player_good_move_approval':'interesting_choice'):(r()<.55?'interesting_choice':'close_observation')},
  kesh_good_move:{p:.4,duration:1700,pick:(ctx,r)=>r()<.5?'good_move_satisfaction':'expected_result'},
  player_draw:{p:ctx=>ctx.haul?.85:.14,duration:1600,pick:()=>'player_draw'},
  kesh_draw:{p:ctx=>ctx.forced?.75:.3,duration:1500,pick:(ctx,r)=>ctx.forced?'bad_draw':(r()<.55?'save_for_later':'kesh_draw')},
  setback:{p:.8,duration:1500,pick:(ctx,r)=>ctx.haul?'really':(r()<.5?'plans_disrupted':'dry_annoyance')},
  omen_failed:{p:1,always:true,duration:2000,pick:(ctx,r)=>ctx.told&&r()<.5?'rune_was_wrong':'reconsidering_omen'},
  skip:{p:.85,duration:1500,pick:()=>'skip_interrupted'},
  curse:{p:.7,duration:1700,pick:()=>'curse_observation'},
  reverse:{p:.6,duration:1500,pick:()=>'reverse_observation'},
  king:{p:.85,duration:1700,pick:ctx=>ctx.broke?'genuine_surprise':'king_observation'},
  player_one_card:{p:1,always:true,duration:2100,pick:()=>'player_one_card'},
  kesh_one_card:{p:1,always:true,duration:1800,pick:(ctx,r)=>r()<.35?'road_clear':'kesh_one_card'},
  close_game:{p:.8,duration:1800,pick:()=>'close_observation'},
  slow_player:{p:.5,duration:1800,pick:(ctx,r)=>r()<.5?'dry_amusement':'close_observation'},
  idle_beat:{p:.5,duration:2600,pick:(ctx,r)=>ctx.concerned?'close_observation':['watching_fire','intro_quiet_signs','drinking','turning_rune'][Math.floor(r()*4)]},
  one_card_settled:{p:.7,always:true,duration:1500,pick:(ctx,r)=>r()<.6?'expected_result':'dry_amusement'}
});
const UNCOUNTED=new Set(['intro','idle_quiet','idle_beat','slow_player','close_game','one_card_settled','omen']);

// ── The rune stone tell ───────────────────────────────────────────────────────
// Before some weighty decisions he glances down and rubs the stone with his
// thumb. It is characterisation, not a warning light: most big plays get no
// tell, and now and then he checks the stone before something ordinary.
// `major` comes from the card he has actually decided to play.
export const KESH_TELL=Object.freeze({major:.38,ordinary:.05,minTurnsBetween:2,maxPerRound:4,lead:620,speak:.3});
export function keshTellFor({major=false,choices=2,turnsSinceTell=99,tellsThisRound=0,random=Math.random}={}){
  if(choices<2||turnsSinceTell<KESH_TELL.minTurnsBetween||tellsThisRound>=KESH_TELL.maxPerRound)return null;
  if(random()>(major?KESH_TELL.major:KESH_TELL.ordinary))return null;
  // After the touch: usually straight back to his calm look; sometimes he keeps
  // reading the stone, sometimes the small "of course".
  const roll=random(),after=roll<.62?null:roll<.84?'omen_reading':'omen_realization';
  return {major,lead:KESH_TELL.lead,touch:'omen_touch',after,speak:random()<KESH_TELL.speak};
}
// Which decisions are weighty enough to consult the stone over.
export function keshDecisionIsMajor({cardType=null,humanCount=7,keshCount=7,nextCount=humanCount,penalty=0}={}){
  if(!cardType)return false;
  if(['plus2','king','changeColor','superTaki'].includes(cardType))return true;
  if(cardType==='stop'&&nextCount<=2)return true;
  if(humanCount===1||nextCount===1)return true;
  if(keshCount<=2)return true;
  return penalty>=4;
}

// Turn one table update into at most one Kesh trigger. Public facts only: what
// was played, who drew and how many, card counts — plus whether he had just
// consulted the stone before his last move (`tellPending`).
export function keshEventFor({played=null,playedCard=null,stop=null,stack=null,penalty=null,draw=null,closed=null,reverse=null,color=null,crossbowRun=0,humanCount,keshCount,oldHuman=humanCount,oldKesh=keshCount,tellPending=false,cursedBefore=false}={}){
  const humanMove=played?.playerId==='p0',keshMove=played?.playerId==='p1',power=['king','plus2','superTaki'].includes(playedCard?.type);
  if(oldHuman>1&&humanCount===1)return ['player_one_card',{}];
  if(oldKesh>1&&keshCount===1)return ['kesh_one_card',{}];
  // The stone said one thing; the table answered another.
  if(tellPending&&(penalty?.playerId==='p1'||stop?.skipped==='p1'||(humanMove&&(playedCard?.type==='king'||playedCard?.type==='changeColor'||color?.playerId==='p0'||stack))))return ['omen_failed',{told:true}];
  if(penalty?.playerId==='p1'&&(penalty.amount||0)>=4)return ['setback',{haul:true,amount:penalty.amount}];
  if(penalty?.playerId==='p1')return ['kesh_draw',{amount:penalty.amount||2,forced:true}];
  if(penalty?.playerId==='p0')return ['curse',{amount:penalty.amount||2,haul:(penalty.amount||0)>=4}];
  if(stop?.skipped==='p1')return ['skip',{}];
  if(draw?.playerId==='p1')return ['kesh_draw',{amount:1,forced:false}];
  if(draw?.playerId==='p0')return ['player_draw',{amount:1,haul:oldHuman===1}];
  if(playedCard?.type==='king')return ['king',{own:keshMove,broke:humanMove&&cursedBefore}];
  if(reverse)return ['reverse',{own:keshMove}];
  if(humanMove&&((stack?.amount||0)>=4||(closed&&crossbowRun>=3)||(stop&&keshCount<=3)))return ['player_good_move',{big:(stack?.amount||0)>=4||crossbowRun>=4}];
  // The colour turned away from him just as he was getting close.
  if(humanMove&&playedCard?.type==='changeColor'&&keshCount<=3)return ['setback',{}];
  if(keshMove&&(stack||power||(closed&&crossbowRun>=2)||(stop&&humanCount<=3)))return ['kesh_good_move',{keshCount,big:power}];
  // The player is still hanging on one card after his turn.
  if(keshMove&&humanCount===1&&oldHuman===1)return ['player_one_card',{persist:true}];
  if(keshMove)return ['kesh_move',{}];
  if(humanMove)return ['player_neutral_move',{}];
  return null;
}

const CASUAL_GAP=13500;
const KESH_SPEC=Object.freeze({
  reactions:KESH_REACTIONS,visuals:VISUALS,uncounted:UNCOUNTED,states:KESH_STATES,
  persistentStates:['default','attentive','watchful','clear','result'],stateExpressions:STATE_EXPRESSIONS,defaultExpression:KESH_DEFAULT_EXPRESSION,
  // The quietest of the four voices: three meaningful actions and ~13 s of active
  // play between casual lines; one ordinary line a round, two in a long one. The
  // one-card moments keep their own small allowance (HIGH), so they still land.
  timing:{visualGap:2600,casualGap:CASUAL_GAP,casualEvents:3,highGap:4500,highBudget:2,idleQuiet:20000},
  roundBudget:c=>c.eventsThisRound>=30?2:1,
  counters:{omens:0,stillHere:0,tells:0,recentRemarks:[]},
  hasVoice,
  probabilityOf(reaction,context){
    if(reaction.trigger==='player_one_card'&&context.persist)return .2;
    if(reaction.trigger==='kesh_draw')return context.forced?.16:.05;
    if(reaction.trigger==='player_good_move'&&context.big)return .28;
    if(['reverse','king'].includes(reaction.trigger)&&context.own)return reaction.probability*.45;
    if(reaction.trigger==='omen')return .6;
    return reaction.probability;
  },
  // First meeting: one line. Later: a line, only a look, or nothing.
  planIntro:(context,random)=>context.firstEncounter?'voice':random()<.5?'voice':random()<.6?'expression':'none',
  introLook:random=>({expression:['intro_studying_table','intro_quiet_signs','intro_rune_touch'][Math.floor(random()*3)],duration:2400}),
  suppress(trigger,context,{quiet}){
    // About to go straight out on his own turn: the result line will speak instead.
    if(trigger==='kesh_one_card'&&context.ownTurn)return true;
    // The player still holds the turn and may go out right now: he only watches.
    if(trigger==='player_one_card'&&context.playerStillToPlay)return true;
    if(trigger==='player_one_card'&&context.persist&&quiet<CASUAL_GAP)return true;
    return false;
  },
  enrich(trigger,context,counters){return {...context,recentRemarks:counters.recentRemarks||[]};},
  eligible(item,context,counters){
    if(item.when&&!item.when(context))return false;
    // One introduction per match, whatever asks for it.
    if(item.category==='intro'&&(counters.intros||0)>=1)return false;
    // The same words never twice running, whichever recording they come from.
    if(item.category!=='result'&&item.category!=='intro'&&(counters.recentRemarks||[])[0]===item.remark)return false;
    if(item.category==='omen'&&counters.omens>=2)return false;
    if(item.trigger==='slow_player'&&counters.stillHere>=1)return false;
    return true;
  },
  idleGate(reaction,context,{counters,sinceQuiet,timing}){
    if(reaction.category!=='idle')return false;
    if(context.playerOnOneCard||counters.idleThisRound>=1)return true;
    // Quiet-stretch lines need real quiet; a long round may earn one.
    if(reaction.trigger==='idle_quiet'&&(sinceQuiet<timing.idleQuiet||counters.eventsThisRound<14))return true;
    return false;
  },
  onRemember(reaction,counters){
    counters.recentRemarks=[reaction.remark,...(counters.recentRemarks||[]).filter(item=>item!==reaction.remark)].slice(0,4);
    if(reaction.category==='omen')counters.omens++;
    if(reaction.trigger==='slow_player')counters.stillHere++;
  },
  onObserve(trigger,context,{setBase}){if(trigger==='player_one_card')setBase('watchful');},
  baseFromTable({humanCount,keshCount}){
    if(humanCount===1)return 'watchful';
    if(keshCount===1)return 'clear';
    if(humanCount<=3&&keshCount<=3)return 'attentive';
    return 'default';
  },
  transientFor(trigger,expression){
    if(trigger==='omen_failed')return 'reading';
    if(trigger==='setback'&&expression==='plans_disrupted')return 'unsettled';
    return null;
  },
  recovery:{from:'watchful',to:'default',visual:'one_card_settled'}
});
export function createKeshController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  return createAuthoredController(KESH_SPEC,{random,now,initial});
}
